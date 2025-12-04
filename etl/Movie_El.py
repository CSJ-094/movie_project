import requests
from elasticsearch import Elasticsearch, helpers
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import configparser
import logging
import os

# --- 설정 로드 ---
config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), 'config.ini')
config.read(config_path)

# TMDB 설정
API_KEY = config['TMDB']['API_KEY']
TMDB_BASE_URL = config['TMDB']['BASE_URL']

# Elasticsearch 설정
ES_URL = config['ELASTICSEARCH']['ES_URL']
INDEX_NAME = config['ELASTICSEARCH']['INDEX_NAME']

# ETL 설정
POPULAR_PAGES = int(config['ETL_SETTINGS']['POPULAR_PAGES'])
NOW_PLAYING_PAGES = int(config['ETL_SETTINGS']['NOW_PLAYING_PAGES'])
MAX_WORKERS = int(config['ETL_SETTINGS']['MAX_WORKERS'])
BULK_CHUNK_SIZE = int(config['ETL_SETTINGS']['BULK_CHUNK_SIZE'])
API_REQUEST_DELAY_SECONDS = float(config['ETL_SETTINGS']['API_REQUEST_DELAY_SECONDS'])

# 로깅 설정
LOG_LEVEL = config['LOGGING']['LEVEL']
LOG_FILE = config['LOGGING']['FILE']

# 로거 설정
logging.basicConfig(level=LOG_LEVEL,
                    format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[
                        logging.FileHandler(LOG_FILE),
                        logging.StreamHandler()
                    ])
logger = logging.getLogger(__name__)


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

es = Elasticsearch(ES_URL)

try:
    info = es.info()
    logger.info(f"Elasticsearch 연결 성공. 버전: {info['version']['number']}")
except Exception as e:
    logger.error(f"Elasticsearch 연결 실패: {e}")
    exit()

def create_requests_session():
    """재시도 로직이 포함된 requests 세션을 생성합니다."""
    session = requests.Session()
    retries = Retry(total=5, backoff_factor=0.1, status_forcelist=[500, 502, 503, 504])
    session.mount('http://', HTTPAdapter(max_retries=retries))
    session.mount('https://', HTTPAdapter(max_retries=retries))
    return session

def get_movies_from_tmdb_page(endpoint, page, session):
    """TMDB API에서 특정 페이지의 영화 목록을 가져오는 함수"""
    url = f"{TMDB_BASE_URL}{endpoint}?api_key={API_KEY}&language=ko-KR&region=KR&page={page}"
    
    # API 요청 간 지연 시간 추가
    time.sleep(API_REQUEST_DELAY_SECONDS)

    try:
        response = session.get(url, timeout=10) # 타임아웃 추가
        response.raise_for_status() # HTTP 오류 발생 시 예외 발생
        return {movie_data['id']: movie_data for movie_data in response.json().get('results', [])}
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching from {endpoint} on page {page}: {e}")
        return {}

def get_movies_from_tmdb_parallel(endpoint, pages=1):
    """TMDB API에서 영화 목록을 병렬로 가져오는 함수"""
    all_movies_data = {}
    session = create_requests_session()
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(get_movies_from_tmdb_page, endpoint, page, session) for page in range(1, pages + 1)]
        
        for future in tqdm(as_completed(futures), total=len(futures), desc=f"Fetching {endpoint} movies"):
            page_movies = future.result()
            all_movies_data.update(page_movies)
    return all_movies_data

def generate_actions(all_movies, now_playing_ids):
    """Elasticsearch 벌크 색인을 위한 액션 제너레이터"""
    for movie_id, movie in all_movies.items():
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
            "is_now_playing": is_playing
        }
        yield {
            "_index": INDEX_NAME,
            "_id": movie_id,
            "_source": doc
        }

def fetch_and_index_movies_process():
    # 1. '현재 상영작'과 '인기작' 목록을 모두 가져옴 (병렬 처리)
    logger.info("\n--- Extracting Movie Data ---")
    now_playing_movies = get_movies_from_tmdb_parallel('now_playing', pages=NOW_PLAYING_PAGES)
    logger.info(f"Found {len(now_playing_movies)} now playing movies.")

    popular_movies = get_movies_from_tmdb_parallel('popular', pages=POPULAR_PAGES)
    logger.info(f"Found {len(popular_movies)} popular movies.")

    # 2. 두 목록을 합치되, 중복을 제거 (id 기준)
    all_movies = {**popular_movies, **now_playing_movies}
    now_playing_ids = set(now_playing_movies.keys())
    logger.info(f"Total unique movies to index: {len(all_movies)}")

    # 3. Elasticsearch에 데이터 적재 (벌크 API 및 진행 상황 표시)
    logger.info("\n--- Loading Data to Elasticsearch ---")
    if not all_movies:
        logger.warning("No movies to index. Skipping bulk indexing.")
        return

    actions = generate_actions(all_movies, now_playing_ids)
    
    # 벌크 색인 시 오류 발생 시 재시도 로직을 포함할 수 있지만, 여기서는 간단히 처리
    success_count, errors = helpers.bulk(es, actions, chunk_size=BULK_CHUNK_SIZE, request_timeout=30, raise_on_error=False, raise_on_exception=False)
    
    if errors:
        logger.error(f"Indexed {success_count} movies with {len(errors)} errors.")
        for error in errors:
            logger.error(f"  Error: {error}")
    else:
        logger.info(f"Successfully indexed {success_count} movies.")

if __name__ == "__main__":
    logger.info("--- Starting ETL Process ---")
    # 1. 기존 인덱스 삭제
    if es.indices.exists(index=INDEX_NAME):
        logger.info(f"Deleting existing index '{INDEX_NAME}'...")
        es.indices.delete(index=INDEX_NAME)
        logger.info(f"Existing index '{INDEX_NAME}' deleted.")
    else:
        logger.info(f"Index '{INDEX_NAME}' does not exist. Skipping deletion.")

    # 2. 새 인덱스 생성 (매핑 적용)
    logger.info(f"Creating new index '{INDEX_NAME}' with mappings...")
    es.indices.create(index=INDEX_NAME, body=INDEX_SETTINGS)
    logger.info(f"Index '{INDEX_NAME}' created with mappings.")

    # 3. 데이터 적재 시작
    start_time = time.time()
    fetch_and_index_movies_process()
    end_time = time.time()
    logger.info(f"\n--- ETL Process Finished in {end_time - start_time:.2f} seconds ---")
