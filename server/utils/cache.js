/**
 * 요약 캐싱 시스템
 *
 * 생성된 요약을 메모리에 캐싱하여 반복 요청 시 성능을 향상시킵니다.
 * node-cache 라이브러리를 사용하여 TTL과 LRU 정책을 적용합니다.
 */

const NodeCache = require('node-cache');
const crypto = require('crypto');

/**
 * 캐시 인스턴스 설정
 * - stdTTL: 기본 TTL 1시간 (3600초)
 * - checkperiod: 만료된 항목 체크 주기 120초
 * - useClones: false (성능 최적화, 참조 반환)
 * - maxKeys: 최대 100개 항목
 */
const cache = new NodeCache({
  stdTTL: 3600,        // 1시간 TTL
  checkperiod: 120,    // 2분마다 만료 체크
  useClones: false,    // 복제 없이 참조 반환 (성능 향상)
  maxKeys: 100         // 최대 100개 요약 캐싱
});

/**
 * 캐시 통계
 */
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0
};

/**
 * 텍스트 해시 생성
 * SHA256 해시를 사용하여 텍스트의 고유 식별자를 생성합니다.
 *
 * @param {string} text - 해시할 텍스트
 * @returns {string} SHA256 해시 (16진수)
 */
function generateTextHash(text) {
  return crypto
    .createHash('sha256')
    .update(text.trim())
    .digest('hex');
}

/**
 * 캐시 키 생성
 * 텍스트 해시와 레벨을 조합하여 캐시 키를 생성합니다.
 *
 * @param {string} text - 텍스트
 * @param {number} level - 요약 레벨 (1, 2, 3) 또는 'all'
 * @returns {string} 캐시 키
 */
function generateCacheKey(text, level = 'all') {
  const hash = generateTextHash(text);
  return `summary:${hash}:${level}`;
}

/**
 * 요약 결과 저장
 * 생성된 요약을 캐시에 저장합니다.
 *
 * @param {string} text - 원문 텍스트
 * @param {number} level - 요약 레벨
 * @param {object} summary - 요약 결과 객체
 * @param {number} ttl - TTL (선택, 초 단위)
 * @returns {boolean} 저장 성공 여부
 */
function saveSummary(text, level, summary, ttl = null) {
  try {
    const key = generateCacheKey(text, level);
    const success = ttl ? cache.set(key, summary, ttl) : cache.set(key, summary);

    if (success) {
      cacheStats.sets++;
      console.log(`✓ 캐시 저장 성공: Level ${level}`);
      console.log(`  - 키: ${key.substring(0, 40)}...`);
    }

    return success;
  } catch (error) {
    console.error('✗ 캐시 저장 실패:', error.message);
    return false;
  }
}

/**
 * 전체 요약 결과 저장
 * Level 0, 1, 2, 3 모두를 저장합니다.
 *
 * @param {string} originalText - 원문 텍스트
 * @param {object} allSummaries - 전체 요약 결과
 * @returns {boolean} 저장 성공 여부
 */
function saveAllSummaries(originalText, allSummaries) {
  try {
    // 전체 결과를 하나의 키로 저장
    const allKey = generateCacheKey(originalText, 'all');
    cache.set(allKey, allSummaries);

    // 각 레벨별로도 저장
    if (allSummaries.original) {
      saveSummary(originalText, 0, allSummaries.original);
    }
    if (allSummaries.level1) {
      saveSummary(originalText, 1, allSummaries.level1);
    }
    if (allSummaries.level2) {
      saveSummary(originalText, 2, allSummaries.level2);
    }
    if (allSummaries.level3) {
      saveSummary(originalText, 3, allSummaries.level3);
    }

    console.log(`✓ 전체 요약 캐시 저장 완료`);
    return true;
  } catch (error) {
    console.error('✗ 전체 요약 캐시 저장 실패:', error.message);
    return false;
  }
}

/**
 * 요약 결과 조회
 * 캐시에서 요약 결과를 조회합니다.
 *
 * @param {string} text - 원문 텍스트
 * @param {number} level - 요약 레벨
 * @returns {object|null} 요약 결과 또는 null
 */
function getSummary(text, level) {
  try {
    const key = generateCacheKey(text, level);
    const value = cache.get(key);

    if (value !== undefined) {
      cacheStats.hits++;
      console.log(`✓ 캐시 히트: Level ${level}`);
      return value;
    } else {
      cacheStats.misses++;
      console.log(`✗ 캐시 미스: Level ${level}`);
      return null;
    }
  } catch (error) {
    console.error('✗ 캐시 조회 실패:', error.message);
    cacheStats.misses++;
    return null;
  }
}

/**
 * 전체 요약 결과 조회
 *
 * @param {string} originalText - 원문 텍스트
 * @returns {object|null} 전체 요약 결과 또는 null
 */
function getAllSummaries(originalText) {
  try {
    const key = generateCacheKey(originalText, 'all');
    const value = cache.get(key);

    if (value !== undefined) {
      cacheStats.hits++;
      console.log(`✓ 전체 요약 캐시 히트`);
      return value;
    } else {
      cacheStats.misses++;
      console.log(`✗ 전체 요약 캐시 미스`);
      return null;
    }
  } catch (error) {
    console.error('✗ 전체 요약 캐시 조회 실패:', error.message);
    cacheStats.misses++;
    return null;
  }
}

/**
 * 캐시에서 요약 삭제
 *
 * @param {string} text - 원문 텍스트
 * @param {number} level - 요약 레벨 (선택, 없으면 전체 삭제)
 * @returns {number} 삭제된 항목 수
 */
function deleteSummary(text, level = null) {
  try {
    if (level === null) {
      // 해당 텍스트의 모든 레벨 삭제
      const hash = generateTextHash(text);
      const keys = cache.keys();
      const keysToDelete = keys.filter(k => k.includes(hash));

      let deleted = 0;
      keysToDelete.forEach(key => {
        if (cache.del(key)) {
          deleted++;
        }
      });

      cacheStats.deletes += deleted;
      console.log(`✓ 캐시 삭제 완료: ${deleted}개 항목`);
      return deleted;
    } else {
      // 특정 레벨만 삭제
      const key = generateCacheKey(text, level);
      const success = cache.del(key);

      if (success) {
        cacheStats.deletes++;
        console.log(`✓ 캐시 삭제 완료: Level ${level}`);
        return 1;
      }
      return 0;
    }
  } catch (error) {
    console.error('✗ 캐시 삭제 실패:', error.message);
    return 0;
  }
}

/**
 * 캐시 전체 초기화
 *
 * @returns {void}
 */
function clearCache() {
  cache.flushAll();
  console.log('✓ 전체 캐시 초기화 완료');
}

/**
 * 캐시 통계 조회
 *
 * @returns {object} 캐시 통계 정보
 */
function getCacheStats() {
  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)
    : 0;

  return {
    ...cacheStats,
    hitRate: `${hitRate}%`,
    keys: cache.keys().length,
    memoryUsage: JSON.stringify(cache.getStats())
  };
}

/**
 * 캐시 통계 로깅
 *
 * @returns {void}
 */
function logCacheStats() {
  const stats = getCacheStats();

  console.log('='.repeat(60));
  console.log('캐시 통계');
  console.log('='.repeat(60));
  console.log(`  - 히트: ${stats.hits}회`);
  console.log(`  - 미스: ${stats.misses}회`);
  console.log(`  - 히트율: ${stats.hitRate}`);
  console.log(`  - 저장: ${stats.sets}회`);
  console.log(`  - 삭제: ${stats.deletes}회`);
  console.log(`  - 현재 키 수: ${stats.keys}개`);
  console.log('='.repeat(60));
}

/**
 * 캐시 통계 리셋
 *
 * @returns {void}
 */
function resetCacheStats() {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.sets = 0;
  cacheStats.deletes = 0;
  console.log('✓ 캐시 통계 리셋 완료');
}

/**
 * TTL 업데이트
 * 특정 키의 TTL을 갱신합니다.
 *
 * @param {string} text - 텍스트
 * @param {number} level - 레벨
 * @param {number} ttl - 새로운 TTL (초)
 * @returns {boolean} 성공 여부
 */
function updateTTL(text, level, ttl) {
  try {
    const key = generateCacheKey(text, level);
    return cache.ttl(key, ttl);
  } catch (error) {
    console.error('✗ TTL 업데이트 실패:', error.message);
    return false;
  }
}

/**
 * 캐시 키 존재 여부 확인
 *
 * @param {string} text - 텍스트
 * @param {number} level - 레벨
 * @returns {boolean} 존재 여부
 */
function hasSummary(text, level) {
  const key = generateCacheKey(text, level);
  return cache.has(key);
}

/**
 * 만료 예정 항목 조회
 * TTL이 특정 시간 이하로 남은 항목들을 조회합니다.
 *
 * @param {number} threshold - 임계값 (초, 기본값: 300 = 5분)
 * @returns {Array<string>} 만료 예정 키 배열
 */
function getExpiringKeys(threshold = 300) {
  const allKeys = cache.keys();
  const expiringKeys = [];

  allKeys.forEach(key => {
    const ttl = cache.getTtl(key);
    if (ttl && (ttl - Date.now()) / 1000 < threshold) {
      expiringKeys.push(key);
    }
  });

  return expiringKeys;
}

// 캐시 이벤트 리스너
cache.on('set', (key, value) => {
  console.log(`[Cache] 저장: ${key.substring(0, 40)}...`);
});

cache.on('del', (key, value) => {
  console.log(`[Cache] 삭제: ${key.substring(0, 40)}...`);
});

cache.on('expired', (key, value) => {
  console.log(`[Cache] 만료: ${key.substring(0, 40)}...`);
});

cache.on('flush', () => {
  console.log(`[Cache] 전체 초기화`);
});

module.exports = {
  generateTextHash,
  generateCacheKey,
  saveSummary,
  saveAllSummaries,
  getSummary,
  getAllSummaries,
  deleteSummary,
  clearCache,
  getCacheStats,
  logCacheStats,
  resetCacheStats,
  updateTTL,
  hasSummary,
  getExpiringKeys,
  cache // 직접 접근이 필요한 경우
};
