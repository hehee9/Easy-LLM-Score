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
        id: 'overall',
        name: '종합',
        enabled: true,
        reversed: false
    },
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
        reversed: false
    },
    {
        id: 'natural_speech',
        name: '응답 품질',
        enabled: true,
        reversed: false
    }
];

// 개발사별 브랜드 색상
export const PROVIDER_COLORS = {
    'Google': '#4285F4',           // Google Blue
    'Anthropic': '#da7756',        // Anthropic Terra Cotta
    'OpenAI': '#10A37F',           // OpenAI Green
    'Alibaba': '#FF6A00',          // Alibaba Orange
    'DeepSeek': '#3c5dff',         // DeepSeek Blue
    'Meta': '#0668E1',             // Meta Blue
    'xAI': '#1a1a1a',              // xAI Black (조금 밝게)
    'Mistral': '#FA520F',          // Mistral Orange
    'Cohere': '#FF7759',           // Cohere Coral
    'NVIDIA': '#76B900',           // NVIDIA Green
    'Amazon': '#FF9900',           // Amazon Orange
    'Microsoft Azure': '#0078D4',  // Azure Blue
    'Kimi': '#5B21B6',             // Purple
    'Z AI': '#6366F1',             // Indigo
    'MiniMax': '#EC4899',          // Pink
    'InclusionAI': '#14B8A6',      // Teal
    'Allen Institute for AI': '#8B5CF6', // Violet
    'default': '#6B7280'           // Gray
};

// 차트 색상 팔레트 (레거시 호환용)
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
 * @description 모델의 개발사(provider)에 따른 색상 반환
 * @param {Object} model 모델 객체 (provider 필드 필요)
 * @returns {string} 색상 코드
 */
export function getModelColor(model) {
    if (!model || !model.provider) {
        return PROVIDER_COLORS['default'];
    }
    return PROVIDER_COLORS[model.provider] || PROVIDER_COLORS['default'];
}

/**
 * @description 활성화된 카테고리만 필터링
 * @returns {Array} 활성화된 카테고리 배열
 */
export function getActiveCategories() {
    return CATEGORIES.filter(cat => cat.enabled);
}

/**
 * @description 활성화된 카테고리 ID 목록
 */
export const ACTIVE_CATEGORY_IDS = CATEGORIES
    .filter(c => c.enabled)
    .map(c => c.id);

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

/**
 * @description 차트 표시용 모델명 포맷
 * - (Thinking), (Reasoning) → 💡 (다른 괄호 표기 앞에 배치)
 * - (Non-reasoning), (Non-Thinking) → 제거
 * @param {string} name 원본 모델명
 * @returns {string} 포맷된 모델명
 */
export function formatModelName(name) {
    // Reasoning/Thinking 모델인지 확인
    const isReasoning = /\((?:Thinking|Reasoning)\)/i.test(name);

    let formatted = name
        // Reasoning/Thinking 태그 제거
        .replace(/\s*\((?:Thinking|Reasoning)\)/gi, '')
        // Non-reasoning/Non-Thinking 태그 제거
        .replace(/\s*\(Non-(?:reasoning|Thinking)\)/gi, '')
        .trim();

    if (isReasoning) {
        // (high), (low) 등의 추론 예산 표기가 있으면 그 앞에 💡 삽입
        if (/\s*\([^)]+\)\s*$/.test(formatted)) {
            formatted = formatted.replace(/(\s*\([^)]+\)\s*)$/, ' 💡$1').trim();
        } else {
            formatted += ' 💡';
        }
    }

    return formatted;
}
