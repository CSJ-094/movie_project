import requests
from elasticsearch import Elasticsearch
#
INDEX_SETTINGS = {
    "settings": {
        "index": {
            "max_ngram_diff": 10
        },
        "analysis": {
            "analyzer": {
                "nori_analyzer": {
                    "type": "custom",
                    "tokenizer": "nori_tokenizer",
                    "filter": [ "nori_part_of_speech" ]
                },
                "ngram_analyzer": {
                    "type": "custom",
                    "tokenizer": "ngram_tokenizer"
                }
            },
            "tokenizer": {
                "ngram_tokenizer": {
                    "type": "ngram",
                    "min_gram": 1,
                    "max_gram": 10,
                    "token_chars": [ "letter", "digit" ]
                }
            },
            "filter": {
                "nori_part_of_speech": {
                    "type": "nori_part_of_speech",
                    "stoptags": [ "E", "J"]
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "id": { "type": "keyword" },
            "title": {
                "type": "text",
                "analyzer": "nori_analyzer",
                "fields": {
                    "ngram": { "type": "text", "analyzer": "ngram_analyzer" },
                    "keyword": { "type": "keyword" }
                }
            },
            "overview": { "type": "text", "analyzer": "nori_analyzer" },
            "poster_path": { "type": "keyword", "index": False },
            "vote_average": { "type": "float" },
            "release_date": { "type": "date" },
            "genre_ids": { "type": "keyword" },
            "is_now_playing": { "type": "boolean" }
        }
    }
}

API_KEY = "3d3fea3abfd1ffa8c4b49dc551ddc494"
ES_URL = "http://localhost:9200"
INDEX_NAME = "movies" #ElasticSearch의 인덱스 이름은 무조건 소문자 사용. Movies 했다가 오류폭발

es = Elasticsearch(ES_URL)

try:
    info = es.info()
    print(f"연결 성공. 버전: {info['version']['number']}")
except Exception as e:
    print(f"연결 실패: {e}")
    exit()

#기존 인덱스 삭제
if es.indices.exists(index = INDEX_NAME):
    es.indices.delete(index = INDEX_NAME)
    print(f"기존 인덱스 삭제")

#인덱스 생성
es.indices.create(index = INDEX_NAME)
print("Index {} created".format(INDEX_NAME))

def get_now_playing_ids():
    now_playing_ids = set() # 빠른 검색을 위해 set 사용
    url = f"https://api.themoviedb.org/3/movie/now_playing?api_key={API_KEY}&language=ko-KR&region=KR"
    response = requests.get(url)
    if response.status_code == 200:
        results = response.json().get('results', [])
        for movie in results:
            now_playing_ids.add(movie['id'])
    print(f"현재 상영중인 영화 {len(now_playing_ids)}개")
    return now_playing_ids

def fetch_movies(pages=5):
    now_playing_set = get_now_playing_ids()
    for page in range(1, pages +1):
        url = f"https://api.themoviedb.org/3/movie/popular?api_key={API_KEY}&language=ko-KR&page={page}"
        response = requests.get(url)

        #연결 성공시
        if response.status_code == 200:
            movies = response.json().get('results', [])

            for movie in movies:
                r_date = movie['release_date']
                if r_date == "":
                    r_date = None

                is_playing = movie['id'] in now_playing_set
                doc = {
                    "id": movie['id'], #영화 코드
                    "title": movie['title'], #제목
                    "overview": movie['overview'], # 줄거리
                    "poster_path": movie['poster_path'], # 포스터 이미지 경로
                    "vote_average": movie['vote_average'], # 평점
                    "release_date": r_date,# 개봉일
                    "genre_ids": movie['genre_ids'],
                    "is_now_playing": is_playing
                }

                es.index(index = INDEX_NAME, id=movie['id'], document=doc)
                print(f"Saved: {movie['title']}")

        else:
            print(f"Error: {page}")

if __name__ == "__main__":
    if es.indices.exists(index=INDEX_NAME):
        es.indices.delete(index=INDEX_NAME)

    es.indices.create(index=INDEX_NAME, body=INDEX_SETTINGS)
    print(f"매핑이 적용된 인덱스 '{INDEX_NAME}' 생성 완료")

    # 3. 데이터 적재 시작
    fetch_movies(pages=50)


