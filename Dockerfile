# Node.js 기반 이미지
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json 복사
COPY package.json ./

# 의존성 설치
RUN npm install --omit=dev

# 애플리케이션 소스 복사
COPY server ./server

# 데이터 파일 복사
COPY data ./data

# 포트 노출
EXPOSE 3135

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3135/api/example-text', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# 애플리케이션 실행
CMD ["node", "server/index.js"]
