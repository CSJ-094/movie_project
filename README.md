# Movie_Project (영화 추천 프로젝트)
> **TMDB API 기반의 검색엔진 구현 및 사용자 경험 기반 영화 추천 플랫폼**

이 프로젝트는 TMDB API를 활용하여 영화 데이터를 수집하고, Elasticsearch를 도입하여 검색 성능을 최적화한 영화 검색 서비스입니다. Python으로 데이터를 가공 및 적재하고, Spring Boot로 백엔드 API를 구축하였으며, React로 사용자 친화적인 인터페이스를 구현했습니다.

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
---

## 🛠 Tech Stack (기술 스택)

| 분류 | 기술 |
| :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) ![SWR](https://img.shields.io/badge/SWR-000000?style=flat&logo=vercel&logoColor=white) ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat&logo=axios&logoColor=white) |
| **Backend** | ![Java](https://img.shields.io/badge/Java-17-007396?style=flat&logo=openjdk&logoColor=white) ![SpringBoot](https://img.shields.io/badge/Spring_Boot-3.2.x-6DB33F?style=flat&logo=spring-boot&logoColor=white) ![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=flat&logo=python&logoColor=white) ![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=flat&logo=spring-security&logoColor=white) ![JPA](https://img.shields.io/badge/JPA-Hibernate-59666C?style=flat&logo=hibernate&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-JSON_Web_Token-000000?style=flat&logo=json-web-tokens&logoColor=white) ![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat&logo=swagger&logoColor=black) |
| **Data & Search** | ![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql&logoColor=white) ![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?style=flat&logo=elasticsearch&logoColor=white) ![Kibana](https://img.shields.io/badge/Kibana-005571?style=flat&logo=kibana&logoColor=white) |
| **AI & API** | ![OpenAI](https://img.shields.io/badge/OpenAI-GPT_4o_mini-412991?style=flat&logo=openai&logoColor=white) ![Google Cloud Vision](https://img.shields.io/badge/Google_Cloud_Vision-4285F4?style=flat&logo=google-cloud&logoColor=white) ![Toss Payments](https://img.shields.io/badge/Toss_Payments-0064FF?style=flat&logo=toss&logoColor=white) |
| **Infra & Tools** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white) ![Git](https://img.shields.io/badge/Git-F05032?style=flat&logo=git&logoColor=white) ![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white) |
| **Collaboration** | ![Jira](https://img.shields.io/badge/Jira-0052CC?style=flat&logo=jira&logoColor=white) ![Slack](https://img.shields.io/badge/Slack-4A154B?style=flat&logo=slack&logoColor=white) ![Notion](https://img.shields.io/badge/Notion-000000?style=flat&logo=notion&logoColor=white) |

## 설계

**ERD 테이블 설계**
![image](https://github.com/user-attachments/assets/4d5a879f-b70b-4317-8ba5-3fe3a85a231c)

```mermaid
graph TD
    %% 스타일 정의 (색상 등)
    classDef main fill:#ff9,stroke:#333,stroke-width:2px;
    classDef sub fill:#e1f5fe,stroke:#333,stroke-width:1px;
    classDef ext fill:#f5f5f5,stroke:#999,stroke-width:1px,stroke-dasharray: 5 5;

    %% 사용자 및 진입점
    User((User)) --> Client[Frontend]
    Admin((Admin)) --> Client
    Client --> API_Gateway[API Controller Layer]

    %% 1. 회원 및 인증 관리 (왼쪽 영역)
    subgraph "👤 Member & Auth Service"
        API_Gateway --> LoginCtrl[Login Controller]
        LoginCtrl --> SocialAuth["Social Login (Kakao/Naver)"]
        LoginCtrl --> MemberCtrl[Member Controller]
        MemberCtrl --> MyPage["My Page / Info"]
        MemberCtrl --> ScrapCtrl[Scrap Controller]
    end

    %% 2. 검색 서비스 (중간 상단)
    subgraph "🔍 Search Service"
        API_Gateway --> SearchCtrl[Search Controller]
        SearchCtrl --> HistoryCtrl[Search History Controller]
        SearchCtrl --> ES[(Elasticsearch)]
    end

    %% 3. 영화 및 리뷰 서비스 (중앙 핵심)
    subgraph "🎬 Movie & Content Service"
        API_Gateway --> MovieCtrl[Movie Info Controller]
        
        MovieCtrl --> ReviewCtrl[Review Controller]
        ReviewCtrl --> SummaryCtrl[AI Review Summary]
        SummaryCtrl -.-> OpenAI[OpenAI API]
        
        MovieCtrl --> RatingCtrl[Star Rating Controller]
        MovieCtrl --> LikeCtrl["Favorite/Like Controller"]
        MovieCtrl -.-> VisionAPI["Google Vision API (Rec)"]
    end

    %% 4. 예약 및 결제 서비스 (왼쪽 하단)
    subgraph "🎫 Booking & Payment Service"
        API_Gateway --> BookCtrl[Booking Controller]
        BookCtrl --> SeatCtrl[Seat Selection Controller]
        BookCtrl --> PayCtrl[Payment Controller]
        PayCtrl -.-> Toss[Toss Payments API]
    end

    %% 5. 관리자 및 고객지원 (오른쪽 영역)
    subgraph "🛠 Admin & Support Service"
        API_Gateway --> AdminCtrl[Admin Controller]
        AdminCtrl --> NoticeCtrl[Notice Controller]
        AdminCtrl --> QnACtrl["Q&A / Inquiry Controller"]
        AdminCtrl --> ReportCtrl["Report/Ban Controller"]
        AdminCtrl --> MovieManage[Movie Management]
    end

    %% 주요 데이터 흐름 연결
    MainPage[Main Page] --> MovieCtrl
    PayCtrl --Success--> User
