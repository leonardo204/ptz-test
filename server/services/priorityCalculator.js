/**
 * 단어 우선순위 계산 알고리즘
 *
 * TF-IDF, 품사, 구문 의존성, 위치 정보를 종합하여
 * 각 단어의 제거 우선순위를 계산합니다.
 *
 * 공식: P = 0.4×TF-IDF + 0.3×품사 + 0.2×구문의존성 + 0.1×위치
 */

const { computeTFIDFForText, normalizeTFIDF } = require('./tfidf');
const { estimatePOS } = require('../utils/textProcessor');

/**
 * 품사별 가중치 맵
 * 높은 값일수록 중요한 품사로, 나중에 제거됩니다.
 */
const POS_WEIGHTS = {
  NOUN: 1.0,      // 명사 - 가장 중요
  VERB: 0.9,      // 동사
  NUM: 0.85,      // 숫자
  ADJ: 0.6,       // 형용사
  ADV: 0.4,       // 부사
  ADP: 0.2,       // 전치사/조사
  DET: 0.1,       // 관형사
  CONJ: 0.05      // 접속사 - 가장 먼저 제거
};

/**
 * 품사 점수 계산
 *
 * @param {string} pos - 품사 태그
 * @returns {number} 품사 가중치 (0-1)
 */
function calculatePOSScore(pos) {
  return POS_WEIGHTS[pos] || 0.5; // 기본값: 0.5
}

/**
 * 구문 의존성 점수 계산
 * 문장 내에서 단어의 구문적 중요도를 추정합니다.
 *
 * @param {object} word - 단어 객체
 * @param {Array<object>} sentence - 문장의 단어 배열
 * @returns {number} 구문 의존성 점수 (0-1)
 */
function calculateSyntaxScore(word, sentence) {
  const { text, pos, position } = word;
  const sentenceLength = sentence.length;
  const relativePosition = position / sentenceLength;

  // 기본 점수
  let score = 0.5;

  // 품사별 구문적 중요도
  if (pos === 'NOUN') {
    // 명사는 주어나 목적어일 가능성이 높음
    // 문장 앞부분의 명사는 주어일 가능성
    if (relativePosition < 0.3) {
      score = 1.0; // 주어 위치
    } else if (relativePosition > 0.5) {
      score = 0.8; // 목적어 위치
    } else {
      score = 0.6; // 중간 위치
    }
  } else if (pos === 'VERB') {
    // 동사는 서술어로 중요
    score = 0.9;
  } else if (pos === 'ADJ' || pos === 'ADV') {
    // 수식어는 부가적
    score = 0.3;
  } else if (pos === 'ADP' || pos === 'CONJ') {
    // 조사, 접속사는 구조적 요소
    score = 0.1;
  }

  return score;
}

/**
 * 위치 점수 계산
 * 문장 내에서 앞쪽에 있는 단어일수록 높은 점수
 *
 * @param {number} position - 문장 내 단어 위치 (0부터 시작)
 * @param {number} sentenceLength - 문장 길이
 * @returns {number} 위치 점수 (0-1)
 */
function calculateLocationScore(position, sentenceLength) {
  if (sentenceLength <= 1) return 1.0;

  // 앞쪽 단어일수록 높은 점수
  return 1.0 - (position / sentenceLength);
}

/**
 * 단어 우선순위 계산
 *
 * @param {object} word - 단어 객체 { text, pos, position, tfidf }
 * @param {Array<object>} sentenceWords - 문장의 단어 배열
 * @param {number} sentenceLength - 문장 길이
 * @returns {number} 우선순위 점수 (0-1, 높을수록 중요)
 */
function calculateWordPriority(word, sentenceWords, sentenceLength) {
  // 1. TF-IDF 스코어 (이미 정규화되어 있음)
  const tfidfScore = word.normalizedTfidf || 0;

  // 2. 품사 점수
  const posScore = calculatePOSScore(word.pos);

  // 3. 구문 의존성 점수
  const syntaxScore = calculateSyntaxScore(word, sentenceWords);

  // 4. 위치 점수
  const locationScore = calculateLocationScore(word.position, sentenceLength);

  // 가중 평균 계산
  // P = 0.4×TF-IDF + 0.3×품사 + 0.2×구문의존성 + 0.1×위치
  const priority =
    0.4 * tfidfScore +
    0.3 * posScore +
    0.2 * syntaxScore +
    0.1 * locationScore;

  return Math.max(0, Math.min(1, priority)); // 0-1 범위로 클램핑
}

/**
 * 우선순위 그룹 결정
 *
 * @param {number} priority - 우선순위 점수
 * @returns {string} 그룹 이름 ('immediate', 'middle', 'late')
 */
function getPriorityGroup(priority) {
  if (priority < 0.3) {
    return 'immediate'; // 즉시 제거
  } else if (priority < 0.6) {
    return 'middle'; // 중간 제거
  } else {
    return 'late'; // 후반 제거
  }
}

/**
 * 텍스트의 모든 단어에 대해 우선순위 계산
 *
 * @param {string} text - 입력 텍스트
 * @returns {Array<object>} 우선순위가 계산된 단어 배열
 */
function calculatePrioritiesForText(text) {
  const { structureText } = require('../utils/textProcessor');

  // 텍스트 구조화
  const structured = structureText(text);
  const { words, sentences } = structured;

  // TF-IDF 계산
  const tfidfMap = computeTFIDFForText(text);
  const normalizedTfidfMap = normalizeTFIDF(tfidfMap);

  // 각 단어에 TF-IDF 정보 추가
  const enrichedWords = words.map(word => {
    const tfidfInfo = normalizedTfidfMap.get(word.text.toLowerCase());
    return {
      ...word,
      tfidf: tfidfInfo ? tfidfInfo.tfidf : 0,
      normalizedTfidf: tfidfInfo ? tfidfInfo.normalizedTfidf : 0
    };
  });

  // 문장별로 그룹화
  const wordsBySentence = {};
  enrichedWords.forEach(word => {
    if (!wordsBySentence[word.sentence]) {
      wordsBySentence[word.sentence] = [];
    }
    wordsBySentence[word.sentence].push(word);
  });

  // 각 단어의 우선순위 계산
  const wordsWithPriority = enrichedWords.map(word => {
    const sentenceWords = wordsBySentence[word.sentence] || [];
    const sentenceLength = sentenceWords.length;

    const priority = calculateWordPriority(word, sentenceWords, sentenceLength);
    const group = getPriorityGroup(priority);

    return {
      ...word,
      priority,
      priorityGroup: group
    };
  });

  // 우선순위별로 정렬 (낮은 것부터 - 먼저 제거될 단어들)
  wordsWithPriority.sort((a, b) => a.priority - b.priority);

  console.log(`✓ 단어 우선순위 계산 완료: ${wordsWithPriority.length}개 단어`);

  return wordsWithPriority;
}

/**
 * 우선순위 그룹별 단어 분류
 *
 * @param {Array<object>} words - 우선순위가 계산된 단어 배열
 * @returns {object} 그룹별 단어 배열
 */
function groupWordsByPriority(words) {
  const groups = {
    immediate: [], // P < 0.3: 즉시 제거
    middle: [],    // 0.3 ≤ P < 0.6: 중간 제거
    late: []       // P ≥ 0.6: 후반 제거
  };

  words.forEach(word => {
    groups[word.priorityGroup].push(word);
  });

  console.log(`✓ 우선순위 그룹 분류 완료`);
  console.log(`  - 즉시 제거: ${groups.immediate.length}개`);
  console.log(`  - 중간 제거: ${groups.middle.length}개`);
  console.log(`  - 후반 제거: ${groups.late.length}개`);

  return groups;
}

/**
 * 우선순위 통계 계산
 *
 * @param {Array<object>} words - 우선순위가 계산된 단어 배열
 * @returns {object} 통계 정보
 */
function calculatePriorityStats(words) {
  const priorities = words.map(w => w.priority);

  return {
    count: words.length,
    average: priorities.reduce((sum, p) => sum + p, 0) / priorities.length,
    min: Math.min(...priorities),
    max: Math.max(...priorities),
    median: priorities.sort((a, b) => a - b)[Math.floor(priorities.length / 2)]
  };
}

/**
 * 제거할 단어 선택
 * 목표 압축률에 따라 제거할 단어들을 선택합니다.
 *
 * @param {Array<object>} words - 우선순위가 계산된 단어 배열
 * @param {number} targetCompressionRate - 목표 압축률 (0-1, 예: 0.7 = 70%)
 * @returns {object} { toKeep: Array, toRemove: Array }
 */
function selectWordsToRemove(words, targetCompressionRate) {
  const totalWords = words.length;
  const targetWordCount = Math.floor(totalWords * targetCompressionRate);
  const removeCount = totalWords - targetWordCount;

  // 우선순위가 낮은 순서대로 이미 정렬되어 있음
  const toRemove = words.slice(0, removeCount);
  const toKeep = words.slice(removeCount);

  console.log(`✓ 제거 단어 선택 완료`);
  console.log(`  - 목표 압축률: ${(targetCompressionRate * 100).toFixed(0)}%`);
  console.log(`  - 유지: ${toKeep.length}개`);
  console.log(`  - 제거: ${toRemove.length}개`);

  return { toKeep, toRemove };
}

/**
 * 핵심 키워드 식별
 * 우선순위가 높은 상위 단어들을 핵심 키워드로 식별합니다.
 *
 * @param {Array<object>} words - 우선순위가 계산된 단어 배열
 * @param {number} topPercent - 상위 비율 (기본값: 20%)
 * @returns {Array<object>} 핵심 키워드 배열
 */
function identifyCoreKeywords(words, topPercent = 20) {
  const sortedByPriority = [...words].sort((a, b) => b.priority - a.priority);
  const count = Math.ceil(words.length * (topPercent / 100));

  return sortedByPriority.slice(0, count);
}

module.exports = {
  calculatePOSScore,
  calculateSyntaxScore,
  calculateLocationScore,
  calculateWordPriority,
  getPriorityGroup,
  calculatePrioritiesForText,
  groupWordsByPriority,
  calculatePriorityStats,
  selectWordsToRemove,
  identifyCoreKeywords,
  POS_WEIGHTS
};
