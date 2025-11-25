# 📖 Pinch-to-Zoom 텍스트 요약 시스템

핀치 제스처 기반 다단계 텍스트 요약 MVP

## 🎯 주요 기능

- **4단계 요약 레벨**: 원문 → Level 1 (70-80%) → Level 2 (40-50%) → Level 3 (10-20%)
- **핀치 제스처 지원**: 모바일에서 핀치 제스처로 요약 수준 조절
- **데스크톱 지원**: 버튼, 슬라이더, 키보드, 마우스 휠로 레벨 변경
- **스마트 애니메이션**: GSAP 기반 다이나믹 대각선 진입 애니메이션
  - 추가된 단어: 대각선(11시,1시,5시,7시)에서 날아오며 확대 + 초록색 깜빡임
  - 유지된 단어: 노란색 배경으로 1회 깜빡임
  - 각 단어마다 랜덤 방향(200~250px) + 크기(0.1→1.0) + 블러 효과
  - 위→아래 순서로 자연스러운 읽기 순서 구현
  - 뷰포트 기반 필터링으로 성능 최적화
  - 샘플링 기술 적용 (대량 전환 시 50% 샘플링)
  - 단어 개수 비례 duration 자동 조정
- **고정 레이아웃**: Header/Footer 고정, 텍스트 영역만 스크롤
- **Azure OpenAI 통합**: GPT-4 기반 고품질 요약 생성

## 🚀 빠른 시작

### 사전 요구사항

- Docker & Docker Compose
- Azure OpenAI API 키 및 엔드포인트

### 설치 및 실행

1. **프로젝트 클론**
```bash
cd pinch-to-zoom
```

2. **환경 변수 설정**
```bash
cp .env.example .env
# .env 파일을 편집하여 Azure OpenAI 설정 입력
```

3. **example.txt 준비**
```bash
# 프로젝트 루트에 example.txt 파일이 있는지 확인
# 요약할 텍스트를 입력하세요
```

4. **애플리케이션 시작**
```bash
./start.sh
```

5. **브라우저에서 접속**
```
http://localhost:18281
```

### 중지

```bash
./stop.sh              # 컨테이너 중지
./stop.sh --clean      # 컨테이너 및 볼륨 완전 삭제
```

## 📁 프로젝트 구조

```
pinch-to-zoom/
├── client/                 # 프론트엔드
│   ├── css/
│   │   ├── main.css       # 메인 스타일
│   │   └── animations.css # 애니메이션 스타일
│   ├── js/
│   │   ├── app.js         # 메인 앱 로직
│   │   ├── utils.js       # 유틸리티 함수
│   │   ├── stateManager.js # 상태 관리
│   │   ├── gesture.js     # 제스처 인식
│   │   └── animator.js    # 애니메이션 엔진
│   └── index.html
├── server/                # 백엔드
│   ├── config/
│   │   ├── azure.js       # Azure OpenAI 설정
│   │   └── prompts.js     # 프롬프트 템플릿
│   ├── services/
│   │   ├── summarizer.js  # 요약 생성
│   │   ├── tfidf.js       # TF-IDF 계산
│   │   ├── priorityCalculator.js # 단어 우선순위
│   │   └── wordMatcher.js # 단어 매칭
│   ├── utils/
│   │   ├── textProcessor.js # 텍스트 처리
│   │   └── cache.js       # 캐싱
│   └── index.js           # Express 서버
├── nginx/
│   └── nginx.conf         # Nginx 설정
├── docker-compose.yml
├── Dockerfile
├── start.sh               # 시작 스크립트
├── stop.sh                # 중지 스크립트
├── .env.example           # 환경 변수 예제
└── example.txt            # 샘플 텍스트
```

## 🎮 사용 방법

### 데스크톱

- **버튼**: `자세히` (상세), `간단히` (요약)
- **슬라이더**: 드래그하여 레벨 직접 선택
- **키보드**: `Ctrl + +/-` 또는 숫자 키 `0-3`
- **마우스 휠**: `Ctrl + 휠` 위아래

### 모바일

- **핀치 제스처**: 두 손가락으로 확대/축소
  - 확대 → 더 상세한 텍스트 (Level 3 → 0)
  - 축소 → 더 요약된 텍스트 (Level 0 → 3)

## 🔧 기술 스택

### 프론트엔드
- Vanilla JavaScript (ES6+)
- GSAP 3.12.5 (애니메이션 엔진)
- CSS3 Flexbox (고정 레이아웃)
- Pointer Events API (터치/마우스 통합)

### 백엔드
- Node.js + Express
- Azure OpenAI API (GPT-4)
- Natural (NLP 라이브러리)
- Node-cache (메모리 캐싱)

### 인프라
- Docker + Docker Compose
- Nginx (리버스 프록시)

## 🎨 애니메이션 시스템

### 다이나믹 대각선 진입 애니메이션
**추가된 단어 (Added)**:
- 4방향 대각선(11시, 1시, 5시, 7시)에서 랜덤하게 날아옴
- 각 단어마다 고유한 랜덤 거리 (200~250px)
- 매우 작은 크기에서 시작 (scale: 0.1 → 1.0)
- 흐릿한 상태에서 선명하게 (blur: 3px → 0px)
- 강한 오버슈팅 효과 (back.out(2.0))
- 초록색 배경으로 1회 깜빡임
- Duration: 0.7초

**유지된 단어 (Kept)**:
- 노란색 배경 + 텍스트로 1회 깜빡임
- 위→아래 순서로 자연스러운 읽기 순서
- GSAP 타임라인 기반 부드러운 yoyo 애니메이션

### 성능 최적화
1. **뷰포트 필터링**: 화면에 보이는 단어만 애니메이션 (±200px)
2. **샘플링**:
   - Level 0 ↔ 1 (5000+ 단어): 50% 랜덤 샘플링
   - 실제 예시: kept 2750개 → 146개, added 169개 → 27개 (총 173개 애니메이션)
   - Level 1 ↔ 2, 2 ↔ 3: 100% 전체 애니메이션
3. **동적 Duration**: 단어 개수에 비례 조정
   - 10개: 0.3초 (빠름)
   - 100개: 0.8초 (보통)

### 단어 차이 분석
- **서버**: 소문자 정규화 후 diff 계산
- **클라이언트**: 원본 대소문자 유지한 단어 개수 기반 매칭
- **중복 방지**: Set 자료구조로 이미 사용된 인덱스 추적
- **정확한 매칭**: 서버 2750개 → 클라이언트 2750개 (1:1 정확 매칭)

## 🐛 디버깅

### 로그 확인
```bash
docker-compose logs -f app    # 서버 로그
docker-compose logs -f nginx  # Nginx 로그
```

### 브라우저 콘솔
- F12 → Console 탭에서 클라이언트 로그 확인

### 캐시 관리
```javascript
// 브라우저 콘솔에서 실행
App.showCacheStats()  // 캐시 통계 확인
App.clearCache()      // 캐시 초기화
```

## 📝 라이선스

이 프로젝트는 MVP 데모용입니다.

## 👥 기여

버그 리포트나 기능 제안은 이슈로 등록해주세요.
