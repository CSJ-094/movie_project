import mysql.connector
import random
from datetime import datetime, timedelta

MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'bts',  # DB 사용자명에 맞게 수정
    'password': '1234',  # DB 비밀번호에 맞게 수정
    'database': 'atom',
    'charset': 'utf8mb4'
}

# 시간대 슬롯 정의 (조조/일반/심야)
TIME_SLOTS = [
    {'type': '조조', 'start': '08:00'},
    {'type': '조조', 'start': '09:00'},
    {'type': '일반', 'start': '11:00'},
    {'type': '일반', 'start': '13:30'},
    {'type': '일반', 'start': '16:00'},
    {'type': '일반', 'start': '18:30'},
    {'type': '일반', 'start': '20:30'},
    {'type': '일반', 'start': '22:30'},
    {'type': '심야', 'start': '23:30'},
]

# 가격 정책
PRICE_POLICY = {
    '조조': {'weekday': 10000, 'weekend': 11000},
    '일반': {'weekday': 14000, 'weekend': 15000},
    '심야': {'weekday': 10000, 'weekend': 11000},
}

# 날짜 설정 (오늘부터 30일간)
START_DATE = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
DAYS = 30

# 전체 좌석 목록 미리 생성 (A1 ~ P15)
ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']
ALL_SEATS = [f"{r}{n}" for r in ROWS for n in range(1, 16)]

# 2. 상영관 목록 조회
def get_screens():
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT s.id, s.total_seats, t.region, t.city 
        FROM screen s
        JOIN theater t ON s.theater_id = t.id
        ORDER BY s.id
    """)
    screens = cursor.fetchall()
    cursor.close()
    conn.close()
    return screens

# 3. 날짜 리스트 생성
def get_date_list():
    return [START_DATE + timedelta(days=i) for i in range(DAYS)]

# 3. 시간표(슬롯) 생성 및 삽입 (movie_id를 6개 고정 id 중 랜덤 할당)
MOVIE_IDS = ['tmdb_1379266', 'tmdb_1084242', 'tmdb_1228246', 'tmdb_1242898', 'tmdb_1555417', 'tmdb_701387']

def insert_showtime_slots():
    screens = get_screens()
    dates = get_date_list()
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    cursor = conn.cursor()

    # 기존 데이터 초기화 (중복 및 구버전 데이터 방지)
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
    cursor.execute("TRUNCATE TABLE booking")
    cursor.execute("TRUNCATE TABLE showtime")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    conn.commit()
    print("🗑️ 기존 showtime 데이터 삭제 완료")

    total = 0
    for screen in screens:
        for date in dates:
            # 각 상영관/날짜별로 4~6개 시간대 랜덤 선택
            n = random.randint(4, 6)
            slots = random.sample(TIME_SLOTS, k=n)
            
            for slot in slots:
                hour, minute = map(int, slot['start'].split(':'))
                start_time = date.replace(hour=hour, minute=minute)
                end_time = start_time + timedelta(minutes=120)  # 2시간 고정

                # 요일 판별 (금~일 및 공휴일은 주말 요금)
                weekday = start_time.weekday()
                date_str = start_time.strftime('%Y-%m-%d')
                is_weekend = weekday >= 4 or date_str in ['2025-12-25', '2026-01-01']
                price = PRICE_POLICY[slot['type']]['weekend' if is_weekend else 'weekday']
                movie_id = random.choice(MOVIE_IDS)

                # [수정] 타임존 보정: KST -> UTC (-9시간)
                # 웹페이지에서 +9시간 되어 보이므로, 저장할 때 -9시간을 해서 저장해야 의도한 시간이 나옵니다.
                start_time_db = start_time - timedelta(hours=9)
                end_time_db = end_time - timedelta(hours=9)

                # [추가] 랜덤 좌석 예매 (현실감 부여)
                booked_seats = []
                # 80% 확률로 10~60석 정도 예매된 상태로 생성 (예약률 대폭 증가)
                if random.random() < 0.8:
                    num_booked = random.randint(10, 60)
                    booked_seats = random.sample(ALL_SEATS, num_booked)
                
                current_available_seats = screen['total_seats'] - len(booked_seats)

                cursor.execute(
                    """
                    INSERT INTO showtime (movie_id, screen_id, start_time, end_time, price, available_seats, region, city)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (movie_id, screen['id'], start_time_db, end_time_db, price, current_available_seats, screen['region'], screen['city'])
                )
                showtime_id = cursor.lastrowid

                # booking 테이블에 예매 내역 삽입 (user_id=1 가정)
                if booked_seats:
                    # 대량 데이터 일괄 삽입 (속도 개선)
                    booking_values = [(1, showtime_id, seat, 1, price) for seat in booked_seats]
                    try:
                        cursor.executemany(
                            "INSERT INTO booking (user_id, showtime_id, seats, seat_count, total_price, booking_status, created_at) VALUES (%s, %s, %s, %s, %s, 'CONFIRMED', NOW())",
                            booking_values
                        )
                    except Exception as e:
                        print(f"⚠️ 예매 데이터 삽입 실패: {e}")
                total += 1
                if total % 100 == 0:
                    print(f"🚀 {total}개 시간표 생성 중...")
    conn.commit()
    cursor.close()
    conn.close()
    print(f"✅ {total}개 시간표(슬롯) 데이터 삽입 완료! (movie_id 랜덤 할당)")

if __name__ == "__main__":
    insert_showtime_slots()
