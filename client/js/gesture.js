/**
 * 제스처 인식 모듈
 *
 * 데스크톱(버튼, 슬라이더)과 모바일(핀치 제스처) 입력을 처리합니다.
 */

(function(window) {
    'use strict';

    /**
     * 제스처 설정
     */
    const GestureConfig = {
        // 핀치 제스처 설정
        pinch: {
            minScale: 0.5,      // 최소 스케일 (Level 3)
            maxScale: 2.0,      // 최대 스케일 (Level 0)
            threshold: 0.15,    // 레벨 변경 임계값
            debounceTime: 100   // 디바운스 시간 (ms)
        },

        // 버튼 클릭 설정
        button: {
            cooldown: 300       // 버튼 재클릭 방지 시간 (ms)
        },

        // 슬라이더 설정
        slider: {
            debounceTime: 150   // 슬라이더 디바운스 시간 (ms)
        }
    };

    /**
     * 제스처 상태
     */
    const GestureState = {
        // 핀치 제스처 상태
        isPinching: false,
        initialDistance: 0,
        currentScale: 1.0,
        lastLevel: 0,

        // 포인터 추적
        pointers: new Map(),

        // 버튼 상태
        buttonCooldown: false,

        // 이벤트 핸들러 참조 (cleanup용)
        handlers: {}
    };

    /**
     * 데스크톱 버튼 제스처 초기화
     */
    function initButtonGestures() {
        const levelUpBtn = document.getElementById('level-btn-up');
        const levelDownBtn = document.getElementById('level-btn-down');

        if (!levelUpBtn || !levelDownBtn) {
            console.warn('레벨 버튼을 찾을 수 없습니다. (+ / - 버튼)');
            return;
        }

        // + 버튼 (레벨 증가: 0 → 3)
        const handleLevelUp = () => {
            if (GestureState.buttonCooldown) {
                return;
            }

            const currentLevel = window.StateManager.getLevel();
            const newLevel = Math.min(3, currentLevel + 1);

            if (newLevel !== currentLevel) {
                changeLevelWithAnimation(newLevel);
                setButtonCooldown();
            }
        };

        // - 버튼 (레벨 감소: 3 → 0)
        const handleLevelDown = () => {
            if (GestureState.buttonCooldown) {
                return;
            }

            const currentLevel = window.StateManager.getLevel();
            const newLevel = Math.max(0, currentLevel - 1);

            if (newLevel !== currentLevel) {
                changeLevelWithAnimation(newLevel);
                setButtonCooldown();
            }
        };

        // 이벤트 리스너 등록
        levelUpBtn.addEventListener('click', handleLevelUp);
        levelDownBtn.addEventListener('click', handleLevelDown);

        // cleanup용 참조 저장
        GestureState.handlers.levelUp = handleLevelUp;
        GestureState.handlers.levelDown = handleLevelDown;

        console.log('✓ 버튼 제스처 초기화 완료 (+ / -)');
    }

    /**
     * 슬라이더 제스처 초기화
     */
    function initSliderGesture() {
        const slider = document.getElementById('level-range');

        if (!slider) {
            console.error('레벨 슬라이더를 찾을 수 없습니다.');
            return;
        }

        // 슬라이더 변경 핸들러 (디바운스 적용)
        const handleSliderChange = window.Utils.debounce((event) => {
            const newLevel = parseInt(event.target.value);
            const currentLevel = window.StateManager.getLevel();

            if (newLevel !== currentLevel) {
                changeLevelWithAnimation(newLevel);
            }
        }, GestureConfig.slider.debounceTime);

        // 슬라이더 입력 시 즉각 UI 업데이트 (애니메이션은 디바운스)
        const handleSliderInput = (event) => {
            const newLevel = parseInt(event.target.value);
            window.Utils.updateLevelUI(newLevel);
        };

        // 이벤트 리스너 등록
        slider.addEventListener('change', handleSliderChange);
        slider.addEventListener('input', handleSliderInput);

        // cleanup용 참조 저장
        GestureState.handlers.sliderChange = handleSliderChange;
        GestureState.handlers.sliderInput = handleSliderInput;

        console.log('✓ 슬라이더 제스처 초기화 완료');
    }

    /**
     * 버튼 재클릭 방지 타이머 설정
     */
    function setButtonCooldown() {
        GestureState.buttonCooldown = true;

        setTimeout(() => {
            GestureState.buttonCooldown = false;
        }, GestureConfig.button.cooldown);
    }

    /**
     * 레벨 변경 및 애니메이션 트리거
     *
     * @param {number} newLevel - 변경할 레벨 (0-3)
     */
    function changeLevelWithAnimation(newLevel) {
        // 애니메이션 중이면 무시
        if (window.StateManager.isAnimating()) {
            console.log('애니메이션 진행 중입니다.');
            return;
        }

        const currentLevel = window.StateManager.getLevel();

        // 레벨이 같으면 무시
        if (newLevel === currentLevel) {
            return;
        }

        console.log(`레벨 변경 요청: ${currentLevel} → ${newLevel}`);

        // StateManager에 레벨 변경 알림 (리스너가 애니메이션 트리거)
        window.StateManager.setLevel(newLevel);

        // UI 업데이트
        window.Utils.updateLevelUI(newLevel);

        // 버튼 상태 업데이트
        updateButtonStates(newLevel);
    }

    /**
     * 버튼 활성화/비활성화 상태 업데이트
     *
     * @param {number} level - 현재 레벨
     */
    function updateButtonStates(level) {
        const levelUpBtn = document.getElementById('level-btn-up');
        const levelDownBtn = document.getElementById('level-btn-down');

        if (!levelUpBtn || !levelDownBtn) {
            return;
        }

        // Level 3이면 + 버튼 비활성화 (더 이상 증가 불가)
        levelUpBtn.disabled = (level >= 3);

        // Level 0이면 - 버튼 비활성화 (더 이상 감소 불가)
        levelDownBtn.disabled = (level <= 0);
    }

    /**
     * 키보드 단축키 초기화 (선택 사항)
     */
    function initKeyboardShortcuts() {
        const handleKeyDown = (event) => {
            // Ctrl/Cmd 키와 함께 사용
            if (event.ctrlKey || event.metaKey) {
                if (event.key === '+' || event.key === '=') {
                    // Ctrl + '+': 확대 (레벨 감소)
                    event.preventDefault();
                    const currentLevel = window.StateManager.getLevel();
                    const newLevel = Math.max(0, currentLevel - 1);
                    if (newLevel !== currentLevel) {
                        changeLevelWithAnimation(newLevel);
                    }
                } else if (event.key === '-' || event.key === '_') {
                    // Ctrl + '-': 축소 (레벨 증가)
                    event.preventDefault();
                    const currentLevel = window.StateManager.getLevel();
                    const newLevel = Math.min(3, currentLevel + 1);
                    if (newLevel !== currentLevel) {
                        changeLevelWithAnimation(newLevel);
                    }
                }
            }

            // 숫자 키로 직접 레벨 선택 (0-3)
            if (['0', '1', '2', '3'].includes(event.key)) {
                const newLevel = parseInt(event.key);
                const currentLevel = window.StateManager.getLevel();
                if (newLevel !== currentLevel) {
                    changeLevelWithAnimation(newLevel);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        GestureState.handlers.keyDown = handleKeyDown;

        console.log('✓ 키보드 단축키 초기화 완료 (Ctrl +/-, 숫자 0-3)');
    }

    /**
     * 마우스 휠 제스처 초기화 (선택 사항)
     */
    function initWheelGesture() {
        const textContainer = document.getElementById('text-container');

        if (!textContainer) {
            console.error('텍스트 컨테이너를 찾을 수 없습니다.');
            return;
        }

        // 휠 이벤트 핸들러 (디바운스 적용)
        const handleWheel = window.Utils.debounce((event) => {
            // Ctrl/Cmd 키를 누른 상태에서만 작동
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();

                const currentLevel = window.StateManager.getLevel();
                let newLevel;

                if (event.deltaY < 0) {
                    // 휠 위로: 확대 (레벨 감소)
                    newLevel = Math.max(0, currentLevel - 1);
                } else {
                    // 휠 아래로: 축소 (레벨 증가)
                    newLevel = Math.min(3, currentLevel + 1);
                }

                if (newLevel !== currentLevel) {
                    changeLevelWithAnimation(newLevel);
                }
            }
        }, 100);

        textContainer.addEventListener('wheel', handleWheel, { passive: false });
        GestureState.handlers.wheel = handleWheel;

        console.log('✓ 마우스 휠 제스처 초기화 완료 (Ctrl + 휠)');
    }

    /**
     * 모바일 핀치 제스처 초기화
     */
    function initPinchGesture() {
        const textContainer = document.getElementById('text-container');

        if (!textContainer) {
            console.error('텍스트 컨테이너를 찾을 수 없습니다.');
            return;
        }

        // Pointer Events API 사용
        const handlePointerDown = (event) => {
            // 포인터 추가
            GestureState.pointers.set(event.pointerId, {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY
            });

            // 두 개의 포인터가 있으면 핀치 시작
            if (GestureState.pointers.size === 2) {
                startPinch();
            }
        };

        const handlePointerMove = (event) => {
            // 포인터 위치 업데이트
            if (GestureState.pointers.has(event.pointerId)) {
                GestureState.pointers.set(event.pointerId, {
                    id: event.pointerId,
                    x: event.clientX,
                    y: event.clientY
                });

                // 핀치 진행 중이면 스케일 업데이트
                if (GestureState.isPinching && GestureState.pointers.size === 2) {
                    updatePinch();
                }
            }
        };

        const handlePointerUp = (event) => {
            // 포인터 제거
            GestureState.pointers.delete(event.pointerId);

            // 핀치 종료
            if (GestureState.isPinching && GestureState.pointers.size < 2) {
                endPinch();
            }
        };

        const handlePointerCancel = (event) => {
            // 포인터 취소 시 제거
            GestureState.pointers.delete(event.pointerId);

            if (GestureState.isPinching && GestureState.pointers.size < 2) {
                endPinch();
            }
        };

        // 이벤트 리스너 등록
        textContainer.addEventListener('pointerdown', handlePointerDown);
        textContainer.addEventListener('pointermove', handlePointerMove);
        textContainer.addEventListener('pointerup', handlePointerUp);
        textContainer.addEventListener('pointercancel', handlePointerCancel);

        // cleanup용 참조 저장
        GestureState.handlers.pointerDown = handlePointerDown;
        GestureState.handlers.pointerMove = handlePointerMove;
        GestureState.handlers.pointerUp = handlePointerUp;
        GestureState.handlers.pointerCancel = handlePointerCancel;

        console.log('✓ 핀치 제스처 초기화 완료');
    }

    /**
     * 핀치 제스처 시작
     */
    function startPinch() {
        if (GestureState.pointers.size !== 2) {
            return;
        }

        const pointers = Array.from(GestureState.pointers.values());
        const distance = calculateDistance(pointers[0], pointers[1]);

        GestureState.isPinching = true;
        GestureState.initialDistance = distance;
        GestureState.currentScale = 1.0;
        GestureState.lastLevel = window.StateManager.getLevel();

        console.log(`핀치 시작: 초기 거리 = ${distance.toFixed(2)}px`);
    }

    /**
     * 핀치 제스처 업데이트
     */
    function updatePinch() {
        if (!GestureState.isPinching || GestureState.pointers.size !== 2) {
            return;
        }

        const pointers = Array.from(GestureState.pointers.values());
        const currentDistance = calculateDistance(pointers[0], pointers[1]);

        // 현재 스케일 계산
        const scale = currentDistance / GestureState.initialDistance;
        GestureState.currentScale = scale;

        // 스케일을 레벨로 변환
        const newLevel = scaleToLevel(scale);

        // 레벨이 변경되었으면 업데이트
        if (newLevel !== GestureState.lastLevel) {
            console.log(`핀치 업데이트: 스케일 = ${scale.toFixed(2)}, 레벨 = ${newLevel}`);

            // 디바운스를 위해 타이머 설정
            if (GestureState.pinchDebounceTimer) {
                clearTimeout(GestureState.pinchDebounceTimer);
            }

            GestureState.pinchDebounceTimer = setTimeout(() => {
                changeLevelWithAnimation(newLevel);
                GestureState.lastLevel = newLevel;
            }, GestureConfig.pinch.debounceTime);
        }
    }

    /**
     * 핀치 제스처 종료
     */
    function endPinch() {
        console.log(`핀치 종료: 최종 스케일 = ${GestureState.currentScale.toFixed(2)}`);

        // 디바운스 타이머 정리
        if (GestureState.pinchDebounceTimer) {
            clearTimeout(GestureState.pinchDebounceTimer);
            GestureState.pinchDebounceTimer = null;
        }

        // 상태 초기화
        GestureState.isPinching = false;
        GestureState.initialDistance = 0;
        GestureState.currentScale = 1.0;
        GestureState.pointers.clear();
    }

    /**
     * 두 포인터 간 거리 계산
     *
     * @param {object} p1 - 첫 번째 포인터
     * @param {object} p2 - 두 번째 포인터
     * @returns {number} 거리 (픽셀)
     */
    function calculateDistance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 스케일을 레벨로 변환
     *
     * 스케일 범위: 0.5 (축소) ~ 2.0 (확대)
     * 레벨 범위: 3 (요약) ~ 0 (원문)
     *
     * @param {number} scale - 현재 스케일
     * @returns {number} 레벨 (0-3)
     */
    function scaleToLevel(scale) {
        // 스케일 제한
        const clampedScale = Math.max(
            GestureConfig.pinch.minScale,
            Math.min(GestureConfig.pinch.maxScale, scale)
        );

        // 스케일을 0-1 범위로 정규화
        const normalized = (clampedScale - GestureConfig.pinch.minScale) /
                          (GestureConfig.pinch.maxScale - GestureConfig.pinch.minScale);

        // 0-1 범위를 3-0 레벨로 변환 (역방향)
        const rawLevel = 3 - (normalized * 3);

        // 임계값 적용하여 레벨 변경 결정
        const currentLevel = window.StateManager.getLevel();
        const levelDiff = Math.abs(rawLevel - currentLevel);

        if (levelDiff >= GestureConfig.pinch.threshold) {
            // 가장 가까운 정수 레벨로 반올림
            return Math.round(rawLevel);
        }

        // 임계값 미만이면 현재 레벨 유지
        return currentLevel;
    }

    /**
     * 레벨을 스케일로 변환 (역변환)
     *
     * @param {number} level - 레벨 (0-3)
     * @returns {number} 스케일
     */
    function levelToScale(level) {
        // 레벨 3-0을 정규화된 0-1로 변환
        const normalized = (3 - level) / 3;

        // 0-1을 스케일 범위로 변환
        return GestureConfig.pinch.minScale +
               (normalized * (GestureConfig.pinch.maxScale - GestureConfig.pinch.minScale));
    }

    /**
     * 데스크톱 제스처 전체 초기화
     */
    function initDesktopGestures() {
        initButtonGestures();
        initSliderGesture();
        initKeyboardShortcuts();
        initWheelGesture();

        console.log('✓ 데스크톱 제스처 초기화 완료');
    }

    /**
     * 모바일 제스처 전체 초기화
     */
    function initMobileGestures() {
        initPinchGesture();
        initSliderGesture();  // 슬라이더는 모바일에서도 사용 가능

        console.log('✓ 모바일 제스처 초기화 완료');
    }

    /**
     * 모든 제스처 초기화 (자동 감지)
     */
    function initAllGestures() {
        // 터치 디바이스 감지
        const isTouchDevice = window.Utils.isTouchDevice();

        if (isTouchDevice) {
            console.log('터치 디바이스 감지됨 - 모바일 제스처 활성화');
            initMobileGestures();
        } else {
            console.log('마우스 디바이스 감지됨 - 데스크톱 제스처 활성화');
            initDesktopGestures();
        }
    }

    /**
     * 제스처 정리 (cleanup)
     */
    function cleanup() {
        const levelUpBtn = document.getElementById('level-btn-up');
        const levelDownBtn = document.getElementById('level-btn-down');
        const slider = document.getElementById('level-range');
        const textContainer = document.getElementById('text-container');

        // 버튼 이벤트 제거
        if (levelUpBtn && GestureState.handlers.levelUp) {
            levelUpBtn.removeEventListener('click', GestureState.handlers.levelUp);
        }
        if (levelDownBtn && GestureState.handlers.levelDown) {
            levelDownBtn.removeEventListener('click', GestureState.handlers.levelDown);
        }

        // 슬라이더 이벤트 제거
        if (slider) {
            if (GestureState.handlers.sliderChange) {
                slider.removeEventListener('change', GestureState.handlers.sliderChange);
            }
            if (GestureState.handlers.sliderInput) {
                slider.removeEventListener('input', GestureState.handlers.sliderInput);
            }
        }

        // 키보드 이벤트 제거
        if (GestureState.handlers.keyDown) {
            document.removeEventListener('keydown', GestureState.handlers.keyDown);
        }

        // 휠 이벤트 제거
        if (textContainer && GestureState.handlers.wheel) {
            textContainer.removeEventListener('wheel', GestureState.handlers.wheel);
        }

        // 핀치 제스처 이벤트 제거
        if (textContainer) {
            if (GestureState.handlers.pointerDown) {
                textContainer.removeEventListener('pointerdown', GestureState.handlers.pointerDown);
            }
            if (GestureState.handlers.pointerMove) {
                textContainer.removeEventListener('pointermove', GestureState.handlers.pointerMove);
            }
            if (GestureState.handlers.pointerUp) {
                textContainer.removeEventListener('pointerup', GestureState.handlers.pointerUp);
            }
            if (GestureState.handlers.pointerCancel) {
                textContainer.removeEventListener('pointercancel', GestureState.handlers.pointerCancel);
            }
        }

        // 핀치 타이머 정리
        if (GestureState.pinchDebounceTimer) {
            clearTimeout(GestureState.pinchDebounceTimer);
            GestureState.pinchDebounceTimer = null;
        }

        console.log('✓ 제스처 이벤트 정리 완료');
    }

    /**
     * 현재 제스처 상태 가져오기 (디버깅용)
     *
     * @returns {object} 제스처 상태
     */
    function getGestureState() {
        return {
            isPinching: GestureState.isPinching,
            currentScale: GestureState.currentScale,
            lastLevel: GestureState.lastLevel,
            pointerCount: GestureState.pointers.size,
            buttonCooldown: GestureState.buttonCooldown
        };
    }

    // 전역 객체로 내보내기
    window.GestureManager = {
        initDesktopGestures,
        initMobileGestures,
        initAllGestures,
        cleanup,
        getGestureState,
        // 내부 함수 (테스트/디버깅용)
        _changeLevelWithAnimation: changeLevelWithAnimation,
        _updateButtonStates: updateButtonStates,
        _scaleToLevel: scaleToLevel,
        _levelToScale: levelToScale
    };

    console.log('✓ GestureManager 모듈 로드 완료');

})(window);
