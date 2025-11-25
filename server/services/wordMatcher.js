/**
 * 단어 매칭 알고리즘
 *
 * 두 요약 레벨 간의 단어 차이를 분석하고 매칭합니다.
 * 레벤슈타인 거리와 의미적 유사도를 결합하여 단어 간 유사도를 계산합니다.
 *
 * 공식: W_sim = 0.4 × L_sim + 0.6 × S_sim
 */

const natural = require('natural');
const { tokenizeWords } = require('../utils/textProcessor');

/**
 * 레벤슈타인 거리 계산
 * 두 문자열 간의 편집 거리를 계산합니다.
 *
 * @param {string} str1 - 첫 번째 문자열
 * @param {string} str2 - 두 번째 문자열
 * @returns {number} 레벤슈타인 거리
 */
function levenshteinDistance(str1, str2) {
  return natural.LevenshteinDistance(str1, str2);
}

/**
 * 레벤슈타인 유사도 계산
 * 편집 거리를 0-1 범위의 유사도로 변환합니다.
 *
 * @param {string} word1 - 첫 번째 단어
 * @param {string} word2 - 두 번째 단어
 * @returns {number} 유사도 (0-1)
 */
function calculateLevenshteinSimilarity(word1, word2) {
  const distance = levenshteinDistance(word1, word2);
  const maxLength = Math.max(word1.length, word2.length);

  if (maxLength === 0) return 1.0;

  // 유사도 = 1 - (거리 / 최대 길이)
  return 1.0 - (distance / maxLength);
}

/**
 * 의미적 유사도 계산 (간단한 휴리스틱)
 * 실제로는 Word2Vec나 임베딩을 사용해야 하지만,
 * 여기서는 간단한 방법을 사용합니다.
 *
 * @param {string} word1 - 첫 번째 단어
 * @param {string} word2 - 두 번째 단어
 * @returns {number} 의미적 유사도 (0-1)
 */
function calculateSemanticSimilarity(word1, word2) {
  const w1 = word1.toLowerCase();
  const w2 = word2.toLowerCase();

  // 완전 일치
  if (w1 === w2) return 1.0;

  // 한쪽이 다른 쪽을 포함하는 경우
  if (w1.includes(w2) || w2.includes(w1)) {
    const shorter = Math.min(w1.length, w2.length);
    const longer = Math.max(w1.length, w2.length);
    return shorter / longer;
  }

  // 공통 접두사/접미사 체크
  let commonPrefix = 0;
  const minLength = Math.min(w1.length, w2.length);

  for (let i = 0; i < minLength; i++) {
    if (w1[i] === w2[i]) {
      commonPrefix++;
    } else {
      break;
    }
  }

  if (commonPrefix >= 3) {
    return commonPrefix / Math.max(w1.length, w2.length);
  }

  // 기본값: 매우 낮은 유사도
  return 0.0;
}

/**
 * 단어 간 유사도 계산
 * 레벤슈타인 유사도와 의미적 유사도를 결합합니다.
 *
 * 공식: W_sim = 0.4 × L_sim + 0.6 × S_sim
 *
 * @param {string} word1 - 첫 번째 단어
 * @param {string} word2 - 두 번째 단어
 * @returns {number} 통합 유사도 (0-1)
 */
function calculateWordSimilarity(word1, word2) {
  const levenshteinSim = calculateLevenshteinSimilarity(word1, word2);
  const semanticSim = calculateSemanticSimilarity(word1, word2);

  // 가중 평균
  const similarity = 0.4 * levenshteinSim + 0.6 * semanticSim;

  return similarity;
}

/**
 * 완전 일치 단어 찾기
 *
 * @param {Array<string>} sourceWords - 원본 단어 배열
 * @param {Array<string>} targetWords - 대상 단어 배열
 * @returns {Set<string>} 일치하는 단어 집합
 */
function findExactMatches(sourceWords, targetWords) {
  const sourceSet = new Set(sourceWords.map(w => w.toLowerCase()));
  const targetSet = new Set(targetWords.map(w => w.toLowerCase()));

  const matches = new Set();

  sourceSet.forEach(word => {
    if (targetSet.has(word)) {
      matches.add(word);
    }
  });

  return matches;
}

/**
 * 유사 단어 매칭
 * 완전 일치하지 않는 단어들 간의 유사도를 계산하여 매칭합니다.
 *
 * @param {Array<string>} sourceWords - 원본 단어 배열
 * @param {Array<string>} targetWords - 대상 단어 배열
 * @param {number} threshold - 매칭 임계값 (기본값: 0.6)
 * @returns {Array<object>} 매칭 결과 배열
 */
function findSimilarMatches(sourceWords, targetWords, threshold = 0.6) {
  const matches = [];

  sourceWords.forEach(srcWord => {
    let bestMatch = null;
    let maxSimilarity = 0;

    targetWords.forEach(tgtWord => {
      const similarity = calculateWordSimilarity(srcWord, tgtWord);

      if (similarity > maxSimilarity && similarity >= threshold) {
        maxSimilarity = similarity;
        bestMatch = tgtWord;
      }
    });

    if (bestMatch) {
      matches.push({
        source: srcWord,
        target: bestMatch,
        similarity: maxSimilarity
      });
    }
  });

  return matches;
}

/**
 * 두 텍스트 간 단어 차이 분석
 * 유지, 제거, 추가, 변형된 단어를 분류합니다.
 *
 * 중요: 클라이언트 애니메이션을 위해 중복 단어를 제거하지 않고 모두 반환합니다.
 *
 * @param {string} sourceText - 원본 텍스트 (현재 레벨)
 * @param {string} targetText - 대상 텍스트 (다음 레벨)
 * @returns {object} TransitionDiff 객체
 */
function analyzeDifference(sourceText, targetText) {
  console.log('단어 차이 분석 시작...');

  // 단어 토큰화 - 클라이언트와 동일한 방식 사용 (공백 기준 split)
  const sourceWords = sourceText.split(/\s+/).filter(w => w.trim()).map(w => w.toLowerCase());
  const targetWords = targetText.split(/\s+/).filter(w => w.trim()).map(w => w.toLowerCase());

  console.log(`  - 원본 단어: ${sourceWords.length}개`);
  console.log(`  - 대상 단어: ${targetWords.length}개`);

  // 완전 일치 단어 Set (중복 제거된 유니크 단어)
  const exactMatchesSet = findExactMatches(sourceWords, targetWords);

  // kept: 양쪽 텍스트에 모두 존재하는 단어 (중복 포함)
  // 클라이언트가 각 단어를 개별적으로 애니메이션할 수 있도록 유니크한 단어 목록만 반환
  const kept = Array.from(exactMatchesSet);

  // removed: 원본에만 있고 대상에 없는 단어 (유니크)
  const removedSet = new Set();
  sourceWords.forEach(w => {
    if (!exactMatchesSet.has(w)) {
      removedSet.add(w);
    }
  });
  const removed = Array.from(removedSet);

  // added: 대상에만 있고 원본에 없는 단어 (유니크)
  const addedSet = new Set();
  targetWords.forEach(w => {
    if (!exactMatchesSet.has(w)) {
      addedSet.add(w);
    }
  });
  const added = Array.from(addedSet);

  console.log(`✓ 단어 차이 분석 완료`);
  console.log(`  - 유지: ${kept.length}개 (유니크)`);
  console.log(`  - 제거: ${removed.length}개 (유니크)`);
  console.log(`  - 추가: ${added.length}개 (유니크)`);

  return {
    kept,
    removed,
    added,
    morphed: []  // 단순화를 위해 morphed는 빈 배열로
  };
}

/**
 * 위치 정보가 포함된 상세 차이 분석
 * 각 단어의 위치를 추적하여 더 정확한 매칭을 수행합니다.
 *
 * @param {object} sourceStructured - 원본 구조화된 텍스트
 * @param {object} targetStructured - 대상 구조화된 텍스트
 * @returns {object} 상세 TransitionDiff 객체
 */
function analyzeDetailedDifference(sourceStructured, targetStructured) {
  console.log('상세 단어 차이 분석 시작...');

  const sourceWords = sourceStructured.words || [];
  const targetWords = targetStructured.words || [];

  // 소문자로 변환한 텍스트로 매칭
  const sourceTexts = sourceWords.map(w => w.text.toLowerCase());
  const targetTexts = targetWords.map(w => w.text.toLowerCase());

  // 완전 일치 찾기
  const exactMatches = findExactMatches(sourceTexts, targetTexts);

  // 각 원본 단어 처리
  const kept = [];
  const removed = [];
  const morphed = [];

  sourceWords.forEach((word, index) => {
    const wordText = word.text.toLowerCase();

    if (exactMatches.has(wordText)) {
      // 유지되는 단어
      kept.push({
        ...word,
        originalIndex: index
      });
    } else {
      // 유사 단어 찾기
      let bestMatch = null;
      let maxSimilarity = 0;

      targetWords.forEach(tgtWord => {
        const similarity = calculateWordSimilarity(word.text, tgtWord.text);

        if (similarity > maxSimilarity && similarity >= 0.6) {
          maxSimilarity = similarity;
          bestMatch = tgtWord;
        }
      });

      if (bestMatch) {
        // 변형된 단어
        morphed.push({
          from: { ...word, originalIndex: index },
          to: bestMatch,
          similarity: maxSimilarity
        });
      } else {
        // 제거되는 단어
        removed.push({
          ...word,
          originalIndex: index
        });
      }
    }
  });

  // 추가된 단어 찾기
  const targetTextsLower = targetWords.map(w => w.text.toLowerCase());
  const keptTexts = new Set(kept.map(w => w.text.toLowerCase()));
  const morphedTargetTexts = new Set(morphed.map(m => m.to.text.toLowerCase()));

  const added = targetWords.filter(word => {
    const wordText = word.text.toLowerCase();
    return !keptTexts.has(wordText) && !morphedTargetTexts.has(wordText);
  });

  console.log(`✓ 상세 단어 차이 분석 완료`);
  console.log(`  - 유지: ${kept.length}개`);
  console.log(`  - 제거: ${removed.length}개`);
  console.log(`  - 추가: ${added.length}개`);
  console.log(`  - 변형: ${morphed.length}개`);

  return {
    kept,
    removed,
    added,
    morphed
  };
}

/**
 * 매칭 품질 평가
 * 매칭 결과의 품질을 평가합니다.
 *
 * @param {object} diff - TransitionDiff 객체
 * @returns {object} 품질 평가 결과
 */
function evaluateMatchingQuality(diff) {
  const { kept, removed, added, morphed } = diff;

  const totalSource = kept.length + removed.length + morphed.length;
  const totalTarget = kept.length + added.length + morphed.length;

  const preservationRate = totalSource > 0 ? kept.length / totalSource : 0;
  const changeRate = totalSource > 0 ? (removed.length + morphed.length) / totalSource : 0;

  return {
    preservationRate: (preservationRate * 100).toFixed(2) + '%',
    changeRate: (changeRate * 100).toFixed(2) + '%',
    totalSourceWords: totalSource,
    totalTargetWords: totalTarget,
    averageMorphSimilarity: morphed.length > 0
      ? (morphed.reduce((sum, m) => sum + m.similarity, 0) / morphed.length).toFixed(3)
      : 'N/A'
  };
}

/**
 * 단어 매칭 결과를 텍스트로 출력
 * 디버깅용 함수입니다.
 *
 * @param {object} diff - TransitionDiff 객체
 * @returns {string} 포맷된 결과 텍스트
 */
function formatMatchingResult(diff) {
  const { kept, removed, added, morphed } = diff;

  let result = '단어 매칭 결과:\n';
  result += '='.repeat(60) + '\n';

  result += `\n[유지된 단어] (${kept.length}개)\n`;
  result += kept.slice(0, 10).join(', ');
  if (kept.length > 10) result += ` ... 외 ${kept.length - 10}개`;

  result += `\n\n[제거된 단어] (${removed.length}개)\n`;
  const removedTexts = Array.isArray(removed[0]) ? removed : removed.map(w => w.text || w);
  result += removedTexts.slice(0, 10).join(', ');
  if (removed.length > 10) result += ` ... 외 ${removed.length - 10}개`;

  result += `\n\n[추가된 단어] (${added.length}개)\n`;
  const addedTexts = Array.isArray(added[0]) ? added : added.map(w => w.text || w);
  result += addedTexts.slice(0, 10).join(', ');
  if (added.length > 10) result += ` ... 외 ${added.length - 10}개`;

  result += `\n\n[변형된 단어] (${morphed.length}개)\n`;
  morphed.slice(0, 5).forEach(m => {
    const fromText = m.from.text || m.source;
    const toText = m.to.text || m.target;
    result += `  ${fromText} → ${toText} (유사도: ${(m.similarity * 100).toFixed(1)}%)\n`;
  });
  if (morphed.length > 5) result += `  ... 외 ${morphed.length - 5}개\n`;

  result += '\n' + '='.repeat(60);

  return result;
}

module.exports = {
  levenshteinDistance,
  calculateLevenshteinSimilarity,
  calculateSemanticSimilarity,
  calculateWordSimilarity,
  findExactMatches,
  findSimilarMatches,
  analyzeDifference,
  analyzeDetailedDifference,
  evaluateMatchingQuality,
  formatMatchingResult
};
