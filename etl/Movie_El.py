import requests
from elasticsearch import Elasticsearch

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
INDEX_NAME = "movies"

es = Elasticsearch(ES_URL)

try:
    info = es.info()
    print(f"연결 성공. 버전: {info['version']['number']}")
except Exception as e:
    print(f"연결 실패: {e}")
    exit()

def get_movies_from_tmdb(endpoint, pages=1):
    """TMDB API에서 영화 목록을 가져오는 함수"""
    movies = {}
    for page in range(1, pages + 1):
        url = f"https://api.themoviedb.org/3/movie/{endpoint}?api_key={API_KEY}&language=ko-KR&region=KR&page={page}"
        response = requests.get(url)
        if response.status_code == 200:
            for movie_data in response.json().get('results', []):
                movies[movie_data['id']] = movie_data
        else:
            print(f"Error fetching from {endpoint} on page {page}")
    return movies

def fetch_and_index_movies(popular_pages=50, now_playing_pages=5):
    # 1. '현재 상영작'과 '인기작' 목록을 모두 가져옴
    print("Fetching now playing movies...")
    now_playing_movies = get_movies_from_tmdb('now_playing', pages=now_playing_pages)
    print(f"Found {len(now_playing_movies)} now playing movies.")

    print("Fetching popular movies...")
    popular_movies = get_movies_from_tmdb('popular', pages=popular_pages)
    print(f"Found {len(popular_movies)} popular movies.")

    # 2. 두 목록을 합치되, 중복을 제거 (id 기준)
    all_movies = {**popular_movies, **now_playing_movies}
    now_playing_ids = set(now_playing_movies.keys())
    print(f"Total unique movies to index: {len(all_movies)}")

    # 3. Elasticsearch에 데이터 적재
    count = 0
    for movie_id, movie in all_movies.items():
        r_date = movie.get('release_date')
        if not r_date:
            r_date = None

        # '현재 상영작' 여부 최종 결정
        is_playing = movie_id in now_playing_ids

        doc = {
            "id": movie['id'],
            "title": movie['title'],
            "overview": movie['overview'],
            "poster_path": movie.get('poster_path'),
            "vote_average": movie.get('vote_average'),
            "release_date": r_date,
            "genre_ids": movie.get('genre_ids'),
            "is_now_playing": is_playing
        }
        es.index(index=INDEX_NAME, id=movie_id, document=doc)
        count += 1
        if count % 100 == 0:
            print(f"Indexed {count}/{len(all_movies)} movies...")

    print(f"Finished indexing {count} movies.")

if __name__ == "__main__":
    # 1. 기존 인덱스 삭제
    if es.indices.exists(index=INDEX_NAME):
        es.indices.delete(index=INDEX_NAME)
        print(f"기존 인덱스 '{INDEX_NAME}' 삭제 완료")

    # 2. 새 인덱스 생성 (매핑 적용)
    es.indices.create(index=INDEX_NAME, body=INDEX_SETTINGS)
    print(f"매핑이 적용된 인덱스 '{INDEX_NAME}' 생성 완료")

    # 3. 데이터 적재 시작
    fetch_and_index_movies(popular_pages=50, now_playing_pages=5)
