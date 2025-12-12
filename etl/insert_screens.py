import mysql.connector
import random

MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'bts',  # DB 사용자명에 맞게 수정
    'password': '1234',  # DB 비밀번호에 맞게 수정
    'database': 'atom',
    'charset': 'utf8mb4'
}

# 1. 극장 목록 조회
def get_theaters():
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name FROM theater ORDER BY id")
    theaters = cursor.fetchall()
    cursor.close()
    conn.close()
    return theaters

# 2. 상영관 데이터 생성 및 삽입
def insert_screens():
    theaters = get_theaters()
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    cursor = conn.cursor()
    total = 0
    for theater in theaters:
        n = random.randint(1, 3)  # 각 극장마다 1~3개 상영관
        for i in range(1, n+1):
            name = f"{i}관"
            total_seats = random.choice([120, 150, 180, 210, 240])
            screen_type = 'STANDARD'
            cursor.execute(
                """
                INSERT INTO screen (theater_id, name, total_seats, screen_type)
                VALUES (%s, %s, %s, %s)
                """,
                (theater['id'], name, total_seats, screen_type)
            )
            total += 1
    conn.commit()
    cursor.close()
    conn.close()
    print(f"✅ {total}개 상영관 데이터 삽입 완료!")

if __name__ == "__main__":
    insert_screens()
