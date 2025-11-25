#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
텍스트 파일을 읽고 의미 단위로 문단을 나누는 스크립트
- 원문 내용을 변경하지 않음
- 빈 줄을 기준으로 문단 구분
- 3-5문장 정도로 문단 구성
"""

def format_paragraphs(input_file, output_file):
    """텍스트를 읽기 좋게 문단으로 나누기"""

    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 줄 번호 제거 (→ 기호 이후 텍스트만 추출)
    text_lines = []
    for line in lines:
        if '→' in line:
            # 줄 번호와 화살표 제거
            text = line.split('→', 1)[1] if '→' in line else line
            text_lines.append(text)
        else:
            text_lines.append(line)

    # 빈 줄이 연속으로 3개 이상이면 문단 구분으로 간주
    formatted_lines = []
    empty_count = 0

    for line in text_lines:
        stripped = line.strip()

        if not stripped:
            empty_count += 1
            # 연속된 빈 줄은 하나의 문단 구분(빈 줄 하나)으로 변환
            if empty_count == 1:
                formatted_lines.append('\n')
        else:
            empty_count = 0
            formatted_lines.append(line.rstrip() + '\n')

    # 결과 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(formatted_lines)

    print(f"완료: {input_file} → {output_file}")
    print(f"총 {len([l for l in formatted_lines if l.strip()])}줄 처리됨")

if __name__ == '__main__':
    input_file = '/Users/zerolive/work/pinch-to-zoom/data/example.txt'
    output_file = '/Users/zerolive/work/pinch-to-zoom/data/example-pretty.txt'

    format_paragraphs(input_file, output_file)
