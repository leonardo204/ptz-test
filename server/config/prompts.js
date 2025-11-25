/**
 * LLM 프롬프트 템플릿 시스템
 *
 * 각 요약 레벨별로 최적화된 프롬프트를 관리합니다.
 * 프롬프트는 동적으로 컨텍스트를 주입할 수 있으며,
 * 각 레벨의 목표 압축률과 품질 기준을 명시합니다.
 */

/**
 * 시스템 프롬프트 - 모든 요약에 공통으로 적용
 */
const SYSTEM_PROMPT = `당신은 전문적인 텍스트 요약 AI입니다.
주어진 텍스트를 정확하고 간결하게 요약하되, 핵심 의미와 맥락을 보존해야 합니다.
한국어 텍스트는 한국어로, 영어 텍스트는 영어로 요약합니다.`;

/**
 * Level 1 요약 프롬프트
 * 목표: 70-80% 압축률, 키워드 보존률 90% 이상
 * 전략: 부연 설명과 예시 제거, 핵심 내용만 유지
 */
const LEVEL1_PROMPT = {
  name: "Level 1 - 1차 요약",
  targetCompression: "70-80%",
  keywordPreservation: "90% 이상",
  template: `다음 텍스트에서 부연 설명과 예시를 제거하고 핵심 내용만 유지하세요.

**중요한 규칙:**
1. 원문의 핵심 단어(키워드)는 반드시 그대로 유지하세요
2. 문장 구조를 최대한 보존하세요
3. 고유명사, 인명, 지명은 절대 변경하지 마세요
4. 원문의 70-80% 길이로 압축하세요
5. 주요 사실, 핵심 논점, 중요 통계는 유지하세요

**원문:**
{{text}}

**요약:**`,

  /**
   * 프롬프트에 텍스트를 주입하여 완성된 프롬프트 생성
   * @param {string} text - 요약할 원문 텍스트
   * @returns {string} 완성된 프롬프트
   */
  build(text) {
    return this.template.replace('{{text}}', text);
  }
};

/**
 * Level 2 요약 프롬프트
 * 목표: 40-50% 압축률, 의미 유사도 0.75 이상
 * 전략: 핵심 주장과 결론 중심 요약, 단어 재구성 허용
 */
const LEVEL2_PROMPT = {
  name: "Level 2 - 2차 요약",
  targetCompression: "40-50%",
  semanticSimilarity: "0.75 이상",
  template: `다음 텍스트를 핵심 주장과 결론을 중심으로 요약하세요.

**중요한 규칙:**
1. 의미 보존이 최우선이며, 단어 재구성을 허용합니다
2. 세부 내용은 생략하되, 전체 맥락은 유지하세요
3. 메인 아이디어와 주요 발견사항을 중심으로 요약하세요
4. 원문의 40-50% 길이로 압축하세요
5. 중복되는 내용은 통합하세요

**원문:**
{{text}}

**요약:**`,

  /**
   * 프롬프트에 텍스트를 주입하여 완성된 프롬프트 생성
   * @param {string} text - 요약할 텍스트 (Level 1 요약본 권장)
   * @returns {string} 완성된 프롬프트
   */
  build(text) {
    return this.template.replace('{{text}}', text);
  }
};

/**
 * Level 0 문단 구분 프롬프트
 * 목표: 원문 텍스트를 읽기 좋게 문단으로 구분
 * 전략: 의미 단위로 문단 나누기, 내용 변경 없음
 */
const LEVEL0_FORMAT_PROMPT = {
  name: "Level 0 - 문단 구분",
  template: `다음 텍스트를 읽기 좋게 문단으로 나누세요.

**중요한 규칙:**
1. 텍스트 내용을 절대 변경하거나 요약하지 마세요
2. 단어를 추가하거나 삭제하지 마세요
3. 의미 단위로 문단을 나누되, 원문 그대로 유지하세요
4. 각 문단 사이에 빈 줄을 추가하세요
5. 문단은 3-5문장 정도로 구성하세요

**원문:**
{{text}}

**문단 구분된 텍스트:**`,

  /**
   * 프롬프트에 텍스트를 주입하여 완성된 프롬프트 생성
   * @param {string} text - 구분할 원문 텍스트
   * @returns {string} 완성된 프롬프트
   */
  build(text) {
    return this.template.replace('{{text}}', text);
  }
};

/**
 * Level 3 요약 프롬프트
 * 목표: 10-20% 압축률, 정보 보존률 60% 이상
 * 전략: Abstractive 요약, 핵심만 추출한 새로운 문장 생성
 */
const LEVEL3_PROMPT = {
  name: "Level 3 - 최종 요약",
  targetCompression: "10-20%",
  informationPreservation: "60% 이상",
  template: `다음 텍스트를 3-5문장으로 핵심만 추출하여 요약하세요.

**중요한 규칙:**
1. 전체 내용의 핵심 메시지와 결론만 포함하세요
2. 3-5문장으로 간결하게 작성하세요
3. 원문의 10-20% 길이로 압축하세요
4. 새로운 문장 구성이 허용되지만, 원문의 의미는 보존하세요
5. 가장 중요한 정보만 선별하세요

**원문:**
{{text}}

**요약:**`,

  /**
   * 프롬프트에 텍스트를 주입하여 완성된 프롬프트 생성
   * @param {string} text - 요약할 텍스트 (Level 2 요약본 권장)
   * @returns {string} 완성된 프롬프트
   */
  build(text) {
    return this.template.replace('{{text}}', text);
  }
};

/**
 * 레벨에 따른 프롬프트 가져오기
 *
 * @param {number} level - 요약 레벨 (0, 1, 2, 3)
 * @returns {object} 해당 레벨의 프롬프트 객체
 * @throws {Error} 유효하지 않은 레벨인 경우
 */
function getPromptForLevel(level) {
  const prompts = {
    0: LEVEL0_FORMAT_PROMPT,
    1: LEVEL1_PROMPT,
    2: LEVEL2_PROMPT,
    3: LEVEL3_PROMPT
  };

  if (!prompts[level]) {
    throw new Error(`유효하지 않은 레벨입니다: ${level}. 0, 1, 2, 3 중 하나를 선택하세요.`);
  }

  return prompts[level];
}

/**
 * 완성된 메시지 배열 생성
 * Azure OpenAI API에 전달할 메시지 형식으로 변환합니다.
 *
 * @param {number} level - 요약 레벨 (1, 2, 3)
 * @param {string} text - 요약할 텍스트
 * @param {object} options - 추가 옵션
 * @param {string} options.systemPrompt - 커스텀 시스템 프롬프트 (선택)
 * @returns {Array} OpenAI API 메시지 배열
 */
function buildMessages(level, text, options = {}) {
  const prompt = getPromptForLevel(level);
  const systemPrompt = options.systemPrompt || SYSTEM_PROMPT;

  return [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: prompt.build(text)
    }
  ];
}

/**
 * 프롬프트 메타데이터 조회
 * 특정 레벨의 프롬프트 정보를 반환합니다.
 *
 * @param {number} level - 요약 레벨 (1, 2, 3)
 * @returns {object} 프롬프트 메타데이터
 */
function getPromptMetadata(level) {
  const prompt = getPromptForLevel(level);

  return {
    name: prompt.name,
    targetCompression: prompt.targetCompression,
    keywordPreservation: prompt.keywordPreservation,
    semanticSimilarity: prompt.semanticSimilarity,
    informationPreservation: prompt.informationPreservation
  };
}

/**
 * 모든 레벨의 프롬프트 정보 조회
 *
 * @returns {Array} 전체 프롬프트 메타데이터 배열
 */
function getAllPromptMetadata() {
  return [1, 2, 3].map(level => ({
    level,
    ...getPromptMetadata(level)
  }));
}

/**
 * 프롬프트 유효성 검사
 * 텍스트 길이나 내용이 프롬프트 제약조건을 만족하는지 확인합니다.
 *
 * @param {string} text - 검사할 텍스트
 * @param {number} level - 요약 레벨
 * @returns {object} 검사 결과 { valid: boolean, warnings: string[] }
 */
function validatePromptInput(text, level) {
  const warnings = [];

  // 텍스트 길이 검사
  if (!text || text.trim().length === 0) {
    return { valid: false, warnings: ['텍스트가 비어있습니다.'] };
  }

  // 최소 길이 검사 (10자 이상)
  if (text.length < 10) {
    warnings.push('텍스트가 너무 짧습니다. 요약이 의미가 없을 수 있습니다.');
  }

  // 최대 길이 검사 (토큰 제한 고려 - 약 100,000자)
  if (text.length > 100000) {
    warnings.push('텍스트가 너무 깁니다. 청킹 처리가 필요할 수 있습니다.');
  }

  // 레벨별 권장 입력 검사
  if (level === 2 && text.length > 50000) {
    warnings.push('Level 2는 Level 1 요약본을 입력으로 사용하는 것을 권장합니다.');
  }

  if (level === 3 && text.length > 30000) {
    warnings.push('Level 3는 Level 2 요약본을 입력으로 사용하는 것을 권장합니다.');
  }

  return {
    valid: warnings.length === 0 || warnings.every(w => !w.includes('비어있습니다')),
    warnings
  };
}

module.exports = {
  SYSTEM_PROMPT,
  LEVEL0_FORMAT_PROMPT,
  LEVEL1_PROMPT,
  LEVEL2_PROMPT,
  LEVEL3_PROMPT,
  getPromptForLevel,
  buildMessages,
  getPromptMetadata,
  getAllPromptMetadata,
  validatePromptInput
};
