/**
 * Azure OpenAI 기반 요약 생성 서비스
 *
 * Azure OpenAI API를 호출하여 3단계 요약을 생성하는 핵심 서비스입니다.
 * Level 1: 70-80% 압축률
 * Level 2: 40-50% 압축률
 * Level 3: 10-20% 압축률
 */

const { getClient, withRetry, deploymentName } = require('../config/azure');
const { buildMessages, validatePromptInput } = require('../config/prompts');
const { calculateTextStats } = require('../utils/textProcessor');
const { analyzeKeywords } = require('./tfidf');

/**
 * Azure OpenAI API 호출
 * 주어진 메시지로 채팅 완성 요청을 보냅니다.
 *
 * @param {Array<object>} messages - OpenAI 메시지 배열
 * @param {object} options - API 호출 옵션
 * @returns {Promise<string>} 생성된 텍스트
 */
async function callAzureOpenAI(messages, options = {}) {
  const {
    maxTokens = 2000
  } = options;

  const client = getClient();

  try {
    const result = await client.chat.completions.create({
      model: deploymentName,
      messages: messages,
      max_completion_tokens: maxTokens
    });

    if (!result.choices || result.choices.length === 0) {
      throw new Error('Azure OpenAI API가 빈 응답을 반환했습니다.');
    }

    const content = result.choices[0].message.content;

    console.log(`✓ Azure OpenAI API 호출 성공`);
    console.log(`  - 입력 토큰: ${result.usage?.prompt_tokens || 'N/A'}`);
    console.log(`  - 출력 토큰: ${result.usage?.completion_tokens || 'N/A'}`);

    return content.trim();
  } catch (error) {
    console.error('✗ Azure OpenAI API 호출 실패:', error.message);
    throw error;
  }
}

/**
 * Level 0 문단 구분
 * 목표: 원문 텍스트를 읽기 좋게 문단으로 구분
 *
 * @param {string} text - 원문 텍스트
 * @returns {Promise<string>} 문단으로 구분된 텍스트
 */
async function formatLevel0Text(text) {
  console.log('Level 0 문단 구분 시작...');

  // 입력 검증
  if (!text || text.trim().length === 0) {
    throw new Error('텍스트가 비어있습니다.');
  }

  // 프롬프트 메시지 생성
  const messages = buildMessages(0, text);

  // API 호출 (재시도 로직 포함)
  const formatted = await withRetry(
    () => callAzureOpenAI(messages, { maxTokens: 16000 }),
    3,
    1000
  );

  console.log(`✓ Level 0 문단 구분 완료`);

  return formatted;
}

/**
 * Level 1 요약 생성
 * 목표: 70-80% 압축률, 키워드 보존률 90% 이상
 *
 * @param {string} text - 원문 텍스트
 * @returns {Promise<object>} 요약 결과
 */
async function generateLevel1Summary(text) {
  console.log('Level 1 요약 생성 시작...');

  // 입력 검증
  const validation = validatePromptInput(text, 1);
  if (!validation.valid) {
    throw new Error(`입력 검증 실패: ${validation.warnings.join(', ')}`);
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠ 경고:', validation.warnings.join(', '));
  }

  // 원문 통계
  const originalStats = calculateTextStats(text);

  // 원문 키워드 분석
  const keywordAnalysis = analyzeKeywords(text, { topPercent: 30 });
  const originalKeywords = keywordAnalysis.keywords.map(kw => kw.word);

  // 프롬프트 메시지 생성
  const messages = buildMessages(1, text);

  // API 호출 (재시도 로직 포함)
  const summary = await withRetry(
    () => callAzureOpenAI(messages, { maxTokens: 3000 }),
    3,
    1000
  );

  // 요약본 통계
  const summaryStats = calculateTextStats(summary);

  // 압축률 계산
  const compressionRate = summaryStats.wordCount / originalStats.wordCount;

  // 키워드 보존률 계산
  const summaryKeywordAnalysis = analyzeKeywords(summary);
  const summaryKeywords = summaryKeywordAnalysis.keywords.map(kw => kw.word);
  const preservedKeywords = originalKeywords.filter(kw =>
    summaryKeywords.includes(kw)
  );
  const keywordPreservationRate = preservedKeywords.length / originalKeywords.length;

  console.log(`✓ Level 1 요약 생성 완료`);
  console.log(`  - 압축률: ${(compressionRate * 100).toFixed(1)}%`);
  console.log(`  - 키워드 보존률: ${(keywordPreservationRate * 100).toFixed(1)}%`);

  return {
    level: 1,
    text: summary,
    metadata: {
      originalWordCount: originalStats.wordCount,
      summaryWordCount: summaryStats.wordCount,
      compressionRate,
      keywordsPreserved: preservedKeywords,
      keywordPreservationRate,
      targetCompressionRate: '70-80%',
      achieved: compressionRate >= 0.7 && compressionRate <= 0.8
    }
  };
}

/**
 * Level 2 요약 생성
 * 목표: 40-50% 압축률, 의미 유사도 0.75 이상
 *
 * @param {string} text - 입력 텍스트 (Level 1 요약본 권장)
 * @param {string} originalText - 원문 (유사도 계산용, 선택)
 * @returns {Promise<object>} 요약 결과
 */
async function generateLevel2Summary(text, originalText = null) {
  console.log('Level 2 요약 생성 시작...');

  // 입력 검증
  const validation = validatePromptInput(text, 2);
  if (!validation.valid) {
    throw new Error(`입력 검증 실패: ${validation.warnings.join(', ')}`);
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠ 경고:', validation.warnings.join(', '));
  }

  // 입력 통계
  const inputStats = calculateTextStats(text);

  // 프롬프트 메시지 생성
  const messages = buildMessages(2, text);

  // API 호출 (재시도 로직 포함)
  const summary = await withRetry(
    () => callAzureOpenAI(messages, { maxTokens: 2000 }),
    3,
    1000
  );

  // 요약본 통계
  const summaryStats = calculateTextStats(summary);

  // 압축률 계산
  const compressionRate = summaryStats.wordCount / inputStats.wordCount;

  // 의미 유사도는 간단한 키워드 오버랩으로 추정
  const inputKeywords = analyzeKeywords(text, { topPercent: 30 }).keywords.map(kw => kw.word);
  const summaryKeywords = analyzeKeywords(summary, { topPercent: 30 }).keywords.map(kw => kw.word);
  const overlap = inputKeywords.filter(kw => summaryKeywords.includes(kw)).length;
  const semanticSimilarity = overlap / Math.max(inputKeywords.length, 1);

  console.log(`✓ Level 2 요약 생성 완료`);
  console.log(`  - 압축률: ${(compressionRate * 100).toFixed(1)}%`);
  console.log(`  - 의미 유사도 (추정): ${(semanticSimilarity * 100).toFixed(1)}%`);

  return {
    level: 2,
    text: summary,
    metadata: {
      inputWordCount: inputStats.wordCount,
      summaryWordCount: summaryStats.wordCount,
      compressionRate,
      semanticSimilarity,
      targetCompressionRate: '40-50%',
      achieved: compressionRate >= 0.4 && compressionRate <= 0.5
    }
  };
}

/**
 * Level 3 요약 생성
 * 목표: 10-20% 압축률, 정보 보존률 60% 이상
 *
 * @param {string} text - 입력 텍스트 (Level 2 요약본 권장)
 * @returns {Promise<object>} 요약 결과
 */
async function generateLevel3Summary(text) {
  console.log('Level 3 요약 생성 시작...');

  // 입력 검증
  const validation = validatePromptInput(text, 3);
  if (!validation.valid) {
    throw new Error(`입력 검증 실패: ${validation.warnings.join(', ')}`);
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠ 경고:', validation.warnings.join(', '));
  }

  // 입력 통계
  const inputStats = calculateTextStats(text);

  // 프롬프트 메시지 생성
  const messages = buildMessages(3, text);

  // API 호출 (재시도 로직 포함)
  const summary = await withRetry(
    () => callAzureOpenAI(messages, { maxTokens: 1000 }),
    3,
    1000
  );

  // 요약본 통계
  const summaryStats = calculateTextStats(summary);

  // 압축률 계산
  const compressionRate = summaryStats.wordCount / inputStats.wordCount;

  // 문장 수 확인 (3-5문장 목표)
  const sentenceCount = summaryStats.sentenceCount;
  const sentenceGoalAchieved = sentenceCount >= 3 && sentenceCount <= 5;

  console.log(`✓ Level 3 요약 생성 완료`);
  console.log(`  - 압축률: ${(compressionRate * 100).toFixed(1)}%`);
  console.log(`  - 문장 수: ${sentenceCount}개`);

  return {
    level: 3,
    text: summary,
    metadata: {
      inputWordCount: inputStats.wordCount,
      summaryWordCount: summaryStats.wordCount,
      compressionRate,
      sentenceCount,
      sentenceGoalAchieved,
      targetCompressionRate: '10-20%',
      achieved: compressionRate >= 0.1 && compressionRate <= 0.2
    }
  };
}

/**
 * 전체 요약 생성 (Level 1, 2, 3)
 * 원문으로부터 3단계 요약을 순차적으로 생성합니다.
 *
 * @param {string} originalText - 원문 텍스트
 * @returns {Promise<object>} 전체 요약 결과
 */
async function generateAllSummaries(originalText) {
  console.log('='.repeat(60));
  console.log('전체 요약 생성 시작');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    // Level 1 요약 생성 (원문 기반)
    const level1 = await generateLevel1Summary(originalText);

    // Level 2 요약 생성 (Level 1 기반)
    const level2 = await generateLevel2Summary(level1.text, originalText);

    // Level 3 요약 생성 (Level 2 기반)
    const level3 = await generateLevel3Summary(level2.text);

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log('='.repeat(60));
    console.log(`✓ 전체 요약 생성 완료 (소요 시간: ${totalTime}초)`);
    console.log('='.repeat(60));

    return {
      original: {
        text: originalText,
        stats: calculateTextStats(originalText)
      },
      level1,
      level2,
      level3,
      metadata: {
        totalProcessingTime: totalTime,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('✗ 요약 생성 실패:', error.message);
    throw error;
  }
}

/**
 * 요약 품질 평가
 * 생성된 요약의 품질을 평가합니다.
 *
 * @param {object} summary - 요약 결과 객체
 * @returns {object} 품질 평가 결과
 */
function evaluateSummaryQuality(summary) {
  const { level, metadata } = summary;

  const quality = {
    level,
    compressionRateScore: 0,
    overallScore: 0,
    issues: []
  };

  // 압축률 평가
  if (level === 1) {
    const target = metadata.compressionRate >= 0.7 && metadata.compressionRate <= 0.8;
    quality.compressionRateScore = target ? 100 : 50;
    if (!target) {
      quality.issues.push(`압축률이 목표 범위(70-80%)를 벗어났습니다: ${(metadata.compressionRate * 100).toFixed(1)}%`);
    }

    // 키워드 보존률 평가
    if (metadata.keywordPreservationRate < 0.9) {
      quality.issues.push(`키워드 보존률이 목표(90%) 미달입니다: ${(metadata.keywordPreservationRate * 100).toFixed(1)}%`);
    }
  } else if (level === 2) {
    const target = metadata.compressionRate >= 0.4 && metadata.compressionRate <= 0.5;
    quality.compressionRateScore = target ? 100 : 50;
    if (!target) {
      quality.issues.push(`압축률이 목표 범위(40-50%)를 벗어났습니다: ${(metadata.compressionRate * 100).toFixed(1)}%`);
    }

    // 의미 유사도 평가
    if (metadata.semanticSimilarity < 0.75) {
      quality.issues.push(`의미 유사도가 목표(75%) 미달입니다: ${(metadata.semanticSimilarity * 100).toFixed(1)}%`);
    }
  } else if (level === 3) {
    const target = metadata.compressionRate >= 0.1 && metadata.compressionRate <= 0.2;
    quality.compressionRateScore = target ? 100 : 50;
    if (!target) {
      quality.issues.push(`압축률이 목표 범위(10-20%)를 벗어났습니다: ${(metadata.compressionRate * 100).toFixed(1)}%`);
    }

    // 문장 수 평가
    if (!metadata.sentenceGoalAchieved) {
      quality.issues.push(`문장 수가 목표(3-5문장)를 벗어났습니다: ${metadata.sentenceCount}문장`);
    }
  }

  // 전체 점수 계산
  quality.overallScore = quality.compressionRateScore;

  return quality;
}

module.exports = {
  callAzureOpenAI,
  formatLevel0Text,
  generateLevel1Summary,
  generateLevel2Summary,
  generateLevel3Summary,
  generateAllSummaries,
  evaluateSummaryQuality
};
