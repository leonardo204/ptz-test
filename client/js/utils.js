/**
 * 유틸리티 함수 모음
 *
 * API 통신, UI 업데이트, 헬퍼 함수 등을 제공합니다.
 */

(function(window) {
    'use strict';

    // API 베이스 URL (Nginx를 통해 프록시됨)
    const API_BASE_URL = '/api';

    /**
     * API 요청 헬퍼
     *
     * @param {string} endpoint - API 엔드포인트
     * @param {object} options - fetch 옵션
     * @returns {Promise<object>} API 응답
     */
    async function apiRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            console.log(`API 요청: ${finalOptions.method || 'GET'} ${url}`);

            const response = await fetch(url, finalOptions);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API 요청 실패:', error);
            throw error;
        }
    }

    /**
     * example.txt 텍스트 가져오기
     *
     * @returns {Promise<object>} 텍스트 데이터
     */
    async function fetchExampleText() {
        return apiRequest('/example-text');
    }

    /**
     * 요약 생성 요청
     *
     * @param {string} text - 원문 텍스트
     * @param {boolean} useCache - 캐시 사용 여부
     * @returns {Promise<object>} 요약 결과
     */
    async function fetchSummary(text, useCache = true) {
        return apiRequest('/summarize', {
            method: 'POST',
            body: JSON.stringify({ text, useCache })
        });
    }

    /**
     * 특정 레벨 텍스트 조회
     *
     * @param {number} level - 레벨 (0-3)
     * @param {string} text - 원문 텍스트
     * @returns {Promise<object>} 텍스트 데이터
     */
    async function fetchTextLevel(level, text) {
        const encodedText = encodeURIComponent(text);
        return apiRequest(`/text/${level}?text=${encodedText}`);
    }

    /**
     * 레벨 간 단어 차이 계산
     *
     * @param {string} fromText - 원본 텍스트
     * @param {string} toText - 대상 텍스트
     * @param {boolean} detailed - 상세 분석 여부
     * @returns {Promise<object>} 차이 분석 결과
     */
    async function fetchTransitionDiff(fromText, toText, detailed = false) {
        return apiRequest('/calculate-diff', {
            method: 'POST',
            body: JSON.stringify({ fromText, toText, detailed })
        });
    }

    /**
     * 캐시 통계 조회
     *
     * @returns {Promise<object>} 캐시 통계
     */
    async function fetchCacheStats() {
        return apiRequest('/cache/stats');
    }

    /**
     * 캐시 초기화
     *
     * @returns {Promise<object>} 응답
     */
    async function clearServerCache() {
        return apiRequest('/cache/clear', { method: 'POST' });
    }

    /**
     * 로딩 표시
     *
     * @param {string} message - 로딩 메시지
     */
    function showLoading(message = '로딩 중...') {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');

        if (overlay && text) {
            text.textContent = message;
            overlay.classList.add('active');
        }
    }

    /**
     * 로딩 숨기기
     */
    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * 에러 메시지 표시
     *
     * @param {string} message - 에러 메시지
     * @param {number} duration - 표시 시간 (ms)
     */
    function showError(message, duration = 5000) {
        const errorDiv = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.add('active');

            if (duration > 0) {
                setTimeout(() => {
                    hideError();
                }, duration);
            }
        }

        console.error('에러:', message);
    }

    /**
     * 에러 메시지 숨기기
     */
    function hideError() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.classList.remove('active');
        }
    }

    /**
     * 성공 메시지 표시
     *
     * @param {string} message - 성공 메시지
     * @param {number} duration - 표시 시간 (ms)
     */
    function showSuccess(message, duration = 3000) {
        const successDiv = document.getElementById('success-message');
        const successText = document.getElementById('success-text');

        if (successDiv && successText) {
            successText.textContent = message;
            successDiv.classList.add('active');

            if (duration > 0) {
                setTimeout(() => {
                    hideSuccess();
                }, duration);
            }
        }

        console.log('성공:', message);
    }

    /**
     * 성공 메시지 숨기기
     */
    function hideSuccess() {
        const successDiv = document.getElementById('success-message');
        if (successDiv) {
            successDiv.classList.remove('active');
        }
    }

    /**
     * 텍스트 통계 계산
     *
     * @param {string} text - 텍스트
     * @returns {object} 통계 정보
     */
    function calculateTextStats(text) {
        if (!text) {
            return { wordCount: 0, sentenceCount: 0, charCount: 0 };
        }

        const words = text.match(/\S+/g) || [];
        const sentences = text.match(/[.!?]+/g) || [];

        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            charCount: text.length
        };
    }

    /**
     * 통계 UI 업데이트
     *
     * @param {object} stats - 통계 정보
     */
    function updateStatsUI(stats) {
        const wordCountEl = document.getElementById('word-count');
        const sentenceCountEl = document.getElementById('sentence-count');
        const compressionRateEl = document.getElementById('compression-rate');

        if (wordCountEl) {
            wordCountEl.textContent = stats.wordCount || '-';
        }

        if (sentenceCountEl) {
            sentenceCountEl.textContent = stats.sentenceCount || '-';
        }

        if (compressionRateEl && stats.compressionRate !== undefined) {
            const percentage = (stats.compressionRate * 100).toFixed(0);
            compressionRateEl.textContent = `${percentage}%`;
        } else if (compressionRateEl) {
            compressionRateEl.textContent = '-';
        }
    }

    /**
     * 레벨 UI 업데이트
     *
     * @param {number} level - 현재 레벨
     */
    function updateLevelUI(level) {
        const levelNumberEl = document.getElementById('level-number');
        const levelLabelEl = document.getElementById('level-label');
        const rangeEl = document.getElementById('level-range');

        // 거대한 숫자 표시 - 심플 애니메이션
        if (levelNumberEl) {
            levelNumberEl.classList.add('level-changing');
            levelNumberEl.textContent = level;

            // 애니메이션 완료 후 클래스 제거
            setTimeout(() => {
                levelNumberEl.classList.remove('level-changing');
            }, 400);
        }

        // 레벨 레이블 (영문 대문자) - 연계 애니메이션
        if (levelLabelEl) {
            const labels = {
                0: 'ORIGINAL',
                1: 'SUMMARY I',
                2: 'SUMMARY II',
                3: 'SUMMARY III'
            };

            // 레이블 애니메이션 추가
            levelLabelEl.classList.add('level-label-changing');
            levelLabelEl.textContent = labels[level] || '';

            setTimeout(() => {
                levelLabelEl.classList.remove('level-label-changing');
            }, 400);
        }

        // 슬라이더 업데이트
        if (rangeEl) {
            rangeEl.value = level;
        }
    }

    /**
     * 디바운스 함수
     *
     * @param {Function} func - 실행할 함수
     * @param {number} wait - 대기 시간 (ms)
     * @returns {Function} 디바운스된 함수
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 쓰로틀 함수
     *
     * @param {Function} func - 실행할 함수
     * @param {number} limit - 제한 시간 (ms)
     * @returns {Function} 쓰로틀된 함수
     */
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 딜레이 함수
     *
     * @param {number} ms - 딜레이 시간 (ms)
     * @returns {Promise} 딜레이 Promise
     */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 모바일 디바이스 감지
     *
     * @returns {boolean} 모바일 여부
     */
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * 터치 지원 감지
     *
     * @returns {boolean} 터치 지원 여부
     */
    function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * 요소가 뷰포트에 있는지 확인
     *
     * @param {HTMLElement} element - 확인할 요소
     * @returns {boolean} 뷰포트 내 존재 여부
     */
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * 부드러운 스크롤
     *
     * @param {HTMLElement} element - 스크롤할 요소
     * @param {object} options - 스크롤 옵션
     */
    function smoothScrollTo(element, options = {}) {
        const defaultOptions = {
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        };

        element.scrollIntoView({ ...defaultOptions, ...options });
    }

    /**
     * 로컬 스토리지에 저장
     *
     * @param {string} key - 키
     * @param {any} value - 값
     */
    function saveToLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('로컬 스토리지 저장 실패:', error);
        }
    }

    /**
     * 로컬 스토리지에서 가져오기
     *
     * @param {string} key - 키
     * @returns {any} 저장된 값
     */
    function loadFromLocalStorage(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('로컬 스토리지 로드 실패:', error);
            return null;
        }
    }

    // 에러 닫기 버튼 이벤트
    document.addEventListener('DOMContentLoaded', () => {
        const errorClose = document.getElementById('error-close');
        if (errorClose) {
            errorClose.addEventListener('click', hideError);
        }
    });

    // 전역 객체로 내보내기
    window.Utils = {
        apiRequest,
        fetchExampleText,
        fetchSummary,
        fetchTextLevel,
        fetchTransitionDiff,
        fetchCacheStats,
        clearServerCache,
        showLoading,
        hideLoading,
        showError,
        hideError,
        showSuccess,
        hideSuccess,
        calculateTextStats,
        updateStatsUI,
        updateLevelUI,
        debounce,
        throttle,
        delay,
        isMobileDevice,
        isTouchDevice,
        isInViewport,
        smoothScrollTo,
        saveToLocalStorage,
        loadFromLocalStorage
    };

    console.log('✓ Utils 모듈 로드 완료');

})(window);
