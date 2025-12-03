import requests
from elasticsearch import Elasticsearch, helpers
from concurrent.futures import ThreadPoolExecutor, as_completed # ThreadPoolExecutor 임포트

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
            "is_now_playing": { "type": "boolean" },
            "ott_providers": { "type": "keyword" },
            "director": { "type": "keyword" },
            "cast": {
                "type": "text",
                "fields": {
                    "keyword": { "type": "keyword" }
                }
            }
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

def get_ott_providers(movie_id):
    """TMDB API에서 특정 영화의 한국 OTT 제공사 목록을 가져오는 함수"""
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/watch/providers?api_key={API_KEY}"
    response = requests.get(url)
    providers = []
    if response.status_code == 200:
        results = response.json().get('results', {})
        if 'KR' in results and 'flatrate' in results['KR']:
            providers = [p['provider_name'] for p in results['KR']['flatrate']]
    return list(set(providers))

def get_movie_credits(movie_id):
    """TMDB API에서 특정 영화의 감독과 주요 배우 정보를 가져오는 함수"""
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/credits?api_key={API_KEY}&language=ko-KR"
    response = requests.get(url)
    director = []
    cast = []
    if response.status_code == 200:
        credits_data = response.json()
        for crew_member in credits_data.get('crew', []):
            if crew_member.get('job') == 'Director':
                director.append(crew_member.get('name'))
        for cast_member in credits_data.get('cast', [])[:20]:
            cast.append(cast_member.get('name'))
    return director, cast

# 각 영화의 추가 정보를 병렬로 가져오는 헬퍼 함수
def fetch_movie_additional_data(movie_id):
    ott_list = get_ott_providers(movie_id)
    directors, cast_members = get_movie_credits(movie_id)
    return movie_id, ott_list, directors, cast_members

def fetch_and_index_movies(popular_pages=50, now_playing_pages=5):
    print("Fetching now playing movies...")
    now_playing_movies = get_movies_from_tmdb('now_playing', pages=now_playing_pages)
    print(f"Found {len(now_playing_movies)} now playing movies.")

    print("Fetching popular movies...")
    popular_movies = get_movies_from_tmdb('popular', pages=popular_pages)
    print(f"Found {len(popular_movies)} popular movies.")

    all_movies = {**popular_movies, **now_playing_movies}
    now_playing_ids = set(now_playing_movies.keys())
    print(f"Total unique movies to index: {len(all_movies)}")

    actions = []
    
    print(f"Starting parallel fetching of additional data for {len(all_movies)} movies...")
    # ThreadPoolExecutor를 사용하여 TMDB API 호출 병렬 처리
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_movie_id = {executor.submit(fetch_movie_additional_data, movie_id): movie_id for movie_id in all_movies.keys()}
        
        processed_count = 0
        for future in as_completed(future_to_movie_id):
            movie_id = future_to_movie_id[future]
            try:
                _, ott_list, directors, cast_members = future.result()
                movie = all_movies[movie_id]

                r_date = movie.get('release_date')
                if not r_date:
                    r_date = None

                is_playing = movie_id in now_playing_ids

                doc = {
                    "id": movie['id'],
                    "title": movie['title'],
                    "overview": movie['overview'],
                    "poster_path": movie.get('poster_path'),
                    "vote_average": movie.get('vote_average'),
                    "release_date": r_date,
                    "genre_ids": movie.get('genre_ids'),
                    "is_now_playing": is_playing,
                    "ott_providers": ott_list,
                    "director": directors,
                    "cast": cast_members
                }
                
                actions.append({
                    "_index": INDEX_NAME,
                    "_id": movie_id,
                    "_source": doc
                })
                processed_count += 1
                if processed_count % 50 == 0: # 50개마다 진행 상황 출력
                    print(f"Processed {processed_count}/{len(all_movies)} movies for indexing...")

            except Exception as exc:
                print(f"Movie {movie_id} generated an exception: {exc}")

    print(f"Finished processing {processed_count} movies for indexing.")

    if actions:
        print(f"Starting bulk indexing of {len(actions)} movies...")
        success, failed = helpers.bulk(es, actions)
        print(f"Finished bulk indexing: {success} movies indexed, {len(failed)} failed.")
    else:
        print("No movies to index.")

if __name__ == "__main__":
    if es.indices.exists(index=INDEX_NAME):
        es.indices.delete(index=INDEX_NAME)
        print(f"기존 인덱스 '{INDEX_NAME}' 삭제 완료")

    es.indices.create(index=INDEX_NAME, body=INDEX_SETTINGS)
    print(f"매핑이 적용된 인덱스 '{INDEX_NAME}' 생성 완료")

    fetch_and_index_movies(popular_pages=50, now_playing_pages=5)
