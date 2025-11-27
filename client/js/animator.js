/**
 * 애니메이션 엔진 모듈 (GSAP 기반)
 *
 * 레벨 간 텍스트 전환 애니메이션을 관리합니다.
 * - 사라지는 단어: 페이드아웃 + 스케일 축소 + 회전
 * - 추가되는 단어: 페이드인 + 스케일 확대 + 바운스
 * - 유지되는 단어: 하이라이트 펄스 효과
 */

(function(window) {
    'use strict';

    /**
     * 애니메이션 설정
     */
    const AnimationConfig = {
        // 애니메이션 타이밍
        timing: {
            // 단어별 애니메이션 시간
            word: {
                duration: 0.5,
                ease: 'power2.inOut'
            },
            // 스태거 (순차 지연)
            stagger: {
                amount: 0.4,  // 전체 스태거 시간
                from: 'random'  // 랜덤 순서로 애니메이션
            },
            // Blink 효과
            blink: {
                duration: 0.15,  // 깜빡임 시간
                repeat: 0  // 깜빡임 횟수 (0 = 1회만)
            }
        },

        // 최대 애니메이션 시간 (초)
        maxAnimationTime: 1.0,

        // 성능 최적화 설정
        performance: {
            // 뷰포트 기반 필터링
            onlyAnimateInViewport: true,
            viewportMargin: 200,  // 뷰포트 위아래 여유 (px)

            // 샘플링 설정
            samplingEnabled: true,   // 샘플링 활성화
            samplingRates: {
                // Level 0 ↔ 1: 50% 샘플링 (대량 전환)
                large: 0.5,
                // Level 1 ↔ 2, 2 ↔ 3: 100% (전체 애니메이션)
                normal: 1.0
            },

            // 대량 전환 임계값
            largeTransitionThreshold: 3000  // 단어 3000개 이상이면 대량 전환
        },

        // 애니메이션 효과 강도
        effects: {
            // 모든 색상 효과 제거 (대각선 애니메이션만 사용)
        },

        // 디버그 모드
        debug: false
    };

    /**
     * 애니메이션 상태
     */
    const AnimationState = {
        isRunning: false,
        currentTimeline: null,
        gsapTimeline: null,
        progress: 0
    };


    /**
     * 타임라인 생성
     *
     * @param {number} fromLevel - 시작 레벨
     * @param {number} toLevel - 목표 레벨
     * @param {object} diffData - 단어 차이 분석 데이터
     * @returns {object} 애니메이션 타임라인
     */
    function createTimeline(fromLevel, toLevel, diffData) {
        console.log(`타임라인 생성: Level ${fromLevel} → Level ${toLevel}`);

        if (!diffData) {
            console.error('차이 분석 데이터가 없습니다.');
            return null;
        }

        const timeline = {
            fromLevel,
            toLevel,
            direction: toLevel > fromLevel ? 'out' : 'in',  // out: 축소, in: 확대
            diffData
        };

        console.log('차이 분석 데이터:', diffData);

        return timeline;
    }

    /**
     * 뷰포트 내에 있는 단어만 필터링 + 샘플링
     *
     * @param {Array} wordIndices - 단어 인덱스 배열
     * @param {NodeList} allWords - 모든 단어 요소
     * @param {number} samplingRate - 샘플링 비율 (0-1, 예: 0.5 = 50%)
     * @returns {Array} 필터링된 단어 인덱스
     */
    function filterAndSampleWords(wordIndices, allWords, samplingRate = 1.0) {
        const { performance } = AnimationConfig;
        let filteredIndices = wordIndices;

        // 1단계: 뷰포트 필터링
        if (performance.onlyAnimateInViewport) {
            const viewportTop = window.scrollY - performance.viewportMargin;
            const viewportBottom = window.scrollY + window.innerHeight + performance.viewportMargin;

            filteredIndices = wordIndices.filter(index => {
                const wordElement = allWords[index];
                if (!wordElement) return false;

                const rect = wordElement.getBoundingClientRect();
                const wordTop = rect.top + window.scrollY;
                const wordBottom = wordTop + rect.height;

                return wordBottom >= viewportTop && wordTop <= viewportBottom;
            });
        }

        // 2단계: 샘플링 (비율에 따라 랜덤 선택)
        if (performance.samplingEnabled && samplingRate < 1.0) {
            const targetCount = Math.floor(filteredIndices.length * samplingRate);
            const shuffled = [...filteredIndices].sort(() => Math.random() - 0.5);
            filteredIndices = shuffled.slice(0, targetCount);

            console.log(`샘플링 (${(samplingRate * 100).toFixed(0)}%): ${wordIndices.length}개 → ${filteredIndices.length}개`);
        }

        return filteredIndices;
    }

    /**
     * 대량 전환 여부 확인 (Level 0 ↔ 1 등)
     *
     * @param {object} diffData - 차이 분석 데이터
     * @returns {boolean} 대량 전환 여부
     */
    function isLargeTransition(diffData) {
        const { performance } = AnimationConfig;
        const totalWords = (diffData.added?.length || 0) + (diffData.kept?.length || 0);

        return totalWords >= performance.largeTransitionThreshold;
    }

    /**
     * 랜덤 대각선 방향 가져오기 (단어 추가 시 진입 방향)
     * 더 먼 거리에서 날아오도록 설정
     *
     * @returns {object} {x, y} 좌표
     */
    function getRandomDiagonal() {
        const directions = [
            { x: -200, y: -200 },  // 11시 방향 (왼쪽 위, 먼 거리)
            { x: 200, y: -200 },   // 1시 방향 (오른쪽 위, 먼 거리)
            { x: 200, y: 200 },    // 5시 방향 (오른쪽 아래, 먼 거리)
            { x: -200, y: 200 }    // 7시 방향 (왼쪽 아래, 먼 거리)
        ];
        // 거리에 랜덤 변동 추가 (200~250px)
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const randomScale = 1.0 + Math.random() * 0.25;  // 1.0 ~ 1.25
        return {
            x: dir.x * randomScale,
            y: dir.y * randomScale
        };
    }

    /**
     * 타임라인 실행 (단어 단위 애니메이션)
     *
     * @param {object} timeline - 실행할 타임라인
     * @param {HTMLElement} container - 텍스트 컨테이너
     * @returns {Promise} 애니메이션 완료 Promise
     */
    async function executeTimeline(timeline, container) {
        if (!timeline || !container) {
            return Promise.reject(new Error('Invalid timeline or container'));
        }

        // 상태 업데이트
        AnimationState.isRunning = true;
        AnimationState.currentTimeline = timeline;
        AnimationState.progress = 0;
        window.StateManager.setAnimating(true);

        const textContainer = document.getElementById('text-container');
        if (!textContainer) {
            onAnimationComplete(timeline, container);
            return Promise.reject(new Error('Text container not found'));
        }

        const { diffData, direction } = timeline;
        const allWords = container.querySelectorAll('.word');

        // 샘플링 비율 결정
        const { performance } = AnimationConfig;
        const isZoomOut = direction === 'out';  // 요약 방향 (레벨 증가)

        // 요약 방향(0→1)에서는 kept 단어도 애니메이션하므로 샘플링 조정
        let addedSamplingRate = 1.0;
        let keptSamplingRate = 0.0;  // 기본적으로 kept는 애니메이션 안함

        if (isLargeTransition(diffData)) {
            if (isZoomOut) {
                // 요약 방향: kept도 애니메이션 (70% 샘플링)
                addedSamplingRate = 1.0;  // added는 모두
                keptSamplingRate = 0.7;   // kept의 70%
                console.log(`요약 방향 대량 전환: added 100%, kept 70% 샘플링`);
            } else {
                // 원문 방향: added만 샘플링
                addedSamplingRate = performance.samplingRates.large;  // 50%
                keptSamplingRate = 0.0;
                console.log(`원문 방향 대량 전환: added ${(addedSamplingRate * 100)}% 샘플링`);
            }
        }

        return new Promise((resolve) => {
            const { word, stagger, blink } = AnimationConfig.timing;

            // 전체 애니메이션 단어 수 계산
            const totalAnimatedWords = (diffData.added?.length || 0) + (diffData.kept?.length || 0) + (diffData.removed?.length || 0);

            // 단어 개수에 비례한 duration 조정
            const durationMultiplier = Math.max(0.3, Math.min(1.0, totalAnimatedWords / 100));
            const adjustedStaggerAmount = stagger.amount * durationMultiplier;

            console.log(`애니메이션 단어 수: ${totalAnimatedWords}개, duration 배율: ${durationMultiplier.toFixed(2)}x`);
            console.log(`전환 방향: ${direction} (${direction === 'out' ? 'Zoom Out' : 'Zoom In'})`);

            // GSAP 타임라인 생성
            const tl = gsap.timeline({
                onComplete: () => {
                    requestAnimationFrame(() => {
                        onAnimationComplete(timeline, container);
                        resolve();
                    });
                }
            });

            // ============================================================
            // 1. 추가되는 단어 애니메이션 (대각선 진입 효과)
            // Zoom In(3→0)뿐만 아니라 Zoom Out(0→1)에서도 새 단어가 추가될 수 있음
            // ============================================================
            if (diffData.added && diffData.added.length > 0) {
                const addedIndices = diffData.added.map(item => item.index);
                const filteredIndices = filterAndSampleWords(addedIndices, allWords, addedSamplingRate);
                const addedWords = filteredIndices.map(i => allWords[i]).filter(Boolean);

                console.log(`추가 단어 애니메이션: ${diffData.added.length}개 → ${addedWords.length}개`);

                if (addedWords.length > 0) {
                    // Phase 1: 초기 상태 설정 (각 단어마다 랜덤 대각선 위치, 매우 작은 크기, 투명)
                    addedWords.forEach((word) => {
                        const dir = getRandomDiagonal();  // 각 단어마다 랜덤 방향 + 거리
                        gsap.set(word, {
                            opacity: 0,
                            scale: 0.1,  // 매우 작게 시작 (0.3 → 0.1)
                            x: dir.x,
                            y: dir.y,
                            transformOrigin: 'center center',
                            filter: 'blur(3px)'  // 시작 시 흐릿하게
                        });
                    });

                    // Phase 2: 날아오기 + 확대 + 페이드인 (위→아래 순서, 다이나믹한 애니메이션)
                    tl.to(addedWords, {
                        opacity: 1,
                        scale: 1,
                        x: 0,
                        y: 0,
                        filter: 'blur(0px)',  // 선명하게
                        duration: 0.7,  // 더 긴 duration (0.5 → 0.7)
                        ease: 'back.out(2.0)',  // 강한 오버슈팅 효과 (1.4 → 2.0)
                        stagger: {
                            amount: adjustedStaggerAmount,
                            from: 'start'  // 위→아래 순서
                        }
                    }, 0);

                    // Phase 3: 초록색 Blink 효과 제거 (대각선 애니메이션만으로 충분)
                }
            }

            // ============================================================
            // 1-1. 유지되는 단어 애니메이션 (요약 방향일 때만)
            // 요약 방향에서 더 많은 단어가 애니메이션되도록 kept에도 효과 추가
            // ============================================================
            if (isZoomOut && diffData.kept && diffData.kept.length > 0 && keptSamplingRate > 0) {
                const keptIndices = diffData.kept.map(item => item.index);
                const filteredIndices = filterAndSampleWords(keptIndices, allWords, keptSamplingRate);
                const keptWords = filteredIndices.map(i => allWords[i]).filter(Boolean);

                console.log(`유지 단어 애니메이션 (요약 방향): ${diffData.kept.length}개 → ${keptWords.length}개`);

                if (keptWords.length > 0) {
                    // Subtle pulse 효과 (덜 dramatic하게)
                    tl.fromTo(keptWords, {
                        scale: 1,
                        opacity: 1
                    }, {
                        scale: 1.03,  // 아주 subtle한 확대
                        opacity: 0.85,
                        duration: 0.2,
                        ease: 'power1.inOut',
                        stagger: {
                            amount: adjustedStaggerAmount * 0.5,
                            from: 'start'
                        },
                        yoyo: true,  // 되돌아오기
                        repeat: 1    // 1회 반복 (총 2번 실행)
                    }, 0);
                }
            }

            // ============================================================
            // 2. 사라지는 단어 애니메이션 (Fade Out)
            // ============================================================
            if (diffData.removed && diffData.removed.length > 0) {
                const removedIndices = diffData.removed.map(item => item.index);
                // removed는 fromLevel 텍스트 기준이므로, 현재 표시된 allWords가 아닌 이전 단어들을 참조
                // 하지만 실제 DOM에는 toLevel 텍스트가 렌더링되므로, removed 애니메이션은 불가능
                // 대신 레벨 전환 시점에 짧은 fade out을 전체 컨테이너에 적용
                console.log(`사라지는 단어: ${diffData.removed.length}개 (fade out 적용)`);
            }

            // ============================================================
            // 3. 치환되는 단어 애니메이션 (Morph)
            // ============================================================
            if (diffData.morphed && diffData.morphed.length > 0) {
                console.log(`치환 단어 애니메이션: ${diffData.morphed.length}개`);

                diffData.morphed.forEach(morph => {
                    const fromWord = allWords[morph.from.index];
                    const toWord = allWords[morph.to.index];

                    if (fromWord && toWord) {
                        // Phase 1: 기존 단어 회전 + 페이드아웃
                        tl.to(fromWord, {
                            opacity: 0,
                            rotationY: 90,
                            scale: 0.8,
                            duration: 0.15,
                            ease: 'power2.in'
                        }, 0);

                        // Phase 2: 새 단어 회전 + 페이드인
                        tl.fromTo(toWord, {
                            opacity: 0,
                            rotationY: -90,
                            scale: 0.8
                        }, {
                            opacity: 1,
                            rotationY: 0,
                            scale: 1,
                            duration: 0.15,
                            ease: 'power2.out'
                        }, '-=0.05');
                    }
                });
            }

            AnimationState.gsapTimeline = tl;
        });
    }



    /**
     * 애니메이션 완료 처리
     *
     * @param {object} timeline - 타임라인
     * @param {HTMLElement} container - 컨테이너
     */
    function onAnimationComplete(timeline, container) {
        console.log('애니메이션 완료');

        // 모든 단어의 인라인 스타일 제거
        const words = container.querySelectorAll('.word');
        words.forEach(word => {
            word.style.color = '';
            word.style.backgroundColor = '';
            word.style.fontWeight = '';
            word.style.transform = '';
            word.style.filter = '';
            word.style.opacity = '';
            word.style.scale = '';
        });

        // 상태 업데이트
        AnimationState.isRunning = false;
        AnimationState.currentTimeline = null;
        AnimationState.gsapTimeline = null;
        AnimationState.progress = 1.0;
        window.StateManager.setAnimating(false);
    }

    /**
     * 뷰포트 앵커 설정 (애니메이션 전)
     *
     * @param {HTMLElement} container - 텍스트 컨테이너
     */
    function captureViewportAnchor(container) {
        if (!container) {
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        // 뷰포트 중앙에 가장 가까운 단어 찾기
        const words = container.querySelectorAll('.word');
        let closestWord = null;
        let closestDistance = Infinity;

        words.forEach(word => {
            const rect = word.getBoundingClientRect();
            const wordCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            const distance = Math.sqrt(
                Math.pow(wordCenter.x - viewportCenter.x, 2) +
                Math.pow(wordCenter.y - viewportCenter.y, 2)
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                closestWord = word;
            }
        });

        if (closestWord) {
            const wordText = closestWord.textContent.trim();
            const wordRect = closestWord.getBoundingClientRect();
            const offset = wordRect.top - containerRect.top;

            window.StateManager.setViewportAnchor(wordText, offset);

            console.log(`뷰포트 앵커 설정: "${wordText}" (offset: ${offset.toFixed(2)}px)`);
        }
    }

    /**
     * 뷰포트 위치 복원 (애니메이션 후)
     *
     * @param {HTMLElement} container - 텍스트 컨테이너
     */
    function restoreViewportPosition(container) {
        // 애니메이션 완료 후 스크롤 위치는 자동으로 유지되므로 별도 처리 불필요
        // 필요시 앵커 기반 복원 로직 추가 가능
    }

    /**
     * 스크롤 위치를 퍼센트로 저장
     *
     * @param {HTMLElement} container - 컨테이너
     * @returns {number} 스크롤 퍼센트 (0-1)
     */
    function captureScrollPercent(container) {
        if (!container) {
            return 0;
        }

        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight - container.clientHeight;

        return scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    }

    /**
     * 스크롤 위치를 퍼센트로 복원
     *
     * @param {HTMLElement} container - 컨테이너
     * @param {number} percent - 스크롤 퍼센트 (0-1)
     */
    function restoreScrollPercent(container, percent) {
        if (!container) {
            return;
        }

        const scrollHeight = container.scrollHeight - container.clientHeight;
        container.scrollTop = scrollHeight * percent;
    }

    /**
     * 애니메이션 중단
     */
    function stopAnimation() {
        if (!AnimationState.isRunning) {
            return;
        }

        console.log('애니메이션 중단');

        // GSAP 타임라인 중단
        if (AnimationState.gsapTimeline) {
            AnimationState.gsapTimeline.kill();
        }

        AnimationState.isRunning = false;
        AnimationState.currentTimeline = null;
        AnimationState.gsapTimeline = null;
        AnimationState.progress = 0;
        window.StateManager.setAnimating(false);
    }

    /**
     * 애니메이션 진행률 가져오기
     *
     * @returns {number} 진행률 (0-1)
     */
    function getProgress() {
        return AnimationState.progress;
    }

    /**
     * 애니메이션 실행 중 여부
     *
     * @returns {boolean} 실행 중 여부
     */
    function isAnimating() {
        return AnimationState.isRunning;
    }

    // 전역 객체로 내보내기
    window.Animator = {
        createTimeline,
        executeTimeline,
        stopAnimation,
        getProgress,
        isAnimating,
        captureViewportAnchor,
        restoreViewportPosition,
        captureScrollPercent,
        restoreScrollPercent,
        // 설정
        config: AnimationConfig
    };

    console.log('✓ Animator 모듈 로드 완료 (GSAP 기반)');

})(window);
