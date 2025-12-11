import pandas as pd
import pymysql
from datetime import datetime

# DB 연결 정보
DB_HOST = 'localhost'
DB_PORT = 3306
DB_USER = 'bts'
DB_PASSWORD = '1234'
DB_NAME = 'atom'

CSV_PATH = 'theaters_major.csv'  # etl 폴더 기준

# 1. DB 연결
conn = pymysql.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    db=DB_NAME,
    charset='utf8mb4'
)
cursor = conn.cursor()

# 2. 기존 데이터 삭제
cursor.execute('DELETE FROM theater')
conn.commit()
print('기존 데이터 삭제 완료')

# 3. CSV 데이터 읽기
cols = ['name', 'chain', 'region', 'city', 'address', 'latitude', 'longitude']

df = pd.read_csv(CSV_PATH, encoding='utf-8')
# NaN 값을 None으로 변환
df = df.where(pd.notnull(df), None)

# 전체 행 개수 출력
print(f"CSV 전체 행 개수: {len(df)}")
# name+address 기준 중복 개수 출력
dup_count = df.duplicated(subset=['name', 'address']).sum()
print(f"name+address 기준 중복 행 개수: {dup_count}")

# 4. 데이터 삽입
insert_sql = '''
INSERT INTO theater (name, chain, region, city, address, latitude, longitude, created_at, updated_at)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
'''
now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
for _, row in df.iterrows():
    city = row['city']
    if city is None or (isinstance(city, float) and pd.isna(city)) or str(city).strip() == '':
        city = '기타'
    values = [
        row['name'],
        row['chain'],
        row['region'],
        city,
        row['address'],
        None if pd.isna(row['latitude']) else row['latitude'],
        None if pd.isna(row['longitude']) else row['longitude'],
        now,
        now
    ]
    cursor.execute(insert_sql, values)
conn.commit()
print('CSV 데이터 삽입 완료')

# 5. 연결 종료
cursor.close()
conn.close()
print('작업 완료')
