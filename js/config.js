/**
 * @file js/config.js
 * @description 차트 설정 및 상수
 * - 카테고리, 색상 등을 중앙에서 관리
 */

/**
 * @description 카테고리 정의
 *
 * @property {string} id 카테고리 ID (score-formulas.js의 키와 일치)
 * @property {string} name 사용자 친화적 이름
 * @property {boolean} enabled 차트 표시 여부
 * @property {boolean} reversed 낮을수록 좋은 지표 여부
 */
export const CATEGORIES = [
    {
        id: 'general_knowledge',
        name: '일반 지식',
        enabled: true,
        reversed: false
    },
    {
        id: 'expert_knowledge',
        name: '전문 지식',
        enabled: true,
        reversed: false
    },
    {
        id: 'general_reasoning',
        name: '일반 추론',
        enabled: true,
        reversed: false
    },
    {
        id: 'math_reasoning',
        name: '수학 추론',
        enabled: true,
        reversed: false
    },
    {
        id: 'coding',
        name: '코딩',
        enabled: true,
        reversed: false
    },
    {
        id: 'vision',
        name: '시각 이해',
        enabled: true,
        reversed: false
    },
    {
        id: 'audio',
        name: '음성 이해',
        enabled: false,  // 비활성화
        reversed: false
    },
    {
        id: 'video',
        name: '동영상 이해',
        enabled: false,  // 비활성화
        reversed: false
    },
    {
        id: 'long_context',
        name: '긴 맥락 이해',
        enabled: true,
        reversed: false
    },
    {
        id: 'hallucination',
        name: '환각 저항',
        enabled: true,
        reversed: false  // 공식에서 이미 100 - rate로 변환됨
    },
    {
        id: 'natural_speech',
        name: '자연스러운 말투',
        enabled: true,
        reversed: false
    }
];

// 차트 색상 팔레트 (모델 구분용)
export const CHART_COLORS = [
    '#5470c6',  // 파란색
    '#91cc75',  // 녹색
    '#fac858',  // 노란색
    '#ee6666',  // 빨간색
    '#73c0de',  // 하늘색
    '#3ba272',  // 청록색
    '#9a60b4',  // 보라색
    '#ea7ccc'   // 핑크색
];

// 차트 공통 설정
export const CHART_CONFIG = {
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    textStyle: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: '#777',
        borderWidth: 1,
        textStyle: {
            color: '#fff'
        }
    }
};

// 데이터 경로
export const DATA_PATH = 'data/models.json';

/**
 * @description 모델 인덱스에 따른 색상 반환
 * @param {number} index 모델 인덱스
 * @returns {string} 색상 코드
 */
export function getModelColor(index) {
    return CHART_COLORS[index % CHART_COLORS.length];
}

/**
 * @description 활성화된 카테고리만 필터링
 * @returns {Array} 활성화된 카테고리 배열
 */
export function getActiveCategories() {
    return CATEGORIES.filter(cat => cat.enabled);
}

/**
 * @description 점수 정규화 (역방향 지표 처리)
 * @param {number} score 원본 점수
 * @param {string} categoryId 카테고리 ID
 * @returns {number} 정규화된 점수
 */
export function normalizeScore(score, categoryId) {
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) return score;

    // 역방향 지표는 점수 반전 (레이더 차트용)
    return category.reversed ? (100 - score) : score;
}
