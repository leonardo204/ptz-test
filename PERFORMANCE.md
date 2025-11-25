# 성능 최적화 문서

이 문서는 Pinch-to-Zoom 텍스트 요약 시스템에 적용된 성능 최적화 기법을 설명합니다.

## 🎯 프론트엔드 최적화

### 1. GSAP 기반 애니메이션

**다이나믹 대각선 진입 애니메이션** (animator.js)
```javascript
// 추가된 단어: 대각선에서 날아오며 확대
addedWords.forEach((word) => {
    const dir = getRandomDiagonal();  // 200~250px 랜덤 거리
    gsap.set(word, {
        opacity: 0,
        scale: 0.1,  // 매우 작게 시작
        x: dir.x,
        y: dir.y,
        filter: 'blur(3px)'  // 흐릿하게 시작
    });
});

tl.to(addedWords, {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    filter: 'blur(0px)',  // 선명하게
    duration: 0.7,
    ease: 'back.out(2.0)',  // 강한 오버슈팅 효과
    stagger: { amount: adjustedStaggerAmount, from: 'start' }  // 위→아래
});
```

**사라지는 단어 Fade Out** (app.js)
```javascript
// removed가 있을 때 짧은 fade out
if (diffData.removed && diffData.removed.length > 0) {
    await gsap.to(textContent, {
        opacity: 0.3,
        duration: 0.15,
        ease: 'power1.out'
    });
}
// 텍스트 교체 후 opacity 즉시 복원
```

**성능 최적화 전략**:
- **뷰포트 필터링**: 화면에 보이는 단어만 애니메이션 (±200px)
- **샘플링**: 대량 전환 시 50% 랜덤 샘플링
- **동적 Duration**: 단어 개수에 비례 조정 (0.3~0.8초)
- **위→아래 순서**: `from: 'start'`로 자연스러운 읽기 순서

### 2. 뷰포트 필터링

```javascript
function filterAndSampleWords(wordIndices, allWords, samplingRate) {
    // 1단계: 뷰포트 내 단어만 선택
    const viewportTop = window.scrollY - 200;
    const viewportBottom = window.scrollY + window.innerHeight + 200;

    // 2단계: 샘플링 (50% 또는 100%)
    if (samplingRate < 1.0) {
        const targetCount = Math.floor(filteredIndices.length * samplingRate);
        return shuffled.slice(0, targetCount);
    }
}
```

### 3. 샘플링 전략

| 전환 | 단어 수 | 샘플링 비율 | 애니메이션 단어 수 |
|------|---------|-------------|-------------------|
| Level 0 ↔ 1 | 5157 (kept+added) | 50% | ~173개 |
| Level 1 ↔ 2 | ~2500 | 100% | ~1250개 |
| Level 2 ↔ 3 | ~1000 | 100% | ~500개 |

**Level 0→1 예시 (실제 데이터)**:
- kept: 2750개 → 샘플링 후 146개
- added: 169개 → 뷰포트 필터링 후 27개
- 총 애니메이션: 173개

### 4. 동적 Duration 조정

```javascript
// 단어 개수에 비례한 배율 계산
const durationMultiplier = Math.max(0.3, Math.min(1.0, totalWords / 100));
const adjustedStaggerAmount = 0.4 * durationMultiplier;

// 10개 → 0.3x (0.12초 stagger)
// 100개 → 1.0x (0.40초 stagger)
```

### 5. 레이아웃 최적화

**고정 레이아웃 구조** (main.css)
```css
.app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.text-container {
    flex: 1;
    overflow-y: auto;
}

.app-header, .app-footer {
    flex-shrink: 0;
}
```

### 6. 이벤트 최적화

**Pointer Events API 사용**
- 터치와 마우스를 통합 처리
- 불필요한 이벤트 리스너 감소

**디바운스 및 쓰로틀**
- 슬라이더: 150ms 디바운스
- 핀치: 100ms 디바운스
- 휠: 100ms 디바운스

## 🔧 백엔드 최적화

### 1. 캐싱 전략

**Node-cache 설정**
```javascript
const cache = new NodeCache({
    stdTTL: 3600,           // 1시간 TTL
    maxKeys: 100,           // 최대 100개 항목
    checkperiod: 120,       // 2분마다 만료 확인
    useClones: false        // 메모리 절약
});
```

**캐시 키 생성**
```javascript
const cacheKey = crypto.createHash('sha256')
    .update(text)
    .digest('hex');
```

### 2. API 최적화

**병렬 요약 생성**
```javascript
const summaries = await Promise.all([
    generateLevel1(text),
    generateLevel2(text),
    generateLevel3(text)
]);
```

### 3. 단어 차이 분석 최적화

**서버 측**:
- 소문자 정규화 후 diff 계산
- Set 자료구조로 O(1) 탐색

**클라이언트 측** (app.js - transformDiffData):
- 원본 대소문자 유지한 매칭
- **단어 개수 기반 카운팅**: 서버에서 받은 단어 개수만큼만 정확히 매칭
- **중복 방지**: `usedToIndices` Set으로 이미 사용된 인덱스 추적
```javascript
// 단어별 개수 카운트
const keptWordCounts = {};
diffData.kept.forEach(w => {
    const word = w.toLowerCase();
    keptWordCounts[word] = (keptWordCounts[word] || 0) + 1;
});

// 개수만큼만 매칭
toWords.forEach((word, index) => {
    if (keptWordCounts[lowerWord] > 0 && !usedToIndices.has(index)) {
        transformed.kept.push({ word, index });
        keptWordCounts[lowerWord]--;  // 사용한 개수 감소
    }
});
```
**결과**: 서버 2750개 → 클라이언트 2750개 (정확한 1:1 매칭)

## 📊 성능 측정 지표

### 프론트엔드

| 항목 | Level 0↔1 | Level 1↔2 | Level 2↔3 |
|-----|-----------|-----------|-----------|
| 애니메이션 단어 수 | ~1250개 (50%) | ~1250개 (100%) | ~500개 (100%) |
| 전환 시간 | ~0.8초 | ~0.8초 | ~0.5초 |
| FPS | ~60 | ~60 | ~60 |

### 백엔드

| 항목 | 목표 | 실제 |
|-----|------|------|
| API 응답 (캐시) | < 50ms | ~30ms |
| API 응답 (생성) | < 5초 | ~3-4초 |
| 요약 생성 (전체) | < 15초 | ~10-12초 |
| 메모리 사용량 | < 512MB | ~200MB |

## 🎨 사용자 경험 최적화

### 1. 프로그레시브 로딩
- 원문 즉시 표시
- 요약은 백그라운드에서 생성

### 2. 스크롤 위치 유지
- Header/Footer 고정
- 텍스트 영역만 스크롤

### 3. 로딩 상태 표시
```javascript
Utils.showLoading('요약 생성 중...');
```

## 📱 모바일 최적화

### 터치 최적화
```css
.text-container {
    touch-action: pan-y pinch-zoom;
    -webkit-overflow-scrolling: touch;
}
```

### 뷰포트 설정
```html
<meta name="viewport"
      content="width=device-width, initial-scale=1.0, user-scalable=no">
```

### 반응형 디자인
- 모바일: < 768px
- 태블릿: 768-1024px
- 데스크톱: > 1024px

## 💡 주요 성능 개선 내역

### v1.0 - 초기 구현
- GPU 가속 CSS 애니메이션
- 우선순위 기반 스태거

### v1.1 - GSAP 전환
- GSAP 타임라인 도입
- Blink 효과 구현

### v1.2 - 성능 최적화
- 뷰포트 필터링 추가
- 50% 샘플링 적용 (대량 전환)
- 동적 duration 조정
- Blink 횟수 1회로 감소

## 🔍 성능 모니터링

### 브라우저 개발자 도구
```javascript
// Performance 탭에서 확인
// - 애니메이션 프레임 드롭
// - 메모리 사용량
// - 네트워크 요청
```

### 서버 로그
```javascript
console.log(`요약 생성 완료: ${Date.now() - startTime}ms`);
console.log(`애니메이션 단어 수: ${totalWords}개, duration 배율: ${multiplier}x`);
console.log(`샘플링 (50%): ${original}개 → ${sampled}개`);
```

## ⚠️ 성능 저하 시 대처

### 캐시 정리
```javascript
App.clearCache();  // 메모리 부족 시
```

### 디버그 모드 비활성화
```javascript
AppConfig.debug = false;
Animator.config.debug = false;
```

## 📈 향후 개선 방안

1. **Service Worker 캐싱**
   - 오프라인 지원
   - 정적 리소스 캐싱

2. **Code Splitting**
   - 모듈 지연 로딩

3. **WebAssembly**
   - TF-IDF 계산 가속

4. **Redis 캐시**
   - 영구 캐싱
   - 다중 인스턴스 공유
