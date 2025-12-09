import requests
import json
import time

# Kakao Local API로 주소를 좌표로 변환
def get_coordinates(address, kakao_api_key):
    """주소를 위도/경도 좌표로 변환"""
    url = "https://dapi.kakao.com/v2/local/search/address.json"
    headers = {"Authorization": f"KakaoAK {kakao_api_key}"}
    params = {"query": address}
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            result = response.json()
            if result['documents']:
                x = result['documents'][0]['x']  # 경도
                y = result['documents'][0]['y']  # 위도
                return float(y), float(x)
    except Exception as e:
        print(f"좌표 변환 실패: {address} - {e}")
    
    return None, None

# 영화진흥위원회 API에서 영화관 정보 가져오기
def fetch_theaters_from_kobis(api_key=None):
    """영화진흥위원회 API에서 영화관 데이터 가져오기"""
    theaters = []
    
    # API 키가 없어도 사용 가능한 샘플 데이터
    # 실제로는 https://www.kobis.or.kr/kobisopenapi/homepickup/apiservice.do 에서 키 발급
    if api_key:
        url = "http://www.kobis.or.kr/kobisopenapi/webservice/rest/theater/searchTheaterList.json"
        params = {"key": api_key}
        
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                # API 응답 구조에 맞게 파싱
                # 실제 구조는 API 문서 참고 필요
                return data.get('theaterList', [])
        except Exception as e:
            print(f"API 호출 실패: {e}")
    
    # API 키가 없는 경우, 주요 영화관 데이터를 직접 입력
    print("API 키가 없어 샘플 데이터를 사용합니다.")
    print("Kakao API로 좌표를 가져옵니다...")
    
    # 서울 주요 영화관 데이터 (체인별 주요 지점)
    sample_theaters = [
        # CGV
        {"name": "CGV 용산아이파크몰", "chain": "CGV", "region": "서울", "city": "용산구", 
         "address": "서울특별시 용산구 한강대로23길 55"},
        {"name": "CGV 강변", "chain": "CGV", "region": "서울", "city": "광진구",
         "address": "서울특별시 광진구 구의강변로 62"},
        {"name": "CGV 왕십리", "chain": "CGV", "region": "서울", "city": "성동구",
         "address": "서울특별시 성동구 왕십리광장로 17"},
        {"name": "CGV 압구정", "chain": "CGV", "region": "서울", "city": "강남구",
         "address": "서울특별시 강남구 압구정로 106"},
        {"name": "CGV 여의도", "chain": "CGV", "region": "서울", "city": "영등포구",
         "address": "서울특별시 영등포구 여의대로 108"},
        
        # 롯데시네마
        {"name": "롯데시네마 월드타워", "chain": "롯데시네마", "region": "서울", "city": "송파구",
         "address": "서울특별시 송파구 올림픽로 300"},
        {"name": "롯데시네마 건대입구", "chain": "롯데시네마", "region": "서울", "city": "광진구",
         "address": "서울특별시 광진구 능동로 92"},
        {"name": "롯데시네마 홍대입구", "chain": "롯데시네마", "region": "서울", "city": "마포구",
         "address": "서울특별시 마포구 양화로 156"},
        {"name": "롯데시네마 합정", "chain": "롯데시네마", "region": "서울", "city": "마포구",
         "address": "서울특별시 마포구 양화로 45"},
        {"name": "롯데시네마 영등포", "chain": "롯데시네마", "region": "서울", "city": "영등포구",
         "address": "서울특별시 영등포구 영중로 15"},
        
        # 메가박스
        {"name": "메가박스 코엑스", "chain": "메가박스", "region": "서울", "city": "강남구",
         "address": "서울특별시 강남구 영동대로 513"},
        {"name": "메가박스 강남", "chain": "메가박스", "region": "서울", "city": "강남구",
         "address": "서울특별시 강남구 강남대로 422"},
        {"name": "메가박스 동대문", "chain": "메가박스", "region": "서울", "city": "중구",
         "address": "서울특별시 중구 장충단로 247"},
        {"name": "메가박스 신촌", "chain": "메가박스", "region": "서울", "city": "서대문구",
         "address": "서울특별시 서대문구 신촌로 129"},
        {"name": "메가박스 상봉", "chain": "메가박스", "region": "서울", "city": "중랑구",
         "address": "서울특별시 중랑구 상봉로 131"},
    ]
    
    return sample_theaters

def generate_sql(theaters, kakao_api_key):
    """영화관 데이터를 SQL INSERT 문으로 변환"""
    sql_statements = []
    sql_statements.append("-- 영화관 데이터 INSERT 문")
    sql_statements.append("-- 생성일: " + time.strftime("%Y-%m-%d %H:%M:%S"))
    sql_statements.append("")
    
    for theater in theaters:
        name = theater['name']
        chain = theater['chain']
        region = theater['region']
        city = theater['city']
        address = theater['address']
        
        # Kakao API로 좌표 가져오기
        print(f"좌표 변환 중: {name} - {address}")
        latitude, longitude = get_coordinates(address, kakao_api_key)
        
        if latitude and longitude:
            sql = f"INSERT INTO theater (name, chain, region, city, address, latitude, longitude) VALUES ('{name}', '{chain}', '{region}', '{city}', '{address}', {latitude}, {longitude});"
            sql_statements.append(sql)
            print(f"✓ {name}: ({latitude}, {longitude})")
        else:
            # 좌표를 못 가져온 경우 NULL로 처리
            sql = f"INSERT INTO theater (name, chain, region, city, address, latitude, longitude) VALUES ('{name}', '{chain}', '{region}', '{city}', '{address}', NULL, NULL);"
            sql_statements.append(sql)
            print(f"✗ {name}: 좌표 변환 실패")
        
        time.sleep(0.1)  # API 호출 제한 방지
    
    return "\n".join(sql_statements)

if __name__ == "__main__":
    print("=" * 60)
    print("영화관 데이터 수집 스크립트")
    print("=" * 60)
    print()
    
    # API 키 입력 (없으면 엔터)
    kobis_api_key = input("영화진흥위원회 API 키 (없으면 엔터): ").strip() or None
    kakao_api_key = input("Kakao REST API 키 (좌표 변환용, 필수): ").strip()
    
    if not kakao_api_key:
        print("❌ Kakao API 키는 필수입니다.")
        print("https://developers.kakao.com/ 에서 발급받으세요.")
        exit(1)
    
    print("\n영화관 데이터 가져오는 중...")
    theaters = fetch_theaters_from_kobis(kobis_api_key)
    
    print(f"\n총 {len(theaters)}개 영화관 발견")
    print("\nSQL 파일 생성 중...")
    
    sql_content = generate_sql(theaters, kakao_api_key)
    
    # SQL 파일 저장
    output_file = "theaters_insert.sql"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(sql_content)
    
    print(f"\n✅ SQL 파일 생성 완료: {output_file}")
    print(f"   총 {len(theaters)}개 영화관 데이터")
    print("\nMySQL에서 다음 명령으로 실행하세요:")
    print(f"   source {output_file};")
