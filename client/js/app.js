/**
 * 메인 애플리케이션 모듈
 *
 * 모든 모듈을 통합하여 핀치 투 줌 텍스트 요약 시스템을 실행합니다.
 */

(function(window) {
    'use strict';

    /**
     * 애플리케이션 설정
     */
    const AppConfig = {
        // 캐시 사용 여부
        useCache: true,

        // 자동 초기화 여부
        autoInit: true,

        // 디버그 모드
        debug: false
    };

    /**
     * 애플리케이션 초기화
     */
    async function init() {
        console.log('='.repeat(50));
        console.log('📖 Pinch-to-Zoom 텍스트 요약 시스템 초기화');
        console.log('='.repeat(50));

        try {
            // 1. 제스처 초기화
            initGestures();

            // 2. 이벤트 리스너 등록
            registerEventListeners();

            // 3. 초기 텍스트 로드
            await loadInitialText();

            // 4. UI 초기화
            initializeUI();

            console.log('✓ 애플리케이션 초기화 완료');
            console.log('='.repeat(50));

        } catch (error) {
            console.error('초기화 실패:', error);
            window.Utils.showError('애플리케이션 초기화에 실패했습니다.');
        }
    }

    /**
     * 제스처 초기화
     */
    function initGestures() {
        console.log('제스처 시스템 초기화 중...');

        // 자동으로 디바이스 타입 감지하여 적절한 제스처 활성화
        window.GestureManager.initAllGestures();
    }

    /**
     * 이벤트 리스너 등록
     */
    function registerEventListeners() {
        console.log('이벤트 리스너 등록 중...');

        // StateManager 이벤트 리스너
        window.StateManager.addEventListener('levelChange', handleLevelChange);
        window.StateManager.addEventListener('textChange', handleTextChange);
        window.StateManager.addEventListener('animationStateChange', handleAnimationStateChange);

        console.log('✓ 이벤트 리스너 등록 완료');
    }

    /**
     * 초기 텍스트 로드
     */
    async function loadInitialText() {
        console.log('초기 텍스트 로딩 중...');
        window.Utils.showLoading('example.txt 로딩 중...');

        try {
            // example.txt 가져오기
            const response = await window.Utils.fetchExampleText();

            if (!response || !response.success || !response.data || !response.data.text) {
                throw new Error('텍스트 데이터를 가져올 수 없습니다.');
            }

            const originalText = response.data.text;
            console.log(`원문 로드 완료: ${originalText.length}자`);

            // StateManager에 원문 저장
            window.StateManager.setOriginalText(originalText);

            // 화면에 원문 표시
            displayText(originalText, 0);

            // 요약 생성 (백그라운드)
            generateSummaries(originalText);

        } catch (error) {
            console.error('텍스트 로딩 실패:', error);
            window.Utils.showError('텍스트를 로드할 수 없습니다: ' + error.message);
        } finally {
            window.Utils.hideLoading();
        }
    }

    /**
     * 요약 생성 (모든 레벨)
     *
     * @param {string} originalText - 원문 텍스트
     */
    async function generateSummaries(originalText) {
        console.log('요약 생성 시작...');
        window.Utils.showLoading('요약 생성 중... (Level 1-3)');

        try {
            // 요약 생성 API 호출
            const response = await window.Utils.fetchSummary(originalText, AppConfig.useCache);

            if (!response || !response.success || !response.data) {
                throw new Error('요약 생성 결과가 올바르지 않습니다.');
            }

            console.log('요약 생성 완료:', response.data);

            // StateManager에 각 레벨 저장
            const data = response.data;
            if (data.level1) {
                window.StateManager.setText(1, data.level1.text, data.level1.metadata);
            }
            if (data.level2) {
                window.StateManager.setText(2, data.level2.text, data.level2.metadata);
            }
            if (data.level3) {
                window.StateManager.setText(3, data.level3.text, data.level3.metadata);
            }

            // 통계 업데이트
            updateStatistics(0);

            window.Utils.showSuccess('요약 생성이 완료되었습니다!');

        } catch (error) {
            console.error('요약 생성 실패:', error);
            window.Utils.showError('요약 생성에 실패했습니다: ' + error.message);
        } finally {
            window.Utils.hideLoading();
        }
    }

    /**
     * 텍스트 화면에 표시
     *
     * @param {string} text - 표시할 텍스트
     * @param {number} level - 현재 레벨
     */
    function displayText(text, level) {
        const container = document.getElementById('text-content');

        if (!container) {
            console.error('텍스트 컨테이너를 찾을 수 없습니다.');
            return;
        }

        // 기존 내용 삭제
        container.innerHTML = '';

        // 문단으로 분할 (빈 줄 기준)
        const paragraphs = text.split(/\n\s*\n/);
        const fragment = document.createDocumentFragment();
        let wordIndex = 0;

        paragraphs.forEach((paragraph, pIndex) => {
            if (paragraph.trim()) {
                // 문단 컨테이너 생성
                const pDiv = document.createElement('div');
                pDiv.className = 'paragraph';
                pDiv.style.marginBottom = '1em';

                // 단어 단위로 분할하여 표시
                const words = paragraph.split(/\s+/);
                words.forEach((word) => {
                    if (word.trim()) {
                        const span = document.createElement('span');
                        span.className = 'word word-transition';
                        span.textContent = word + ' ';
                        span.dataset.index = wordIndex;
                        pDiv.appendChild(span);
                        wordIndex++;
                    }
                });

                fragment.appendChild(pDiv);
            }
        });

        container.appendChild(fragment);

        console.log(`텍스트 표시 완료: Level ${level}, ${wordIndex}개 단어, ${paragraphs.length}개 문단`);
    }

    /**
     * UI 초기화
     */
    function initializeUI() {
        // 초기 레벨 UI 업데이트
        window.Utils.updateLevelUI(0);

        // 버튼 상태 업데이트
        window.GestureManager._updateButtonStates(0);
    }

    /**
     * 레벨 변경 이벤트 핸들러
     *
     * @param {object} event - 이벤트 데이터 { oldLevel, newLevel }
     */
    async function handleLevelChange(event) {
        const { oldLevel, newLevel } = event;

        console.log(`레벨 변경 이벤트: ${oldLevel} → ${newLevel}`);

        // 새 레벨 텍스트 가져오기
        let newText = window.StateManager.getText(newLevel);

        // 텍스트가 없으면 서버에서 가져오기
        if (!newText) {
            console.log(`Level ${newLevel} 텍스트가 없습니다. 서버에서 가져옵니다...`);
            window.Utils.showLoading(`Level ${newLevel} 로딩 중...`);

            try {
                const originalText = window.StateManager.getOriginalText();
                const response = await window.Utils.fetchTextLevel(newLevel, originalText);

                if (!response || !response.success || !response.data || !response.data.text) {
                    throw new Error('레벨 텍스트를 가져올 수 없습니다.');
                }

                newText = response.data.text;
                window.StateManager.setText(newLevel, newText, response.data.metadata);

            } catch (error) {
                console.error('레벨 텍스트 로딩 실패:', error);
                window.Utils.showError('텍스트를 로드할 수 없습니다.');
                window.Utils.hideLoading();
                return;
            } finally {
                window.Utils.hideLoading();
            }
        }

        // 레벨 전환 애니메이션 실행
        await transitionToLevel(oldLevel, newLevel);
    }

    /**
     * 서버 응답 데이터를 클라이언트 형식으로 변환
     *
     * 서버는 소문자로 정규화된 단어를 반환하므로,
     * 원본 텍스트의 실제 대소문자를 유지한 단어와 매칭해야 함
     *
     * @param {object} diffData - 서버에서 받은 차이 분석 데이터
     * @param {string} fromText - 원본 텍스트
     * @param {string} toText - 대상 텍스트
     * @returns {object} 변환된 차이 분석 데이터
     */
    function transformDiffData(diffData, fromText, toText) {
        // fromText와 toText를 단어로 분할 (원본 대소문자 유지)
        const fromWords = fromText.split(/\s+/).filter(w => w.trim());
        const toWords = toText.split(/\s+/).filter(w => w.trim());

        console.log(`변환 시작: fromWords=${fromWords.length}개, toWords=${toWords.length}개`);
        console.log('원본 diffData:', diffData);

        // 변환된 데이터를 저장할 객체
        const transformed = {
            kept: [],
            removed: [],
            added: [],
            morphed: []
        };

        // toText 기준으로 매칭 (새 텍스트에 실제로 존재하는 단어만 kept/added로 분류)
        // 서버에서 받은 단어 개수를 카운트해서 정확히 그만큼만 매칭
        const usedToIndices = new Set();

        // kept 배열 변환 - toText 기준
        if (diffData.kept && Array.isArray(diffData.kept)) {
            console.log('서버에서 받은 kept 단어 샘플 (첫 5개):', diffData.kept.slice(0, 5));
            console.log('클라이언트 toWords 샘플 (첫 5개):', toWords.slice(0, 5));

            // 서버 kept 단어별 개수 카운트
            const keptWordCounts = {};
            diffData.kept.forEach(w => {
                const word = (typeof w === 'string' ? w : w.word || '').toLowerCase();
                keptWordCounts[word] = (keptWordCounts[word] || 0) + 1;
            });

            // toText의 각 단어를 개수만큼만 매칭
            toWords.forEach((word, index) => {
                const lowerWord = word.toLowerCase();
                if (keptWordCounts[lowerWord] > 0 && !usedToIndices.has(index)) {
                    transformed.kept.push({ word: word, index: index });
                    usedToIndices.add(index);
                    keptWordCounts[lowerWord]--;  // 사용한 개수 감소
                }
            });

            console.log(`kept 변환: ${diffData.kept.length}개 → ${transformed.kept.length}개`);
        }

        // added 배열 변환 - toText 기준
        if (diffData.added && Array.isArray(diffData.added)) {
            // 서버 added 단어별 개수 카운트
            const addedWordCounts = {};
            diffData.added.forEach(w => {
                const word = (typeof w === 'string' ? w : w.word || '').toLowerCase();
                addedWordCounts[word] = (addedWordCounts[word] || 0) + 1;
            });

            // toText의 각 단어를 개수만큼만 매칭 (kept에서 사용 안 된 것만)
            toWords.forEach((word, index) => {
                const lowerWord = word.toLowerCase();
                if (addedWordCounts[lowerWord] > 0 && !usedToIndices.has(index)) {
                    transformed.added.push({ word: word, index: index });
                    usedToIndices.add(index);
                    addedWordCounts[lowerWord]--;  // 사용한 개수 감소
                }
            });

            console.log(`added 변환: ${diffData.added.length}개 → ${transformed.added.length}개`);
        }

        // removed 배열 변환 - fromText 기준 (removed는 fromText에만 존재)
        if (diffData.removed && Array.isArray(diffData.removed)) {
            // 서버 removed 단어별 개수 카운트
            const removedWordCounts = {};
            diffData.removed.forEach(w => {
                const word = (typeof w === 'string' ? w : w.word || '').toLowerCase();
                removedWordCounts[word] = (removedWordCounts[word] || 0) + 1;
            });

            const usedFromIndices = new Set();

            fromWords.forEach((word, index) => {
                const lowerWord = word.toLowerCase();
                if (removedWordCounts[lowerWord] > 0 && !usedFromIndices.has(index)) {
                    transformed.removed.push({ word: word, index: index });
                    usedFromIndices.add(index);
                    removedWordCounts[lowerWord]--;  // 사용한 개수 감소
                }
            });

            console.log(`removed 변환: ${diffData.removed.length}개 → ${transformed.removed.length}개`);
        }

        // morphed 배열 변환
        if (diffData.morphed && Array.isArray(diffData.morphed)) {
            diffData.morphed.forEach(morph => {
                // morph가 객체가 아니면 건너뛰기
                if (typeof morph !== 'object' || morph === null) return;

                // 서버 응답 형식: {source, target, similarity}
                const sourceWordLower = (morph.source || '').toLowerCase();
                const targetWordLower = (morph.target || '').toLowerCase();
                const similarity = morph.similarity || 0;

                if (!sourceWordLower || !targetWordLower) return;

                // fromWords에서 source 찾기
                const fromIdx = fromWords.findIndex(w => w.toLowerCase() === sourceWordLower);

                // toWords에서 target 찾기
                const toIdx = toWords.findIndex(w => w.toLowerCase() === targetWordLower);

                if (fromIdx >= 0 && toIdx >= 0) {
                    transformed.morphed.push({
                        from: { word: fromWords[fromIdx], index: fromIdx },
                        to: { word: toWords[toIdx], index: toIdx },
                        similarity: similarity
                    });
                }
            });

            console.log(`morphed 변환: ${diffData.morphed.length}개 → ${transformed.morphed.length}개`);
        }

        console.log('변환 완료:', transformed);
        return transformed;
    }

    /**
     * 레벨 전환 애니메이션 실행
     *
     * @param {number} fromLevel - 시작 레벨
     * @param {number} toLevel - 목표 레벨
     */
    async function transitionToLevel(fromLevel, toLevel) {
        console.log(`레벨 전환 시작: ${fromLevel} → ${toLevel}`);

        const container = document.getElementById('text-container');
        const textContent = document.getElementById('text-content');

        if (!container || !textContent) {
            console.error('컨테이너를 찾을 수 없습니다.');
            return;
        }

        try {
            // 차이 분석 가져오기
            const fromText = window.StateManager.getText(fromLevel);
            const toText = window.StateManager.getText(toLevel);

            const diffResponse = await window.Utils.fetchTransitionDiff(fromText, toText, false);

            if (!diffResponse || !diffResponse.success || !diffResponse.data) {
                throw new Error('차이 분석 실패');
            }

            let diffData = diffResponse.data;
            console.log('차이 분석 원본:', diffData);

            // 데이터 변환: 단어 배열을 {word, index} 객체 배열로 변환
            diffData = transformDiffData(diffData, fromText, toText);
            console.log('차이 분석 변환 후:', diffData);

            // 타임라인 생성
            const timeline = window.Animator.createTimeline(fromLevel, toLevel, diffData);

            if (!timeline) {
                throw new Error('타임라인 생성 실패');
            }

            // 통일된 애니메이션 플로우 (레벨 간격과 관계없이 애니메이션 실행)
            // Zoom In/Out 모두 동일: 텍스트 교체 → 단일 애니메이션 실행
            console.log(`${timeline.direction === 'out' ? 'Zoom Out' : 'Zoom In'}: 텍스트 교체 → 애니메이션`);

            // Phase 0: 사라지는 단어에 짧은 fade out (removed가 있을 때만)
            if (diffData.removed && diffData.removed.length > 0) {
                console.log(`사라지는 단어 fade out: ${diffData.removed.length}개`);
                await new Promise(resolve => {
                    gsap.to(textContent, {
                        opacity: 0.3,
                        duration: 0.15,
                        ease: 'power1.out',
                        onComplete: resolve
                    });
                });
            }

            // Phase 1: 새 텍스트로 교체
            displayText(toText, toLevel);

            // Phase 1.5: fade in (removed가 있었다면)
            if (diffData.removed && diffData.removed.length > 0) {
                gsap.set(textContent, { opacity: 1 });
            }

            // Phase 2: 애니메이션 실행 (새 toText 기준)
            // animator.js가 direction에 따라 자동으로 적절한 효과 적용
            await window.Animator.executeTimeline(timeline, textContent);

            // 통계 업데이트
            updateStatistics(toLevel);

            console.log('레벨 전환 완료');

        } catch (error) {
            console.error('레벨 전환 오류:', error);
            window.Utils.showError('레벨 전환에 실패했습니다.');

            // Fallback: 텍스트 직접 교체
            const toText = window.StateManager.getText(toLevel);
            if (toText) {
                displayText(toText, toLevel);
                updateStatistics(toLevel);
            }
        }
    }

    /**
     * 통계 업데이트
     *
     * @param {number} level - 현재 레벨
     */
    function updateStatistics(level) {
        const text = window.StateManager.getText(level);
        const originalText = window.StateManager.getOriginalText();

        if (!text) {
            return;
        }

        // 텍스트 통계 계산
        const stats = window.Utils.calculateTextStats(text);

        // 압축률 계산
        if (originalText && level > 0) {
            const originalStats = window.Utils.calculateTextStats(originalText);
            stats.compressionRate = stats.wordCount / originalStats.wordCount;
        }

        // UI 업데이트
        window.Utils.updateStatsUI(stats);

        console.log(`통계 업데이트 (Level ${level}):`, stats);
    }

    /**
     * 텍스트 변경 이벤트 핸들러
     *
     * @param {object} event - 이벤트 데이터 { level, text, metadata }
     */
    function handleTextChange(event) {
        const { level, text, metadata } = event;

        console.log(`텍스트 변경 이벤트: Level ${level} (${text.length}자)`);

        // 현재 레벨이면 화면 업데이트
        if (level === window.StateManager.getLevel()) {
            displayText(text, level);
            updateStatistics(level);
        }
    }

    /**
     * 애니메이션 상태 변경 이벤트 핸들러
     *
     * @param {object} event - 이벤트 데이터 { isAnimating }
     */
    function handleAnimationStateChange(event) {
        const { isAnimating } = event;

        console.log(`애니메이션 상태 변경: ${isAnimating}`);

        // UI 피드백 (필요시)
        if (isAnimating) {
            document.body.classList.add('animating');
        } else {
            document.body.classList.remove('animating');
        }
    }

    /**
     * 캐시 통계 표시 (디버깅용)
     */
    async function showCacheStats() {
        try {
            const stats = await window.Utils.fetchCacheStats();
            console.log('캐시 통계:', stats);

            alert(`캐시 통계\n\n` +
                  `히트: ${stats.hits}\n` +
                  `미스: ${stats.misses}\n` +
                  `히트율: ${(stats.hitRate * 100).toFixed(1)}%\n` +
                  `항목 수: ${stats.keys}`);

        } catch (error) {
            console.error('캐시 통계 조회 실패:', error);
        }
    }

    /**
     * 캐시 초기화 (디버깅용)
     */
    async function clearCache() {
        try {
            await window.Utils.clearServerCache();
            window.StateManager.clearCache();
            window.Utils.showSuccess('캐시가 초기화되었습니다.');
            console.log('캐시 초기화 완료');

        } catch (error) {
            console.error('캐시 초기화 실패:', error);
            window.Utils.showError('캐시 초기화에 실패했습니다.');
        }
    }

    /**
     * 애플리케이션 정리 (cleanup)
     */
    function cleanup() {
        console.log('애플리케이션 정리 중...');

        // 제스처 이벤트 제거
        window.GestureManager.cleanup();

        // StateManager 리스너 제거
        window.StateManager.removeEventListener('levelChange', handleLevelChange);
        window.StateManager.removeEventListener('textChange', handleTextChange);
        window.StateManager.removeEventListener('animationStateChange', handleAnimationStateChange);

        // 애니메이션 중단
        window.Animator.stopAnimation();

        // 상태 초기화
        window.StateManager.resetState();

        console.log('✓ 애플리케이션 정리 완료');
    }

    // DOM 로드 완료 시 자동 초기화
    if (AppConfig.autoInit) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            // 이미 로드된 경우 즉시 실행
            init();
        }
    }

    // 페이지 종료 시 정리
    window.addEventListener('beforeunload', cleanup);

    // 전역 객체로 내보내기
    window.App = {
        init,
        cleanup,
        config: AppConfig,
        // 유틸리티 함수
        showCacheStats,
        clearCache,
        // 내부 함수 (테스트/디버깅용)
        _displayText: displayText,
        _transitionToLevel: transitionToLevel,
        _updateStatistics: updateStatistics
    };

    console.log('✓ App 모듈 로드 완료');

})(window);
