/**
 * 텍스트 전처리 모듈
 *
 * 원문 텍스트를 분석하고 구조화하는 기능을 제공합니다.
 * 문단, 문장, 단어 단위로 분해하고 메타데이터를 추출합니다.
 */

const fs = require('fs').promises;
const path = require('path');
const natural = require('natural');

// Natural 라이브러리 토크나이저 및 품사 태거 초기화
const tokenizer = new natural.WordTokenizer();
const sentenceTokenizer = new natural.SentenceTokenizer();

/**
 * 텍스트 파일 로딩
 * 지정된 경로의 텍스트 파일을 읽어옵니다.
 *
 * @param {string} filename - 파일 이름 (기본값: 'example.txt')
 * @returns {Promise<string>} 파일 내용
 */
async function loadTextFile(filename = 'example.txt') {
  try {
    const filePath = path.join(__dirname, '../..', filename);
    const content = await fs.readFile(filePath, 'utf-8');

    console.log(`✓ 텍스트 파일 로드 완료: ${filename}`);
    console.log(`  - 파일 크기: ${content.length} 문자`);

    return content;
  } catch (error) {
    console.error(`✗ 텍스트 파일 로드 실패: ${filename}`, error.message);
    throw new Error(`파일을 읽을 수 없습니다: ${filename}`);
  }
}

/**
 * 문단 구조 파싱
 * 빈 줄을 기준으로 텍스트를 문단으로 분리합니다.
 *
 * @param {string} text - 원문 텍스트
 * @returns {Array<string>} 문단 배열
 */
function parseParagraphs(text) {
  // 빈 줄(2개 이상의 연속된 개행)을 기준으로 문단 분리
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  console.log(`✓ 문단 파싱 완료: ${paragraphs.length}개 문단`);

  return paragraphs;
}

/**
 * 문장 토큰화
 * 텍스트를 문장 단위로 분리합니다.
 *
 * @param {string} text - 입력 텍스트
 * @returns {Array<string>} 문장 배열
 */
function tokenizeSentences(text) {
  // Natural의 SentenceTokenizer 사용
  const sentences = sentenceTokenizer.tokenize(text);

  return sentences.filter(s => s.trim().length > 0);
}

/**
 * 단어 토큰화 및 정규화
 * 텍스트를 단어 단위로 분리하고 정규화합니다.
 *
 * @param {string} text - 입력 텍스트
 * @param {object} options - 옵션
 * @param {boolean} options.lowercase - 소문자 변환 여부 (기본값: false)
 * @param {boolean} options.removeSpecialChars - 특수문자 제거 여부 (기본값: false)
 * @returns {Array<string>} 단어 배열
 */
function tokenizeWords(text, options = {}) {
  const { lowercase = false, removeSpecialChars = false } = options;

  let words = tokenizer.tokenize(text);

  if (removeSpecialChars) {
    // 특수문자만으로 이루어진 토큰 제거
    words = words.filter(word => /[a-zA-Z가-힣0-9]/.test(word));
  }

  if (lowercase) {
    words = words.map(word => word.toLowerCase());
  }

  return words;
}

/**
 * 품사 태깅 (한국어 지원 제한적)
 * Natural 라이브러리는 영어 위주이므로, 간단한 품사 추정을 수행합니다.
 *
 * @param {string} word - 단어
 * @returns {string} 품사 태그 (NOUN, VERB, ADJ, ADV, ADP, DET, CONJ, etc.)
 */
function estimatePOS(word) {
  // 한국어 조사 패턴
  const koreanParticles = /[은는이가을를에게서와과도만]/;

  // 한국어 어미 패턴
  const koreanEndings = /(다|요|ㅂ니다|습니다|세요|하다|되다|이다)$/;

  // 영어 품사 추정 (간단한 휴리스틱)
  const conjunctions = ['and', 'or', 'but', 'yet', 'so', 'for', 'nor'];
  const prepositions = ['in', 'on', 'at', 'by', 'with', 'from', 'to', 'of'];
  const determiners = ['a', 'an', 'the', 'this', 'that', 'these', 'those'];

  const lowerWord = word.toLowerCase();

  // 영어 단어 판단
  if (/^[a-zA-Z]+$/.test(word)) {
    if (conjunctions.includes(lowerWord)) return 'CONJ';
    if (prepositions.includes(lowerWord)) return 'ADP';
    if (determiners.includes(lowerWord)) return 'DET';
    if (lowerWord.endsWith('ly')) return 'ADV';
    if (lowerWord.endsWith('ing') || lowerWord.endsWith('ed')) return 'VERB';
    return 'NOUN'; // 기본값
  }

  // 한국어 단어 판단
  if (koreanParticles.test(word)) return 'ADP';
  if (koreanEndings.test(word)) return 'VERB';

  // 숫자
  if (/^\d+$/.test(word)) return 'NUM';

  // 기본값: 명사로 간주
  return 'NOUN';
}

/**
 * 텍스트 구조화
 * 텍스트를 분석하여 구조화된 데이터로 변환합니다.
 *
 * @param {string} text - 원문 텍스트
 * @returns {object} 구조화된 텍스트 데이터
 */
function structureText(text) {
  const paragraphs = parseParagraphs(text);
  const allSentences = [];
  const allWords = [];

  let wordPosition = 0;
  let sentenceIndex = 0;

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const sentences = tokenizeSentences(paragraph);

    sentences.forEach(sentence => {
      const words = tokenizeWords(sentence);

      words.forEach(word => {
        allWords.push({
          text: word,
          position: wordPosition++,
          sentence: sentenceIndex,
          paragraph: paragraphIndex,
          pos: estimatePOS(word)
        });
      });

      allSentences.push({
        text: sentence,
        index: sentenceIndex++,
        paragraph: paragraphIndex,
        wordCount: words.length
      });
    });
  });

  console.log(`✓ 텍스트 구조화 완료`);
  console.log(`  - 문단: ${paragraphs.length}개`);
  console.log(`  - 문장: ${allSentences.length}개`);
  console.log(`  - 단어: ${allWords.length}개`);

  return {
    originalText: text,
    paragraphs,
    sentences: allSentences,
    words: allWords,
    metadata: {
      paragraphCount: paragraphs.length,
      sentenceCount: allSentences.length,
      wordCount: allWords.length,
      charCount: text.length
    }
  };
}

/**
 * 문단 정리 및 포맷팅
 * 텍스트의 문단 구조를 가다듬어 표시합니다.
 *
 * @param {string} text - 원문 텍스트
 * @returns {string} 정리된 텍스트
 */
function formatParagraphs(text) {
  const paragraphs = parseParagraphs(text);

  // 각 문단을 정리하고 이중 개행으로 연결
  // 문단 내 줄바꿈은 공백으로, 연속 공백은 하나로
  return paragraphs
    .map(p => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .join('\n\n');
}

/**
 * 텍스트 정리
 * 불필요한 공백, 특수문자 등을 제거합니다.
 *
 * @param {string} text - 입력 텍스트
 * @param {object} options - 정리 옵션
 * @returns {string} 정리된 텍스트
 */
function cleanText(text, options = {}) {
  const {
    removeExtraSpaces = true,
    removeLineNumbers = true,
    normalizeWhitespace = true
  } = options;

  let cleaned = text;

  // 줄 번호 제거 (예: "1→", "123→")
  if (removeLineNumbers) {
    cleaned = cleaned.replace(/^\s*\d+→/gm, '');
  }

  // 공백 정규화
  if (normalizeWhitespace) {
    cleaned = cleaned.replace(/[ \t]+/g, ' '); // 연속 공백을 하나로
  }

  // 불필요한 공백 제거
  if (removeExtraSpaces) {
    cleaned = cleaned.replace(/^\s+|\s+$/gm, ''); // 각 줄의 앞뒤 공백 제거
  }

  return cleaned;
}

/**
 * 텍스트 통계 계산
 * 텍스트의 기본 통계 정보를 계산합니다.
 *
 * @param {string} text - 입력 텍스트
 * @returns {object} 통계 정보
 */
function calculateTextStats(text) {
  const paragraphs = parseParagraphs(text);
  const allSentences = paragraphs.flatMap(p => tokenizeSentences(p));
  const allWords = allSentences.flatMap(s => tokenizeWords(s));

  return {
    charCount: text.length,
    paragraphCount: paragraphs.length,
    sentenceCount: allSentences.length,
    wordCount: allWords.length,
    avgWordsPerSentence: (allWords.length / allSentences.length).toFixed(2),
    avgSentencesPerParagraph: (allSentences.length / paragraphs.length).toFixed(2)
  };
}

/**
 * example.txt 파일 로드 및 전처리
 * 프로젝트의 샘플 텍스트 파일을 로드하고 전처리합니다.
 *
 * @returns {Promise<object>} 전처리된 텍스트 데이터
 */
async function loadAndProcessExampleText() {
  try {
    const rawText = await loadTextFile('example.txt');
    // formatParagraphs가 자체적으로 정리하므로 cleanText 불필요
    const formattedText = formatParagraphs(rawText);
    const structured = structureText(formattedText);
    const stats = calculateTextStats(formattedText);

    return {
      raw: rawText,
      cleaned: rawText,
      formatted: formattedText,
      structured,
      stats
    };
  } catch (error) {
    console.error('✗ example.txt 처리 실패:', error.message);
    throw error;
  }
}

module.exports = {
  loadTextFile,
  parseParagraphs,
  tokenizeSentences,
  tokenizeWords,
  estimatePOS,
  structureText,
  formatParagraphs,
  cleanText,
  calculateTextStats,
  loadAndProcessExampleText
};
