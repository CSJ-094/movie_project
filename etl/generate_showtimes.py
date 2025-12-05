"""
영화관 상영 시간표 자동 생성 스크립트
- Elasticsearch에서 is_now_playing: true 영화 조회
- MySQL screen 테이블에서 67개 상영관 ID 조회
- 7일치 상영 시간표 랜덤 생성
- MySQL showtime 테이블에 INSERT
"""

import mysql.connector
from elasticsearch import Elasticsearch
from datetime import datetime, timedelta
import random
from typing import List, Dict

# ==================== 설정 ====================
MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'bts',
    'password': '1234',
    'database': 'atom',
    'charset': 'utf8mb4'
}

ES_HOST = 'http://localhost:9200'
ES_INDEX = 'movies'

# 시간표 생성 설정
START_DATE = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
DAYS = 7  # 7일치 시간표
TIME_SLOTS = [
    '09:00', '10:30', '12:00', '13:30', '15:00',
    '16:30', '18:00', '19:30', '21:00', '22:30'
]

PRICE_MAP = {
    'STANDARD': 12000,
    'IMAX': 15000,
    '4DX': 15000,
    'DOLBY': 15000,
    'SUPER PLEX': 15000,
    'MX': 15000
}

TOTAL_SEATS = 240  # 각 상영관 좌석 수


# ==================== Elasticsearch 연결 ====================
def get_now_playing_movies(limit=10) -> List[Dict]:
    """
    Elasticsearch에서 is_now_playing: true 영화 조회
    """
    try:
        es = Elasticsearch([ES_HOST])
        
        query = {
            "query": {
                "term": {
                    "is_now_playing": True
                }
            },
            "size": limit,
            "_source": ["id", "title", "runtime"]
        }
        
        response = es.search(index=ES_INDEX, body=query)
        hits = response['hits']['hits']
        
        movies = []
        for hit in hits:
            source = hit['_source']
            # id를 문자열로 변환 (movieId 대신 id 사용)
            movie_id = str(source.get('id', ''))
            movies.append({
                'movieId': f"tmdb_{movie_id}" if movie_id else None,
                'title': source.get('title', 'Unknown'),
                'runtime': source.get('runtime', 120)  # 기본값 120분
            })
        
        print(f"✅ Elasticsearch에서 {len(movies)}개 영화 조회 완료")
        for movie in movies:
            print(f"   - {movie['title']} ({movie['runtime']}분)")
        
        return movies
    
    except Exception as e:
        print(f"❌ Elasticsearch 연결 실패: {e}")
        print("⚠️  테스트용 더미 데이터를 사용합니다.")
        return [
            {'movieId': 'tmdb_1154215', 'title': '범죄도시4', 'runtime': 109},
            {'movieId': 'tmdb_519182', 'title': '위키드', 'runtime': 160},
            {'movieId': 'tmdb_558449', 'title': '글래디에이터 2', 'runtime': 148},
            {'movieId': 'tmdb_698687', 'title': '트랜스포머 ONE', 'runtime': 104},
            {'movieId': 'tmdb_1034541', 'title': '테리파이어 3', 'runtime': 125},
            {'movieId': 'tmdb_933260', 'title': '더 서스탠스', 'runtime': 140},
            {'movieId': 'tmdb_1241982', 'title': '모아나 2', 'runtime': 100},
            {'movieId': 'tmdb_889737', 'title': '조커: 폴리 아 되', 'runtime': 138},
            {'movieId': 'tmdb_912649', 'title': '베놈: 라스트 댄스', 'runtime': 109},
            {'movieId': 'tmdb_1184918', 'title': '더 와일드 로봇', 'runtime': 102}
        ]


# ==================== MySQL 연결 ====================
def get_screens_from_db() -> List[Dict]:
    """
    MySQL에서 전체 상영관 정보 조회
    """
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT s.id, s.theater_id, s.name, s.screen_type, t.name as theater_name
        FROM screen s
        JOIN theater t ON s.theater_id = t.id
        ORDER BY s.id
    """
    cursor.execute(query)
    screens = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    print(f"✅ MySQL에서 {len(screens)}개 상영관 조회 완료")
    return screens


# ==================== 시간표 생성 로직 ====================
def generate_showtimes(movies: List[Dict], screens: List[Dict]) -> List[Dict]:
    """
    영화별로 랜덤 상영관에 7일치 시간표 생성
    """
    showtimes = []
    
    for movie in movies:
        # 각 영화마다 3~8개 상영관에 랜덤 배정
        selected_screens = random.sample(screens, k=random.randint(3, 8))
        
        for screen in selected_screens:
            price = PRICE_MAP.get(screen['screen_type'], 12000)
            
            # 7일치 날짜 생성
            for day_offset in range(DAYS):
                date = START_DATE + timedelta(days=day_offset)
                
                # 하루에 2~4개 시간대 랜덤 선택
                selected_times = random.sample(TIME_SLOTS, k=random.randint(2, 4))
                
                for time_str in selected_times:
                    hour, minute = map(int, time_str.split(':'))
                    start_time = date.replace(hour=hour, minute=minute)
                    
                    # 종료 시간 = 시작 시간 + 상영시간 + 30분(청소시간)
                    end_time = start_time + timedelta(minutes=movie['runtime'] + 30)
                    
                    showtimes.append({
                        'movie_id': movie['movieId'],
                        'screen_id': screen['id'],
                        'start_time': start_time,
                        'end_time': end_time,
                        'price': price,
                        'available_seats': TOTAL_SEATS
                    })
    
    print(f"✅ 총 {len(showtimes)}개 시간표 생성 완료")
    return showtimes


# ==================== MySQL INSERT ====================
def insert_showtimes_to_db(showtimes: List[Dict]):
    """
    생성된 시간표를 MySQL showtime 테이블에 INSERT
    """
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    cursor = conn.cursor()
    
    insert_query = """
        INSERT INTO showtime (movie_id, screen_id, start_time, end_time, price, available_seats)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    
    try:
        for showtime in showtimes:
            cursor.execute(insert_query, (
                showtime['movie_id'],
                showtime['screen_id'],
                showtime['start_time'],
                showtime['end_time'],
                showtime['price'],
                showtime['available_seats']
            ))
        
        conn.commit()
        print(f"✅ {len(showtimes)}개 시간표 INSERT 완료!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ INSERT 실패: {e}")
    
    finally:
        cursor.close()
        conn.close()


# ==================== 검증 쿼리 ====================
def verify_data():
    """
    INSERT 후 데이터 검증
    """
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    print("\n" + "="*60)
    print("📊 데이터 검증")
    print("="*60)
    
    # 1. 총 시간표 개수
    cursor.execute("SELECT COUNT(*) as total FROM showtime")
    result = cursor.fetchone()
    print(f"✅ 총 시간표 개수: {result['total']}")
    
    # 2. 영화별 시간표 분포
    cursor.execute("""
        SELECT movie_id, COUNT(*) as count 
        FROM showtime 
        GROUP BY movie_id 
        ORDER BY count DESC
    """)
    print("\n📽️ 영화별 시간표 분포:")
    for row in cursor.fetchall():
        print(f"   {row['movie_id']}: {row['count']}개")
    
    # 3. 날짜별 시간표 개수
    cursor.execute("""
        SELECT DATE(start_time) as date, COUNT(*) as count 
        FROM showtime 
        GROUP BY DATE(start_time)
        ORDER BY date
    """)
    print("\n📅 날짜별 시간표 개수:")
    for row in cursor.fetchall():
        print(f"   {row['date']}: {row['count']}개")
    
    # 4. 상영관별 시간표 개수
    cursor.execute("""
        SELECT s.id, t.name as theater_name, s.name as screen_name, COUNT(st.id) as count
        FROM screen s
        LEFT JOIN theater t ON s.theater_id = t.id
        LEFT JOIN showtime st ON s.id = st.screen_id
        GROUP BY s.id
        ORDER BY count DESC
        LIMIT 10
    """)
    print("\n🎬 시간표가 가장 많은 상영관 TOP 10:")
    for row in cursor.fetchall():
        print(f"   {row['theater_name']} {row['screen_name']}: {row['count']}개")
    
    cursor.close()
    conn.close()
    print("="*60 + "\n")


# ==================== 메인 실행 ====================
def main():
    print("\n" + "="*60)
    print("🎬 영화관 상영 시간표 자동 생성 스크립트")
    print("="*60)
    print(f"📅 생성 기간: {START_DATE.date()} ~ {(START_DATE + timedelta(days=DAYS-1)).date()}")
    print(f"🎯 목표: {DAYS}일치 시간표 생성\n")
    
    # Step 1: Elasticsearch에서 영화 조회
    movies = get_now_playing_movies(limit=10)
    
    if not movies:
        print("❌ 조회된 영화가 없습니다. 스크립트를 종료합니다.")
        return
    
    # Step 2: MySQL에서 상영관 조회
    screens = get_screens_from_db()
    
    if not screens:
        print("❌ 조회된 상영관이 없습니다. 스크립트를 종료합니다.")
        return
    
    # Step 3: 시간표 생성
    showtimes = generate_showtimes(movies, screens)
    
    # Step 4: MySQL에 INSERT
    insert_showtimes_to_db(showtimes)
    
    # Step 5: 검증
    verify_data()
    
    print("✅ 모든 작업 완료!")


if __name__ == "__main__":
    main()
