/**
 * Express API 서버
 *
 * 클라이언트 요청을 처리하는 RESTful API 엔드포인트를 제공합니다.
 * 포트 3135에서 실행되며, 요약 생성 및 텍스트 처리 기능을 제공합니다.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// 서비스 및 유틸리티 모듈
const { loadAndProcessExampleText, loadTextFile, formatParagraphs } = require('./utils/textProcessor');
const { analyzeDifference, analyzeDetailedDifference } = require('./services/wordMatcher');
const { getCacheStats, logCacheStats } = require('./utils/cache');

// Express 앱 초기화
const app = express();
const PORT = process.env.PORT || 3135;

// 미들웨어 설정
app.use(cors()); // CORS 허용
app.use(express.json({ limit: '10mb' })); // JSON 파싱 (최대 10MB)
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL-encoded 파싱

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// API 엔드포인트
// ============================================================

/**
 * GET /
 * 헬스 체크 엔드포인트
 */
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Pinch-to-Zoom Summarizer API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/health
 * 상세 헬스 체크
 */
app.get('/api/health', async (req, res) => {
  try {
    // 캐시 통계
    const cacheStats = getCacheStats();

    res.json({
      status: 'healthy',
      services: {
        cache: 'active'
      },
      cache: cacheStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/example-text
 * example-level0.txt 파일 로드
 */
app.get('/api/example-text', async (req, res) => {
  try {
    console.log('example-level0.txt 로드 요청');

    // Level 0 파일 로드
    const text = await loadTextFile('data/example-level0.txt');
    const formattedText = formatParagraphs(text);

    res.json({
      success: true,
      data: {
        text: formattedText,
        stats: {}
      }
    });
  } catch (error) {
    console.error('example-level0.txt 로드 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/summarize
 * 요약 생성 요청 (미리 생성된 파일 사용)
 * Body: { text: string, useCache: boolean }
 */
app.post('/api/summarize', async (req, res) => {
  try {
    console.log('요약 요청 - 미리 생성된 파일 사용');

    // 각 레벨 파일 로드
    const level1Text = await loadTextFile('data/example-level1.txt');
    const level2Text = await loadTextFile('data/example-level2.txt');
    const level3Text = await loadTextFile('data/example-level3.txt');

    // 포맷팅
    const level1Formatted = formatParagraphs(level1Text);
    const level2Formatted = formatParagraphs(level2Text);
    const level3Formatted = formatParagraphs(level3Text);

    const summaries = {
      level1: {
        level: 1,
        text: level1Formatted,
        metadata: {}
      },
      level2: {
        level: 2,
        text: level2Formatted,
        metadata: {}
      },
      level3: {
        level: 3,
        text: level3Formatted,
        metadata: {}
      }
    };

    res.json({
      success: true,
      data: summaries,
      cached: false
    });
  } catch (error) {
    console.error('요약 로드 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/text/:level
 * 특정 레벨 텍스트 조회 (미리 생성된 파일 사용)
 * Params: level (0, 1, 2, 3)
 */
app.get('/api/text/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const levelNum = parseInt(level);

    if (![0, 1, 2, 3].includes(levelNum)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 레벨입니다. 0, 1, 2, 3 중 하나를 선택하세요.'
      });
    }

    console.log(`텍스트 조회 요청: Level ${levelNum}`);

    // 파일 로드
    const filename = `data/example-level${levelNum}.txt`;
    const text = await loadTextFile(filename);
    const formattedText = formatParagraphs(text);

    res.json({
      success: true,
      data: {
        level: levelNum,
        text: formattedText,
        metadata: {}
      }
    });
  } catch (error) {
    console.error('텍스트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/calculate-diff
 * 두 레벨 간 단어 차이 계산
 * Body: { fromText: string, toText: string, detailed: boolean }
 */
app.post('/api/calculate-diff', async (req, res) => {
  try {
    const { fromText, toText, detailed = false } = req.body;

    if (!fromText || !toText) {
      return res.status(400).json({
        success: false,
        error: 'fromText와 toText가 모두 필요합니다.'
      });
    }

    console.log(`단어 차이 계산 요청 (detailed: ${detailed})`);

    let diff;
    if (detailed) {
      // 상세 분석 (구조화된 데이터 필요)
      const { structureText } = require('./utils/textProcessor');
      const fromStructured = structureText(fromText);
      const toStructured = structureText(toText);
      diff = analyzeDetailedDifference(fromStructured, toStructured);
    } else {
      // 간단한 분석
      diff = analyzeDifference(fromText, toText);
    }

    res.json({
      success: true,
      data: diff
    });
  } catch (error) {
    console.error('단어 차이 계산 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cache/stats
 * 캐시 통계 조회
 */
app.get('/api/cache/stats', (req, res) => {
  try {
    const stats = getCacheStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('캐시 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/cache/clear
 * 캐시 초기화
 */
app.post('/api/cache/clear', (req, res) => {
  try {
    const { clearCache } = require('./utils/cache');
    clearCache();

    res.json({
      success: true,
      message: '캐시가 초기화되었습니다.'
    });
  } catch (error) {
    console.error('캐시 초기화 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// 에러 핸들링 미들웨어
// ============================================================

/**
 * 404 에러 핸들러
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '요청한 리소스를 찾을 수 없습니다.',
    path: req.path
  });
});

/**
 * 전역 에러 핸들러
 */
app.use((err, req, res, next) => {
  console.error('서버 에러:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || '서버 내부 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================
// 서버 시작
// ============================================================

/**
 * 서버 초기화 및 시작
 */
async function startServer() {
  try {
    console.log('='.repeat(60));
    console.log('Pinch-to-Zoom Summarizer API Server 시작');
    console.log('='.repeat(60));

    // 서버 시작
    console.log(`\nExpress 서버 시작...`);
    app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`✓ 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`  - 로컬: http://localhost:${PORT}`);
      console.log(`  - 헬스 체크: http://localhost:${PORT}/api/health`);
      console.log('='.repeat(60));

      // 캐시 통계 주기적 로깅 (10분마다)
      setInterval(() => {
        logCacheStats();
      }, 10 * 60 * 1000);
    });
  } catch (error) {
    console.error('='.repeat(60));
    console.error('✗ 서버 시작 실패:', error.message);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// 서버 시작
startServer();

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
  console.log('\n서버를 종료합니다...');
  logCacheStats();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n서버를 종료합니다...');
  logCacheStats();
  process.exit(0);
});

module.exports = app;
