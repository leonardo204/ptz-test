/**
 * Azure OpenAI 설정 및 클라이언트 초기화
 *
 * 이 모듈은 Azure OpenAI API와의 연결을 관리합니다.
 * 환경 변수를 통해 API 키와 엔드포인트를 로드하고,
 * 클라이언트 인스턴스를 생성하여 내보냅니다.
 */

const { AzureOpenAI } = require("openai");
require('dotenv').config();

/**
 * 환경 변수 검증
 * 필수 환경 변수가 설정되지 않았을 경우 에러를 발생시킵니다.
 */
function validateEnvironmentVariables() {
  const required = [
    'AZURE_OPENAI_API_KEY',
    'ENDPOINT_URL',
    'DEPLOYMENT_NAME'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `필수 환경 변수가 설정되지 않았습니다: ${missing.join(', ')}\n` +
      '.env 파일을 확인하거나 환경 변수를 설정해주세요.'
    );
  }

  console.log('✓ Azure OpenAI 환경 변수 검증 완료');
}

/**
 * Azure OpenAI 클라이언트 생성
 *
 * @returns {AzureOpenAI} Azure OpenAI 클라이언트 인스턴스
 */
function createAzureOpenAIClient() {
  try {
    validateEnvironmentVariables();

    const endpoint = process.env.ENDPOINT_URL;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.API_VERSION || '2025-01-01-preview';

    // Azure OpenAI 클라이언트 초기화
    const client = new AzureOpenAI({
      endpoint: endpoint,
      apiKey: apiKey,
      apiVersion: apiVersion,
      deployment: process.env.DEPLOYMENT_NAME
    });

    console.log('✓ Azure OpenAI 클라이언트 초기화 완료');
    console.log(`  - 엔드포인트: ${endpoint}`);
    console.log(`  - 배포 이름: ${process.env.DEPLOYMENT_NAME}`);
    console.log(`  - API 버전: ${apiVersion}`);

    return client;
  } catch (error) {
    console.error('✗ Azure OpenAI 클라이언트 초기화 실패:', error.message);
    throw error;
  }
}

/**
 * Azure OpenAI API 연결 테스트
 * 간단한 요청을 보내서 API 연결이 정상적으로 작동하는지 확인합니다.
 *
 * @param {AzureOpenAI} client - Azure OpenAI 클라이언트
 * @returns {Promise<boolean>} 연결 성공 여부
 */
async function testConnection(client) {
  try {
    console.log('Azure OpenAI API 연결 테스트 중...');

    const deploymentName = process.env.DEPLOYMENT_NAME;
    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello" }
    ];

    const result = await client.chat.completions.create({
      model: deploymentName,
      messages: messages,
      max_completion_tokens: 10
    });

    if (result.choices && result.choices.length > 0) {
      console.log('✓ Azure OpenAI API 연결 테스트 성공');
      console.log(`  - 응답: ${result.choices[0].message.content}`);
      return true;
    } else {
      throw new Error('API 응답이 비어있습니다.');
    }
  } catch (error) {
    console.error('✗ Azure OpenAI API 연결 테스트 실패:', error.message);

    // 에러 타입별 상세 메시지
    if (error.status === 401) {
      console.error('  → API 키가 유효하지 않습니다. AZURE_OPENAI_API_KEY를 확인하세요.');
    } else if (error.status === 404) {
      console.error('  → 배포를 찾을 수 없습니다. DEPLOYMENT_NAME을 확인하세요.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('  → 엔드포인트 URL이 잘못되었습니다. ENDPOINT_URL을 확인하세요.');
    }

    return false;
  }
}

/**
 * 재시도 로직이 포함된 API 호출 래퍼
 *
 * @param {Function} apiCall - 실행할 API 호출 함수
 * @param {number} maxRetries - 최대 재시도 횟수 (기본값: 3)
 * @param {number} baseDelay - 기본 지연 시간(ms) (기본값: 1000)
 * @returns {Promise<any>} API 호출 결과
 */
async function withRetry(apiCall, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // 재시도 불가능한 에러 (인증 실패, 잘못된 요청 등)
      if (error.status === 401 || error.status === 400) {
        throw error;
      }

      if (attempt < maxRetries) {
        // 지수 백오프 계산 (1초, 2초, 4초)
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`  재시도 ${attempt}/${maxRetries} - ${delay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Azure OpenAI 클라이언트 싱글톤 인스턴스
let clientInstance = null;

/**
 * Azure OpenAI 클라이언트 인스턴스 가져오기
 * 싱글톤 패턴으로 하나의 인스턴스만 생성합니다.
 *
 * @returns {AzureOpenAI} Azure OpenAI 클라이언트 인스턴스
 */
function getClient() {
  if (!clientInstance) {
    clientInstance = createAzureOpenAIClient();
  }
  return clientInstance;
}

module.exports = {
  getClient,
  testConnection,
  withRetry,
  deploymentName: process.env.DEPLOYMENT_NAME
};
