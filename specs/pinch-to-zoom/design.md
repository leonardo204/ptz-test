# 디자인 문서

## 개요

이 문서는 핀치 투 줌 제스처 기반 다단계 텍스트 요약 시스템의 기술적 설계를 정의합니다. 본 시스템은 사용자가 텍스트의 요약 수준을 실시간으로 조절할 수 있는 웹 애플리케이션으로, Node.js 백엔드와 바닐라 JavaScript 프론트엔드로 구성됩니다. 핵심 차별점은 단어 단위 그라디언트 애니메이션을 통한 자연스러운 레벨 전환과 TF-IDF 기반 우선순위 계산을 통한 지능적 텍스트 변환입니다.

## 아키텍처

### 시스템 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 (브라우저)                    │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   UI 계층     │  │  제스처 처리  │  │ 애니메이션   │  │
│  │  - 버튼      │  │  - Touch API │  │  엔진        │  │
│  │  - 텍스트    │  │  - Pointer   │  │  - CSS       │  │
│  │    표시      │  │    Events    │  │  - JS 타이머 │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              상태 관리 (State Manager)             │  │
│  │  - 현재 레벨  - 애니메이션 큐  - 캐시 데이터      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                     HTTP/WebSocket
                            │
┌─────────────────────────────────────────────────────────┐
│                   서버 (Node.js)                         │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Express    │  │   요약 엔진   │  │  TF-IDF     │  │
│  │   Server     │  │  - LLM API   │  │  계산기      │  │
│  │  (Port 3135) │  │  - 프롬프트  │  │  - 토큰화    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  데이터 계층                        │  │
│  │  - 원문 로더  - 요약 캐시  - 세션 관리            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 디렉토리 구조

```
pinch-to-zoom/
├── docker-compose.yml          # Docker Compose 설정
├── .env.example               # 환경 변수 템플릿
├── .env                       # 환경 변수 (gitignore)
│
├── nginx/
│   ├── Dockerfile             # Nginx 컨테이너 설정
│   └── nginx.conf             # Nginx 설정 파일
│
├── server/
│   ├── Dockerfile             # Node.js 컨테이너 설정
│   ├── package.json           # 서버 의존성
│   ├── index.js               # Express 서버 진입점
│   ├── config/
│   │   ├── azure.js          # Azure OpenAI 설정
│   │   └── prompts.js        # LLM 프롬프트 템플릿
│   ├── services/
│   │   ├── summarizer.js     # Azure OpenAI 요약 생성
│   │   ├── tfidf.js         # TF-IDF 계산 모듈
│   │   └── wordMatcher.js    # 단어 매칭 알고리즘
│   └── utils/
│       ├── textProcessor.js  # 텍스트 전처리
│       └── cache.js          # 요약 캐싱
│
├── client/
│   ├── index.html            # 메인 HTML
│   ├── css/
│   │   ├── main.css         # 기본 스타일
│   │   └── animations.css    # 애니메이션 정의
│   └── js/
│       ├── app.js           # 메인 애플리케이션
│       ├── gesture.js       # 제스처 처리
│       ├── animator.js      # 애니메이션 컨트롤러
│       ├── stateManager.js  # 상태 관리
│       └── utils.js         # 유틸리티 함수
│
└── data/
    └── example.txt          # 샘플 텍스트 (어린왕자)
```

## 컴포넌트 및 인터페이스

### 1. 서버 컴포넌트

#### Express Server
```javascript
// 주요 엔드포인트
GET  /                      // 메인 페이지 서빙
POST /api/summarize        // 요약 생성 요청
GET  /api/text/:level      // 특정 레벨 텍스트 조회
POST /api/calculate-diff   // 레벨 간 차이 계산
```

#### Summarizer Service
```javascript
interface SummaryRequest {
  text: string;
  targetLevel: 1 | 2 | 3;
}

interface SummaryResponse {
  level: number;
  text: string;
  metadata: {
    compressionRate: number;
    keywordsPreserved: string[];
    semanticSimilarity: number;
  };
}
```

#### TF-IDF Calculator
```javascript
interface TFIDFResult {
  word: string;
  tfidf: number;
  tf: number;
  idf: number;
  position: number;
}

// 우선순위 계산 공식
priority = 0.4 * tfidf + 0.3 * posScore + 0.2 * syntaxScore + 0.1 * locationScore;
```

### 2. 클라이언트 컴포넌트

#### Gesture Handler
```javascript
interface GestureState {
  isActive: boolean;
  startDistance: number;
  currentDistance: number;
  pointers: Map<number, {x: number, y: number}>;
}

// 레벨 매핑 규칙
calculateLevel(distance) {
  if (distance > 0.8) return 0;
  if (distance > 0.6) return 1;
  if (distance > 0.4) return 2;
  return 3;
}
```

#### Animation Engine
```javascript
interface AnimationTimeline {
  word: string;
  action: 'fadeIn' | 'fadeOut' | 'morph';
  startTime: number;
  duration: number;
  easing: string;
  fromOpacity?: number;
  toOpacity?: number;
}

// 애니메이션 그룹화
const ANIMATION_GROUPS = {
  IMMEDIATE: { priority: [0, 0.3], delay: 0 },
  MIDDLE: { priority: [0.3, 0.6], delay: 100 },
  LATE: { priority: [0.6, 1.0], delay: 200 }
};
```

#### State Manager
```javascript
interface AppState {
  currentLevel: 0 | 1 | 2 | 3;
  texts: Map<number, string>;
  isAnimating: boolean;
  cache: Map<string, any>;
  viewportAnchor: {
    word: string;
    offset: number;
  };
}
```

## 데이터 모델

### 1. 텍스트 레벨 구조
```javascript
interface TextLevel {
  level: number;              // 0-3
  content: string;            // 실제 텍스트
  words: Word[];             // 단어 배열
  metadata: {
    originalLength: number;
    compressedLength: number;
    compressionRate: number;
    keywordsCount: number;
  };
}
```

### 2. 단어 모델
```javascript
interface Word {
  text: string;              // 단어 텍스트
  position: number;          // 문서 내 위치
  sentence: number;          // 문장 번호
  paragraph: number;         // 문단 번호
  pos: string;              // 품사 (NOUN, VERB, etc.)
  tfidf: number;            // TF-IDF 스코어
  priority: number;          // 계산된 우선순위
  isKeyword: boolean;        // 키워드 여부
}
```

### 3. 전환 차이 모델
```javascript
interface TransitionDiff {
  from: number;              // 시작 레벨
  to: number;                // 목표 레벨
  kept: Word[];              // 유지되는 단어
  removed: Word[];           // 제거되는 단어
  added: Word[];             // 추가되는 단어
  morphed: Array<{           // 변형되는 단어
    from: Word;
    to: Word;
    similarity: number;
  }>;
}
```

## 에러 처리

### 에러 유형 및 대응 전략

1. **LLM API 실패**
   - 폴백: 로컬 간단 요약 알고리즘 사용
   - 재시도: 3회, 지수 백오프 적용
   - 사용자 알림: "요약 생성 중 일시적 오류"

2. **메모리 부족**
   - 대응: 긴 텍스트 청킹 처리
   - 캐시 정리: LRU 알고리즘
   - 제한: 최대 텍스트 크기 500KB

3. **애니메이션 성능 저하**
   - 감지: requestAnimationFrame FPS 모니터링
   - 대응: 애니메이션 단순화 또는 스킵
   - 임계값: 30FPS 이하 시 품질 조정

4. **네트워크 오류**
   - 오프라인 모드: 로컬 캐시 데이터 사용
   - 재연결: 자동 재시도 메커니즘
   - 상태 표시: 연결 상태 인디케이터

## 테스팅 전략

### 1. 단위 테스트
- **TF-IDF 계산**: 정확도 검증
- **단어 매칭 알고리즘**: 다양한 텍스트 케이스
- **우선순위 계산**: 공식 정확성
- **레벨 매핑**: 거리-레벨 변환 정확성

### 2. 통합 테스트
- **API 엔드포인트**: 요청/응답 검증
- **요약 생성 파이프라인**: End-to-end 플로우
- **캐싱 메커니즘**: 저장/조회 정확성
- **세션 관리**: 다중 사용자 시나리오

### 3. UI/UX 테스트
- **제스처 인식**: 모바일/데스크톱 호환성
- **애니메이션 성능**: 60FPS 유지 검증
- **반응형 디자인**: 다양한 화면 크기
- **접근성**: 키보드 네비게이션, 스크린 리더

### 4. 성능 테스트
- **단어 매칭 시간**: < 50ms 목표
- **애니메이션 프레임률**: 60FPS 유지
- **메모리 사용량**: < 100MB
- **API 응답 시간**: < 1초 (캐시 미스 시)

## 기술 스택 상세

### 인프라
- **Docker Compose**: 컨테이너 오케스트레이션
- **Nginx**: 리버스 프록시 및 정적 파일 서빙 (포트 18281)
- **Docker Network**: 서비스 간 통신

### 백엔드
- **Node.js 18+**: 런타임 환경
- **Express 4.x**: 웹 프레임워크 (포트 3135)
- **Azure OpenAI API**: LLM 요약 생성 (o4-mini 모델)
- **@azure/openai**: Azure OpenAI SDK
- **natural**: 자연어 처리 (토큰화, 품사 태깅)
- **node-cache**: 인메모리 캐싱

### 프론트엔드
- **Vanilla JavaScript**: 의존성 최소화
- **CSS3 Animations**: GPU 가속 애니메이션
- **Pointer Events API**: 통합 입력 처리
- **Web Workers**: 무거운 계산 오프로드

### 개발 도구
- **ESLint**: 코드 품질 관리
- **Prettier**: 코드 포맷팅

## 성능 최적화 전략

### 1. 프리렌더링 및 캐싱
```javascript
// 모든 레벨 사전 생성 및 캐싱
const preloadAllLevels = async (text) => {
  const levels = await Promise.all([
    generateLevel1(text),
    generateLevel2(text),
    generateLevel3(text)
  ]);
  cache.set(hashText(text), levels);
};
```

### 2. 가상 DOM 차이 계산
```javascript
// 효율적인 DOM 업데이트
const updateDOM = (diff) => {
  // DocumentFragment 사용으로 리플로우 최소화
  const fragment = document.createDocumentFragment();
  diff.removed.forEach(word => scheduleRemoval(word));
  diff.added.forEach(word => scheduleAddition(word, fragment));
  container.appendChild(fragment);
};
```

### 3. 애니메이션 최적화
```css
/* GPU 가속 활용 */
.word-transition {
  will-change: opacity, transform;
  transform: translateZ(0); /* 레이어 생성 */
  backface-visibility: hidden;
}
```

### 4. 웹 워커 활용
```javascript
// 무거운 계산을 별도 스레드로
const worker = new Worker('tfidf-worker.js');
worker.postMessage({ text, operation: 'calculate' });
worker.onmessage = (e) => {
  const { tfidfScores } = e.data;
  applyPriorities(tfidfScores);
};
```

## 보안 고려사항

1. **입력 검증**
   - XSS 방지: 모든 사용자 입력 sanitize
   - 텍스트 크기 제한: DoS 방지
   - Rate limiting: API 남용 방지

2. **API 보안**
   - CORS 설정: 허용된 도메인만
   - API 키 관리: 환경 변수 사용
   - HTTPS 강제: 전송 암호화

3. **데이터 프라이버시**
   - 세션 격리: 사용자 간 데이터 분리
   - 임시 데이터 정리: 세션 종료 시 삭제
   - 로깅 최소화: 민감 정보 제외

## Docker 아키텍처

### 컨테이너 구성
```yaml
services:
  nginx:
    - 포트: 18281 (외부) → 80 (내부)
    - 역할: 리버스 프록시, 정적 파일 서빙
    - 볼륨: ./client → /usr/share/nginx/html

  app:
    - 포트: 3135 (내부)
    - 역할: Node.js API 서버
    - 환경 변수: AZURE_OPENAI_API_KEY, ENDPOINT_URL, DEPLOYMENT_NAME
    - 볼륨: ./server, ./data
```

### Nginx 설정
```nginx
upstream app_server {
    server app:3135;
}

server {
    listen 80;

    # 정적 파일
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # API 프록시
    location /api {
        proxy_pass http://app_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Azure OpenAI 연동
```javascript
// Azure OpenAI 클라이언트 설정
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const client = new OpenAIClient(
  process.env.ENDPOINT_URL,
  new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY)
);

// 요약 생성 호출
const completion = await client.getChatCompletions(
  process.env.DEPLOYMENT_NAME,  // "o4-mini"
  messages,
  {
    temperature: 0.7,
    maxTokens: 2000
  }
);
```

## 확장성 고려사항

1. **다국어 지원**
   - 언어별 토큰화 전략
   - RTL 언어 레이아웃 지원
   - 언어별 품사 태거

2. **플러그인 아키텍처**
   - 커스텀 요약 알고리즘
   - 외부 LLM 프로바이더
   - 커스텀 애니메이션 효과

3. **스케일링 전략**
   - 수평 확장: Docker Swarm 또는 Kubernetes
   - 캐시 레이어: Redis 컨테이너 추가
   - CDN: Nginx 캐싱 활용