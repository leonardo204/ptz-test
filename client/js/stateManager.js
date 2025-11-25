/**
 * 상태 관리 모듈
 *
 * 애플리케이션의 전역 상태를 관리하는 모듈입니다.
 * 현재 레벨, 텍스트 데이터, 애니메이션 상태, 캐시 등을 관리합니다.
 */

(function(window) {
    'use strict';

    /**
     * 애플리케이션 상태 객체
     */
    const AppState = {
        // 현재 요약 레벨 (0: 원문, 1-3: 요약)
        currentLevel: 0,

        // 레벨별 텍스트 데이터
        texts: new Map(),

        // 레벨별 메타데이터
        metadata: new Map(),

        // 애니메이션 진행 중 여부
        isAnimating: false,

        // 뷰포트 앵커 (읽던 위치 추적)
        viewportAnchor: {
            word: null,
            offset: 0
        },

        // 로컬 캐시
        cache: new Map(),

        // 원문 텍스트
        originalText: null,

        // 이벤트 리스너
        listeners: {
            levelChange: [],
            textChange: [],
            animationStateChange: []
        }
    };

    /**
     * 현재 레벨 가져오기
     *
     * @returns {number} 현재 레벨
     */
    function getLevel() {
        return AppState.currentLevel;
    }

    /**
     * 레벨 설정
     *
     * @param {number} level - 설정할 레벨 (0-3)
     * @returns {boolean} 성공 여부
     */
    function setLevel(level) {
        const newLevel = parseInt(level);

        if (![0, 1, 2, 3].includes(newLevel)) {
            console.error('유효하지 않은 레벨:', level);
            return false;
        }

        if (AppState.currentLevel === newLevel) {
            console.log('이미 현재 레벨입니다:', newLevel);
            return false;
        }

        const oldLevel = AppState.currentLevel;
        AppState.currentLevel = newLevel;

        console.log(`레벨 변경: ${oldLevel} → ${newLevel}`);

        // 리스너 호출
        notifyListeners('levelChange', { oldLevel, newLevel });

        return true;
    }

    /**
     * 특정 레벨의 텍스트 가져오기
     *
     * @param {number} level - 레벨
     * @returns {string|null} 텍스트 또는 null
     */
    function getText(level) {
        return AppState.texts.get(level) || null;
    }

    /**
     * 현재 레벨의 텍스트 가져오기
     *
     * @returns {string|null} 현재 텍스트
     */
    function getCurrentText() {
        return getText(AppState.currentLevel);
    }

    /**
     * 텍스트 설정
     *
     * @param {number} level - 레벨
     * @param {string} text - 텍스트
     * @param {object} metadata - 메타데이터 (선택)
     * @returns {boolean} 성공 여부
     */
    function setText(level, text, metadata = null) {
        if (typeof text !== 'string') {
            console.error('텍스트는 문자열이어야 합니다.');
            return false;
        }

        AppState.texts.set(level, text);

        if (metadata) {
            AppState.metadata.set(level, metadata);
        }

        console.log(`텍스트 저장: Level ${level} (${text.length}자)`);

        // 리스너 호출
        notifyListeners('textChange', { level, text, metadata });

        return true;
    }

    /**
     * 원문 텍스트 설정
     *
     * @param {string} text - 원문 텍스트
     */
    function setOriginalText(text) {
        AppState.originalText = text;
        setText(0, text);
    }

    /**
     * 원문 텍스트 가져오기
     *
     * @returns {string|null} 원문 텍스트
     */
    function getOriginalText() {
        return AppState.originalText;
    }

    /**
     * 메타데이터 가져오기
     *
     * @param {number} level - 레벨
     * @returns {object|null} 메타데이터
     */
    function getMetadata(level) {
        return AppState.metadata.get(level) || null;
    }

    /**
     * 애니메이션 상태 확인
     *
     * @returns {boolean} 애니메이션 진행 중 여부
     */
    function isAnimating() {
        return AppState.isAnimating;
    }

    /**
     * 애니메이션 상태 설정
     *
     * @param {boolean} animating - 애니메이션 상태
     */
    function setAnimating(animating) {
        const wasAnimating = AppState.isAnimating;
        AppState.isAnimating = !!animating;

        if (wasAnimating !== AppState.isAnimating) {
            console.log(`애니메이션 상태: ${AppState.isAnimating}`);
            notifyListeners('animationStateChange', { isAnimating: AppState.isAnimating });
        }
    }

    /**
     * 뷰포트 앵커 설정 (읽던 위치)
     *
     * @param {string} word - 앵커 단어
     * @param {number} offset - 오프셋
     */
    function setViewportAnchor(word, offset = 0) {
        AppState.viewportAnchor = { word, offset };
        console.log(`뷰포트 앵커 설정: "${word}" (offset: ${offset})`);
    }

    /**
     * 뷰포트 앵커 가져오기
     *
     * @returns {object} 앵커 정보
     */
    function getViewportAnchor() {
        return AppState.viewportAnchor;
    }

    /**
     * 뷰포트 앵커 초기화
     */
    function clearViewportAnchor() {
        AppState.viewportAnchor = { word: null, offset: 0 };
    }

    /**
     * 캐시에 데이터 저장
     *
     * @param {string} key - 캐시 키
     * @param {any} value - 저장할 값
     */
    function setCache(key, value) {
        AppState.cache.set(key, value);
    }

    /**
     * 캐시에서 데이터 가져오기
     *
     * @param {string} key - 캐시 키
     * @returns {any} 캐시된 값 또는 undefined
     */
    function getCache(key) {
        return AppState.cache.get(key);
    }

    /**
     * 캐시에 키가 존재하는지 확인
     *
     * @param {string} key - 캐시 키
     * @returns {boolean} 존재 여부
     */
    function hasCache(key) {
        return AppState.cache.has(key);
    }

    /**
     * 캐시 초기화
     */
    function clearCache() {
        AppState.cache.clear();
        console.log('캐시 초기화 완료');
    }

    /**
     * 이벤트 리스너 추가
     *
     * @param {string} event - 이벤트 타입 (levelChange, textChange, animationStateChange)
     * @param {Function} callback - 콜백 함수
     */
    function addEventListener(event, callback) {
        if (!AppState.listeners[event]) {
            console.error('유효하지 않은 이벤트:', event);
            return;
        }

        if (typeof callback !== 'function') {
            console.error('콜백은 함수여야 합니다.');
            return;
        }

        AppState.listeners[event].push(callback);
        console.log(`리스너 추가: ${event}`);
    }

    /**
     * 이벤트 리스너 제거
     *
     * @param {string} event - 이벤트 타입
     * @param {Function} callback - 제거할 콜백 함수
     */
    function removeEventListener(event, callback) {
        if (!AppState.listeners[event]) {
            return;
        }

        const index = AppState.listeners[event].indexOf(callback);
        if (index > -1) {
            AppState.listeners[event].splice(index, 1);
            console.log(`리스너 제거: ${event}`);
        }
    }

    /**
     * 리스너에게 이벤트 알림
     *
     * @param {string} event - 이벤트 타입
     * @param {object} data - 이벤트 데이터
     */
    function notifyListeners(event, data) {
        if (!AppState.listeners[event]) {
            return;
        }

        AppState.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('리스너 실행 오류:', error);
            }
        });
    }

    /**
     * 전체 상태 초기화
     */
    function resetState() {
        AppState.currentLevel = 0;
        AppState.texts.clear();
        AppState.metadata.clear();
        AppState.isAnimating = false;
        AppState.viewportAnchor = { word: null, offset: 0 };
        AppState.cache.clear();
        AppState.originalText = null;

        console.log('상태 초기화 완료');
    }

    /**
     * 현재 상태 스냅샷 가져오기 (디버깅용)
     *
     * @returns {object} 상태 스냅샷
     */
    function getStateSnapshot() {
        return {
            currentLevel: AppState.currentLevel,
            textsCount: AppState.texts.size,
            metadataCount: AppState.metadata.size,
            isAnimating: AppState.isAnimating,
            viewportAnchor: { ...AppState.viewportAnchor },
            cacheSize: AppState.cache.size,
            hasOriginalText: !!AppState.originalText
        };
    }

    /**
     * 레벨 설명 가져오기
     *
     * @param {number} level - 레벨
     * @returns {string} 레벨 설명
     */
    function getLevelDescription(level) {
        const descriptions = {
            0: '원문',
            1: 'Level 1 (1차 요약)',
            2: 'Level 2 (2차 요약)',
            3: 'Level 3 (최종 요약)'
        };

        return descriptions[level] || '알 수 없음';
    }

    /**
     * 다음 레벨로 이동 가능 여부
     *
     * @returns {boolean} 이동 가능 여부
     */
    function canGoToNextLevel() {
        return AppState.currentLevel < 3 && !AppState.isAnimating;
    }

    /**
     * 이전 레벨로 이동 가능 여부
     *
     * @returns {boolean} 이동 가능 여부
     */
    function canGoToPreviousLevel() {
        return AppState.currentLevel > 0 && !AppState.isAnimating;
    }

    // 전역 객체로 내보내기
    window.StateManager = {
        getLevel,
        setLevel,
        getText,
        getCurrentText,
        setText,
        setOriginalText,
        getOriginalText,
        getMetadata,
        isAnimating,
        setAnimating,
        setViewportAnchor,
        getViewportAnchor,
        clearViewportAnchor,
        setCache,
        getCache,
        hasCache,
        clearCache,
        addEventListener,
        removeEventListener,
        resetState,
        getStateSnapshot,
        getLevelDescription,
        canGoToNextLevel,
        canGoToPreviousLevel
    };

    console.log('✓ StateManager 모듈 로드 완료');

})(window);
