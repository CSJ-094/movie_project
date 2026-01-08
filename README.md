# Movie_Project (영화 추천 프로젝트)
> **TMDB API 기반의 검색엔진 구현 및 사용자 경험 기반 영화 추천 플랫폼**

이 프로젝트는 TMDB API를 활용하여 영화 데이터를 수집하고, Elasticsearch를 도입하여 검색 성능을 최적화한 영화 검색 서비스입니다. Python으로 데이터를 가공 및 적재하고, Spring Boot로 백엔드 API를 구축하였으며, React로 사용자 친화적인 인터페이스를 구현했습니다.

<img width="891" height="1260" alt="Image" src="https://github.com/user-attachments/assets/c44d0d3a-56a1-49f3-8067-359b694382a5" />
---

## 🎯 프로젝트 선정 배경


### 1. 🔍 검색의 한계 (Search Limitations)
* **단순 키워드 매칭:** 단순 텍스트 일치 여부만 판단하여 정확도가 낮음
* **편의 기능 부족:** 자동완성이나 오타 보정 기능이 없어 검색 경험이 불편함
* **대안 제시 미흡:** 검색 결과가 없을 때, 유사한 영화를 추천해 주는 등의 대처가 부족함
* **비효율적 탐색:** 원하는 영화를 찾기까지 너무 많은 시간이 소요됨

<br/>

### 2. 🎬 추천의 한계 (Recommendation Limitations)
* **획일적 추천:** 인기 순위나 단순 장르 중심의 뻔한 추천에 그침
* **개인화 부재:** 사용자의 세밀한 취향이나 시청 패턴을 반영하지 못함
* **불투명한 기준:** 왜 이 영화를 추천했는지에 대한 근거를 알 수 없음
* **피드백 구조 미흡:** 추천 결과에 대해 사용자가 만족/불만족을 표현할 방법이 부족함
<br/>

### 3. 💬 리뷰의 한계 (Review Limitations)
* **정보 과부하:** 너무 많은 리뷰로 인해 영화의 핵심 정보를 파악하기 어려움
* **감정 분석 불가:** 긍정적인지 부정적인지 명확한 구분이 어려움
* **요약 기능 부재:** 긴 줄글 형태의 리뷰를 한눈에 파악할 수 있는 요약 기능이 없음
* **낮은 활용성:** 외부 사이트의 양질의 리뷰 데이터를 제대로 활용하지 못함
<br/>


## 🛠 Tech Stack (기술 스택)

| 분류 | 기술 |
| :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) ![SWR](https://img.shields.io/badge/SWR-000000?style=flat&logo=vercel&logoColor=white) ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat&logo=axios&logoColor=white) |
| **Backend** | ![Java](https://img.shields.io/badge/Java-17-007396?style=flat&logo=openjdk&logoColor=white) ![SpringBoot](https://img.shields.io/badge/Spring_Boot-3.2.x-6DB33F?style=flat&logo=spring-boot&logoColor=white) ![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=flat&logo=python&logoColor=white) ![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=flat&logo=spring-security&logoColor=white) ![JPA](https://img.shields.io/badge/JPA-Hibernate-59666C?style=flat&logo=hibernate&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-JSON_Web_Token-000000?style=flat&logo=json-web-tokens&logoColor=white) ![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat&logo=swagger&logoColor=black) |
| **Data & Search** | ![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql&logoColor=white) ![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?style=flat&logo=elasticsearch&logoColor=white) ![Kibana](https://img.shields.io/badge/Kibana-005571?style=flat&logo=kibana&logoColor=white) |
| **AI & API** | ![OpenAI](https://img.shields.io/badge/OpenAI-GPT_4o_mini-412991?style=flat&logo=openai&logoColor=white) ![Google Cloud Vision](https://img.shields.io/badge/Google_Cloud_Vision-4285F4?style=flat&logo=google-cloud&logoColor=white) ![Toss Payments](https://img.shields.io/badge/Toss_Payments-0064FF?style=flat&logo=toss&logoColor=white) |
| **Infra & Tools** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white) ![Git](https://img.shields.io/badge/Git-F05032?style=flat&logo=git&logoColor=white) ![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white) |
| **Collaboration** | ![Jira](https://img.shields.io/badge/Jira-0052CC?style=flat&logo=jira&logoColor=white) ![Slack](https://img.shields.io/badge/Slack-4A154B?style=flat&logo=slack&logoColor=white) ![Notion](https://img.shields.io/badge/Notion-000000?style=flat&logo=notion&logoColor=white) |

<br/>

## 📂 Project Structure (폴더 구조)

이 프로젝트는 **Frontend(React)**와 **Backend(Spring Boot)**가 분리된 모노레포(Monorepo) 형태의 구조를 따르고 있으며, Python을 이용한 별도의 데이터 파이프라인(ETL)을 포함하고 있습니다.

```bash
movie_project/
├── 📂 backend/              # Spring Boot API Server
│   ├── src/main/java       # Java Source Code 
│   ├── src/main/resources  # Config (application.yml) & Mapper
│   └── build.gradle        # Gradle Build Settings
│
├── 📂 frontend/             # React Client Application
│   ├── src/                # React Source Code 
│   ├── public/             # Static Assets 
│   └── package.json        # NPM Dependencies
│
├── 📂 etl/                  # Python Data Pipeline (ETL)
│   ├── collector.py        # TMDB API Data Collection Script
│   └── loader.py           # Elasticsearch Data Insert Script
│
├── 📂 images/               # README & Documentation Assets
│   └── ...                 # Architecture, ERD, Flowcharts
│
└── 📄 README.md             # Project Documentation
```

<br/>

---

## 🚀 System Architecture

**[ERD]**
![구조도](./images/ERD.png)

<br/> 



**[서비스 구조도]**
![구조도](./images/구조도.png)

<br/>

**[업무 흐름도]**
![업무 흐름도](./images/업무흐름도.png)

<br/>

## 📂 Project Documents (기타 문서)

프로젝트 진행 시 작성된 설계 문서입니다. 클릭 시 상세 내용을 확인할 수 있습니다.

| 문서 종류 | 파일명 | 형식 | 바로가기 |
| :--- | :--- | :---: | :---: |
| **화면 설계서** | 화면설계서.pdf | ![PDF](https://img.shields.io/badge/PDF-F40F02?style=flat-square&logo=adobe-acrobat-reader&logoColor=white) | [📄 문서 보기](./images/메인페이지.pdf) |
| **테이블 명세서** | 테이블명세서.xls | ![Excel](https://img.shields.io/badge/Excel-217346?style=flat-square&logo=microsoft-excel&logoColor=white) | [📊 시트 보기](./images/테이블명세서.xls) |

<br/>

## ✨ Key Features (주요 기능)

### 1. Elasticsearch 기반 고성능 검색
단순 DB 조회가 아닌, 검색 엔진을 도입하여 속도와 정확도를 극대화했습니다.
* **고도화된 검색:** Nori 형태소 분석기를 적용하여 한국어 검색 최적화
* **편의 기능:** 실시간 자동완성, 오타 교정, 초성 검색 지원
* **다양한 필터:** 장르, 연도, 평점 등 세밀한 조건 검색 제공

<br/>

### 2. AI 기반 추천 및 리뷰 요약
사용자 경험을 높이기 위해 최신 AI 기술을 적극 활용했습니다.
* **30초 퀵매치 (Quick Match):** 틴더(Tinder) 스타일의 UI로 선호 영화를 선택하면 취향을 분석해 영화 추천 
* **안면 인식 추천:** Google Vision API를 활용, 사용자의 현재 표정(감정)을 분석하여 맞춤 장르 추천 
* **AI 리뷰 요약:** OpenAI(GPT) API를 연동하여 방대한 리뷰를 긍정/부정으로 분석하고 3줄 요약 제공 
* **글로벌 리뷰 번역:** TMDB의 해외 리뷰를 자동으로 수집 및 한국어로 번역하여 제공 

<br/>

### 3. 실시간 예매 및 결제 시스템
실제 영화관과 유사한 프로세스를 완벽하게 구현했습니다.
* **좌석 예매:** 상영관별 좌석 배치도 시각화 및 실시간 잔여 좌석 확인 
* **동적 가격 정책:** 조조, 심야, 주말 등 시간대별 차등 요금 적용 로직 구현 
* **결제 연동:** Toss Payments API를 활용한 실제 결제 및 환불 프로세스 구현
* **티켓 발권:** 예매 완료 시 QR 코드가 포함된 모바일 티켓 발급

<br/>

### 4. 사용자 편의 & 멤버십 서비스
* **QR 코드 로그인:** 모바일 앱 시뮬레이터를 통한 QR 스캔 로그인 기능 구현 (WebSocket 활용) 
* **연말 리캡 (Recap):** 사용자의 1년 간 관람 기록, 찜 목록 등을 분석하여 '나만의 영화 여정' 인포그래픽 제공 
* **소셜 로그인:** 카카오, 구글, 네이버 등 간편 로그인 지원 (JWT 인증) 
* **영화 뉴스:** 네이버 검색 API를 크롤링하여 실시간 영화 뉴스 및 트렌드 정보 제공

<br/>

---



## 🚀 Getting Started (프로젝트 실행 가이드)


로컬 환경에서 프로젝트를 실행하기 위한 단계별 가이드입니다. 

### 1. 💡 Database (Elasticsearch) 실행
프로젝트 최상위 폴더에서 Docker를 통해 검색 엔진을 실행합니다.

```bash
# 1. 터미널 열기 (프로젝트 최상위 위치)
# 2. 컨테이너 실행
docker-compose up -d
```
> **-** 브라우저에서 http://localhost:9200 접속 시 JSON 응답이 보이면 성공

<br/>

### 2. 💡 Plugin Installation (한글 형태소 분석기)
DB가 켜진 상태에서, 한글 검색 최적화를 위해 'nori' 분석기를 설치합니다.

```bash
# 1. 플러그인 설치 명령어 입력
docker exec -it elasticsearch bin/elasticsearch-plugin install analysis-nori

# 2. Elasticsearch 재시작 (설치 적용)
docker restart elasticsearch
```

<br/>

### 3. 💡 Data ETL (데이터 적재)
TMDB에서 영화 데이터를 수집하여 DB에 채워 넣습니다.

```Bash

cd etl

# 1. 필수 라이브러리 설치
pip install -r requirements.txt

# 2. 데이터 수집 및 적재 실행
python Movie_El.py
```

> **-** http://localhost:5601 (Kibana) 접속 -> 좌측 햄버거 메뉴 -> Dev Tools -> GET movies/_search 입력 후 실행 (데이터 확인)

<br/>

### 4. 💡 Backend (Spring Boot) 실행
1. IntelliJ 등 IDE에서 `backend` 폴더를 엽니다.
2. `src/main/resources/application.yml` 설정을 확인합니다. (포트 8484)
3. `BootMovieProjectApplication` 파일을 실행합니다.

> **-** 콘솔에 "Started..." 메시지 확인 후 [http://localhost:8484/api/search?q=사랑](http://localhost:8484/api/search?q=사랑) 접속 시 데이터가 뜨면 성공

<br/>

### 5. 💡 Frontend (React) 실행 [프론트]
사용자 인터페이스 화면을 켭니다.

```Bash

cd react  # (중요!) frontend 폴더가 아닌 react 폴더로 이동

# 1. 라이브러리 설치 (최초 1회)
npm install

# 2. 개발 서버 실행
npm run dev

```

> **-** 접속: http://localhost:5173 (Chrome 브라우저 권장)

<br/>

---

## 👥 Team Members (팀원 및 역할)

| 이름 | 포지션 | 담당 역할 |
| :--- | :--- | :--- |
| **조상진** (팀장) | FullStack | • Spring Security & JWT<br>• 소셜 로그인(Kakao, Naver) 구현<br>• 서버 배포<br>• 리캡 기능<br>• React 기반 전반적인 UI/UX 설계 및 구현<br>• 에러 페이지 구현|
| **주석우** | FullStack | • 예매 시스템<br>• 결제 시스템 <br>• 티켓 출력 |
| **김가영** | FullStack | • 검색 및 필터옵션 API<br>• 리뷰API<br>• 자동완성API <br>• 영화 퀵매치 기능<br>• AI 리뷰 요약 |
| **최예성** | FullStack | • UI 개선<br>• 필터<br>• 영화 기사 크롤링 및 구현 |
| **한경훈** | FullStack | • 찜목록, 워치리스트 구현<br>• 별점, 리뷰 구현<br>• 표정 분석기반 영화추천<br>• 인덱스, 매핑 설계<br>• 서버 배포<br>• QR 로그인 구현|
| **최민규** | FullStack | • TMDB 데이터 검색 및 처리 파이프라인 구축<br>• 인덱스, 매핑 설계 및 ElasticSearch 적재<br>• 영화 상세조회 API<br>• 성인 필터링<br>• 추천목록 API<br>• OTT 매칭
