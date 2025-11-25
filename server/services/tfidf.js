/**
 * TF-IDF 계산 엔진
 *
 * 단어 중요도를 계산하는 TF-IDF 알고리즘을 구현합니다.
 * 이는 단어 우선순위 계산의 핵심 요소입니다.
 */

const natural = require('natural');
const TfIdf = natural.TfIdf;

/**
 * 한국어/영어 불용어 목록
 * TF-IDF 계산 시 제외할 단어들
 */
const KOREAN_STOPWORDS = [
  '은', '는', '이', '가', '을', '를', '에', '의', '와', '과',
  '도', '로', '으로', '만', '에서', '께서', '부터', '까지',
  '한', '그', '저', '이런', '그런', '저런', '것', '수', '등',
  '및', '또는', '그리고', '하지만', '그러나', '그래서'
];

const ENGLISH_STOPWORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
  'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are',
  'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
];

const ALL_STOPWORDS = [...KOREAN_STOPWORDS, ...ENGLISH_STOPWORDS];

/**
 * 불용어 여부 확인
 *
 * @param {string} word - 검사할 단어
 * @returns {boolean} 불용어 여부
 */
function isStopword(word) {
  return ALL_STOPWORDS.includes(word.toLowerCase());
}

/**
 * TF (Term Frequency) 계산
 * 문서 내에서 특정 단어의 빈도를 계산합니다.
 *
 * @param {string} word - 대상 단어
 * @param {Array<string>} words - 문서의 전체 단어 배열
 * @returns {number} TF 값 (0-1 범위)
 */
function calculateTF(word, words) {
  const wordCount = words.filter(w => w === word).length;
  const totalWords = words.length;

  if (totalWords === 0) return 0;

  // 정규화된 TF 값 반환
  return wordCount / totalWords;
}

/**
 * IDF (Inverse Document Frequency) 계산
 * 단어가 여러 문서에서 얼마나 흔한지 계산합니다.
 *
 * @param {string} word - 대상 단어
 * @param {Array<Array<string>>} documents - 문서들의 단어 배열
 * @returns {number} IDF 값
 */
function calculateIDF(word, documents) {
  const totalDocuments = documents.length;
  const documentsWithWord = documents.filter(doc => doc.includes(word)).length;

  if (documentsWithWord === 0) return 0;

  // IDF = log(전체 문서 수 / 단어가 포함된 문서 수)
  return Math.log(totalDocuments / documentsWithWord);
}

/**
 * TF-IDF 스코어 계산
 *
 * @param {string} word - 대상 단어
 * @param {Array<string>} documentWords - 현재 문서의 단어 배열
 * @param {Array<Array<string>>} allDocuments - 전체 문서들의 단어 배열
 * @returns {number} TF-IDF 값
 */
function calculateTFIDF(word, documentWords, allDocuments) {
  const tf = calculateTF(word, documentWords);
  const idf = calculateIDF(word, allDocuments);

  return tf * idf;
}

/**
 * 텍스트를 문서로 분할
 * 문단 단위로 문서를 나눕니다.
 *
 * @param {string} text - 입력 텍스트
 * @returns {Array<Array<string>>} 문서별 단어 배열
 */
function splitIntoDocuments(text) {
  const { parseParagraphs, tokenizeWords } = require('../utils/textProcessor');

  const paragraphs = parseParagraphs(text);
  return paragraphs.map(p => tokenizeWords(p, { lowercase: true }));
}

/**
 * 전체 텍스트의 TF-IDF 계산
 * 텍스트의 모든 고유 단어에 대해 TF-IDF를 계산합니다.
 *
 * @param {string} text - 입력 텍스트
 * @param {object} options - 옵션
 * @param {boolean} options.removeStopwords - 불용어 제거 여부 (기본값: true)
 * @param {number} options.minWordLength - 최소 단어 길이 (기본값: 2)
 * @returns {Map<string, object>} 단어별 TF-IDF 정보
 */
function computeTFIDFForText(text, options = {}) {
  const { removeStopwords = true, minWordLength = 2 } = options;
  const { tokenizeWords } = require('../utils/textProcessor');

  // 문서 분할 (문단 단위)
  const documents = splitIntoDocuments(text);

  // 전체 단어 추출
  const allWords = tokenizeWords(text, { lowercase: true });

  // 고유 단어 추출
  let uniqueWords = [...new Set(allWords)];

  // 필터링
  if (removeStopwords) {
    uniqueWords = uniqueWords.filter(word => !isStopword(word));
  }

  uniqueWords = uniqueWords.filter(word => word.length >= minWordLength);

  // TF-IDF 계산
  const tfidfMap = new Map();

  uniqueWords.forEach(word => {
    const tf = calculateTF(word, allWords);
    const idf = calculateIDF(word, documents);
    const tfidf = tf * idf;

    tfidfMap.set(word, {
      word,
      tf,
      idf,
      tfidf,
      frequency: allWords.filter(w => w === word).length
    });
  });

  console.log(`✓ TF-IDF 계산 완료: ${uniqueWords.length}개 단어`);

  return tfidfMap;
}

/**
 * TF-IDF 스코어 정규화 (0-1 범위)
 *
 * @param {Map<string, object>} tfidfMap - TF-IDF 맵
 * @returns {Map<string, object>} 정규화된 TF-IDF 맵
 */
function normalizeTFIDF(tfidfMap) {
  const scores = Array.from(tfidfMap.values()).map(item => item.tfidf);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  const range = maxScore - minScore;

  if (range === 0) {
    // 모든 스코어가 같은 경우
    tfidfMap.forEach(item => {
      item.normalizedTfidf = 0.5;
    });
    return tfidfMap;
  }

  // Min-Max 정규화
  tfidfMap.forEach(item => {
    item.normalizedTfidf = (item.tfidf - minScore) / range;
  });

  console.log(`✓ TF-IDF 정규화 완료 (범위: 0-1)`);

  return tfidfMap;
}

/**
 * 상위 키워드 추출
 * TF-IDF 스코어가 높은 상위 N개 또는 상위 N% 단어를 추출합니다.
 *
 * @param {Map<string, object>} tfidfMap - TF-IDF 맵
 * @param {object} options - 옵션
 * @param {number} options.topN - 상위 N개 (선택)
 * @param {number} options.topPercent - 상위 N% (선택, 기본값: 30)
 * @returns {Array<object>} 상위 키워드 배열
 */
function extractTopKeywords(tfidfMap, options = {}) {
  const { topN, topPercent = 30 } = options;

  // TF-IDF 스코어 기준 내림차순 정렬
  const sortedWords = Array.from(tfidfMap.values())
    .sort((a, b) => b.tfidf - a.tfidf);

  let keywords;

  if (topN) {
    // 상위 N개 추출
    keywords = sortedWords.slice(0, topN);
  } else {
    // 상위 N% 추출
    const count = Math.ceil(sortedWords.length * (topPercent / 100));
    keywords = sortedWords.slice(0, count);
  }

  console.log(`✓ 상위 키워드 추출: ${keywords.length}개 (전체 ${sortedWords.length}개 중)`);

  return keywords;
}

/**
 * Natural 라이브러리의 TfIdf 클래스 사용 (대안 구현)
 * 더 최적화된 Natural 라이브러리의 구현을 사용합니다.
 *
 * @param {string} text - 입력 텍스트
 * @returns {Array<object>} TF-IDF 결과 배열
 */
function computeWithNaturalLib(text) {
  const { parseParagraphs } = require('../utils/textProcessor');
  const paragraphs = parseParagraphs(text);

  const tfidf = new TfIdf();

  // 각 문단을 문서로 추가
  paragraphs.forEach(paragraph => {
    tfidf.addDocument(paragraph);
  });

  // 전체 단어의 TF-IDF 계산
  const results = [];
  const processedWords = new Set();

  tfidf.documents.forEach((doc, docIndex) => {
    tfidf.listTerms(docIndex).forEach(item => {
      if (!processedWords.has(item.term)) {
        processedWords.add(item.term);
        results.push({
          word: item.term,
          tfidf: item.tfidf,
          frequency: doc[item.term] || 0
        });
      }
    });
  });

  // TF-IDF 기준 내림차순 정렬
  results.sort((a, b) => b.tfidf - a.tfidf);

  console.log(`✓ Natural 라이브러리로 TF-IDF 계산 완료: ${results.length}개 단어`);

  return results;
}

/**
 * 키워드 중요도 분석
 * 텍스트에서 중요한 키워드를 추출하고 분석합니다.
 *
 * @param {string} text - 입력 텍스트
 * @param {object} options - 옵션
 * @returns {object} 키워드 분석 결과
 */
function analyzeKeywords(text, options = {}) {
  const { topPercent = 30 } = options;

  // TF-IDF 계산
  const tfidfMap = computeTFIDFForText(text, options);

  // 정규화
  const normalizedMap = normalizeTFIDF(tfidfMap);

  // 상위 키워드 추출
  const topKeywords = extractTopKeywords(normalizedMap, { topPercent });

  // 통계 정보
  const stats = {
    totalUniqueWords: tfidfMap.size,
    topKeywordsCount: topKeywords.length,
    topKeywordsPercent: topPercent,
    averageTFIDF: Array.from(tfidfMap.values())
      .reduce((sum, item) => sum + item.tfidf, 0) / tfidfMap.size
  };

  return {
    keywords: topKeywords,
    allWords: Array.from(normalizedMap.values()),
    stats
  };
}

/**
 * 단어가 키워드인지 확인
 *
 * @param {string} word - 검사할 단어
 * @param {Array<object>} keywords - 키워드 배열
 * @returns {boolean} 키워드 여부
 */
function isKeyword(word, keywords) {
  return keywords.some(kw => kw.word.toLowerCase() === word.toLowerCase());
}

module.exports = {
  calculateTF,
  calculateIDF,
  calculateTFIDF,
  computeTFIDFForText,
  normalizeTFIDF,
  extractTopKeywords,
  computeWithNaturalLib,
  analyzeKeywords,
  isKeyword,
  isStopword,
  KOREAN_STOPWORDS,
  ENGLISH_STOPWORDS
};
