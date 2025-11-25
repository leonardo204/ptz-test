# Node.js 18 이미지 사용
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json 복사 및 의존성 설치
COPY ../package.json ./
RUN npm install --production

# 서버 코드 복사
COPY . /app/server/

# 포트 3135 노출
EXPOSE 3135

# 애플리케이션 시작
CMD ["npm", "start"]
