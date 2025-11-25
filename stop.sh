#!/bin/bash

###############################################################################
# Pinch-to-Zoom 텍스트 요약 시스템 중지 스크립트
#
# 실행 중인 Docker 컨테이너를 중지하고 정리합니다.
###############################################################################

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo ""
echo "================================================================="
echo "  🛑 Pinch-to-Zoom 시스템 중지"
echo "================================================================="
echo ""

# 실행 중인 컨테이너 확인
log_info "실행 중인 컨테이너 확인..."
if docker-compose ps | grep -q "Up"; then
    log_info "컨테이너 중지 중..."

    # 옵션에 따라 처리
    if [ "$1" == "--clean" ]; then
        # 완전 삭제 (볼륨 포함)
        log_warning "컨테이너, 네트워크, 볼륨을 모두 삭제합니다..."
        docker-compose down --volumes --remove-orphans
    else
        # 일반 중지
        docker-compose down
    fi

    if [ $? -eq 0 ]; then
        log_success "컨테이너 중지 완료"
    else
        log_error "컨테이너 중지 실패"
        exit 1
    fi
else
    log_warning "실행 중인 컨테이너가 없습니다."
fi

echo ""
echo "================================================================="
log_success "시스템이 중지되었습니다."
echo "================================================================="
echo ""

if [ "$1" == "--clean" ]; then
    echo "  📝 모든 데이터가 삭제되었습니다."
    echo "     다시 시작하려면: ./start.sh"
else
    echo "  📝 컨테이너가 중지되었습니다."
    echo "     다시 시작하려면: docker-compose up -d"
    echo "     완전 삭제하려면: ./stop.sh --clean"
fi

echo ""
echo "================================================================="
echo ""

exit 0
