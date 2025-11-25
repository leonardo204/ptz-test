#!/bin/bash

###############################################################################
# Pinch-to-Zoom 텍스트 요약 시스템 시작 스크립트
#
# 이 스크립트는 Docker Compose를 사용하여 애플리케이션을 빌드하고 실행합니다.
###############################################################################

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 헤더 출력
echo ""
echo "================================================================="
echo "  📖 Pinch-to-Zoom 텍스트 요약 시스템"
echo "================================================================="
echo ""

# 1. Docker 설치 확인
log_info "Docker 설치 확인 중..."
if ! command -v docker &> /dev/null; then
    log_error "Docker가 설치되어 있지 않습니다."
    log_info "Docker를 설치한 후 다시 시도하세요: https://www.docker.com/get-started"
    exit 1
fi
log_success "Docker 설치 확인 완료 ($(docker --version))"

# 2. Docker Compose 설치 확인
log_info "Docker Compose 설치 확인 중..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose가 설치되어 있지 않습니다."
    exit 1
fi
log_success "Docker Compose 설치 확인 완료"

# 3. .env 파일 확인
log_info "환경 변수 파일 확인 중..."
if [ ! -f ".env" ]; then
    log_warning ".env 파일이 없습니다. .env.example을 복사합니다..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_warning ".env 파일을 편집하여 Azure OpenAI 설정을 입력하세요."
    else
        log_error ".env.example 파일이 없습니다."
        exit 1
    fi
fi
log_success "환경 변수 파일 확인 완료"

# 4. example.txt 파일 확인
log_info "example.txt 파일 확인 중..."
if [ ! -f "example.txt" ]; then
    log_warning "example.txt 파일이 없습니다."
    log_info "example.txt 파일을 생성하여 요약할 텍스트를 입력하세요."
    exit 1
fi
log_success "example.txt 파일 확인 완료"

# 5. 기존 컨테이너 정리 (선택 사항)
if [ "$1" == "--clean" ]; then
    log_info "기존 컨테이너 및 이미지 정리 중..."
    docker-compose down --volumes --remove-orphans 2>/dev/null || true
    log_success "정리 완료"
fi

# 6. Docker 이미지 빌드
log_info "Docker 이미지 빌드 중..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    log_success "Docker 이미지 빌드 완료"
else
    log_error "Docker 이미지 빌드 실패"
    exit 1
fi

# 7. 컨테이너 시작
log_info "컨테이너 시작 중..."
docker-compose up -d

if [ $? -eq 0 ]; then
    log_success "컨테이너 시작 완료"
else
    log_error "컨테이너 시작 실패"
    exit 1
fi

# 8. 서비스 상태 확인
log_info "서비스 상태 확인 중..."
sleep 3

# Nginx 컨테이너 확인
if docker-compose ps | grep -q "nginx.*Up"; then
    log_success "Nginx 컨테이너 실행 중"
else
    log_error "Nginx 컨테이너가 실행되지 않았습니다."
    docker-compose logs nginx
    exit 1
fi

# App 컨테이너 확인
if docker-compose ps | grep -q "app.*Up"; then
    log_success "App 컨테이너 실행 중"
else
    log_error "App 컨테이너가 실행되지 않았습니다."
    docker-compose logs app
    exit 1
fi

# 9. 완료 메시지
echo ""
echo "================================================================="
log_success "애플리케이션이 성공적으로 시작되었습니다!"
echo "================================================================="
echo ""
echo "  🌐 웹 브라우저에서 다음 주소로 접속하세요:"
echo ""
echo "     http://localhost:18281"
echo ""
echo "================================================================="
echo ""
echo "  📝 유용한 명령어:"
echo ""
echo "     로그 확인:        docker-compose logs -f"
echo "     컨테이너 중지:    docker-compose stop"
echo "     컨테이너 재시작:  docker-compose restart"
echo "     컨테이너 종료:    docker-compose down"
echo ""
echo "================================================================="
echo ""

exit 0
