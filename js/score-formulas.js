/**
 * @file js/score-formulas.js
 * @description 벤치마크 점수 계산 공식
 * - 각 카테고리별로 원본 벤치마크 점수를 조합하여 0-100 점수로 변환
 */

// 종합 점수 계산에 포함할 카테고리 (overall 제외)
const SCORE_CATEGORIES = [
    'general_knowledge', 'expert_knowledge', 'general_reasoning',
    'math_reasoning', 'coding', 'vision', 'long_context',
    'hallucination', 'natural_speech'
];

/**
 * @description LM Arena 점수를 0-100으로 정규화 (Bradley-Terry 기반)
 *
 * Bradley-Terry 모델: 최고점 대비 승률 → 0-100 스케일
 *
 * @param {number} score 원본 Elo 점수
 * @param {Array<number>} allScores 모든 모델의 해당 벤치마크 점수 배열
 * @returns {number|null} 0-100 정규화된 점수
 */
function normalizeLMArena(score, allScores) {
    // 결측값 처리 (0점도 결측으로 간주)
    if (score === null || score === undefined || score === 0) return null;

    // 유효한 점수만 필터링
    const validScores = allScores.filter(s => s !== null && s !== undefined && s !== 0);

    if (validScores.length === 0) return 0;

    const maxScore = Math.max(...validScores);
    const minScore = Math.min(...validScores);

    // 모든 점수가 같으면 모두 100점
    if (maxScore === minScore) return 100;

    // Bradley-Terry 승률 공식: P(A beats Max) = 1 / (1 + 10^((MaxElo - Elo) / 400))
    // 1위 대비 승률을 0-100 스케일로 변환
    const winRateVsMax = 1 / (1 + Math.pow(10, (maxScore - score) / 400));
    const normalized = winRateVsMax * 100;

    return Math.round(normalized * 100) / 100;
}

/**
 * @description 가중 평균 계산 (결측값 자동 처리)
 * @param {Array<{value: number|null, weight: number}>} items [{value, weight}, ...]
 * @returns {number} 가중 평균 점수 (0-100)
 */
function weightedAverage(items) {
    let totalWeight = 0;
    let totalScore = 0;

    for (const item of items) {
        // 결측값이 아닌 경우에만 계산
        if (item.value !== null && item.value !== undefined) {
            totalScore += item.value * item.weight;
            totalWeight += item.weight;
        }
    }

    // 모든 값이 결측이면 0 반환
    if (totalWeight === 0) return 0;

    return Math.round((totalScore / totalWeight) * 100) / 100;
}

/**
 * @description 벤치마크 정규화 (이미 0-100 범위인 벤치마크)
 * @param {Object} benchmarks 모델의 벤치마크 객체
 * @param {string} key 벤치마크 이름
 * @returns {number|null} 정규화된 점수
 */
function getBenchmark(benchmarks, key) {
    const value = benchmarks[key];
    if (value === null || value === undefined || value === 0) return null;
    return value;
}

/**
 * @description 모델의 모든 점수를 계산
 * @param {Object} model 모델 객체 (benchmarks 포함)
 * @param {Array} allModels 전체 모델 배열 (LM Arena 정규화용)
 * @returns {Object} 계산된 점수 객체 { general_knowledge: 85, ... }
 */
export function calculateScores(model, allModels = []) {
    const benchmarks = model.benchmarks || {};

    // LM Arena 점수 추출 (정규화용)
    const lmArenaScores = {
        'LMArena-Text': allModels.map(m => m.benchmarks?.['LMArena-Text']),
        'LMArena-Text-Creative-Writing': allModels.map(m => m.benchmarks?.['LMArena-Text-Creative-Writing']),
        'LMArean-Text-Math': allModels.map(m => m.benchmarks?.['LMArean-Text-Math']),
        'LMArena-Text-Coding': allModels.map(m => m.benchmarks?.['LMArena-Text-Coding']),
        'LMArena-Text-Expert': allModels.map(m => m.benchmarks?.['LMArena-Text-Expert']),
        'LMArena-Text-Hard-Prompts': allModels.map(m => m.benchmarks?.['LMArena-Text-Hard-Prompts']),
        'LMArena-Text-Longer-Query': allModels.map(m => m.benchmarks?.['LMArena-Text-Longer-Query']),
        'LMArena-Text-Multi-Turn': allModels.map(m => m.benchmarks?.['LMArena-Text-Multi-Turn'])
    };

    // LM Arena 정규화 함수 (각 벤치마크별)
    const getLMArena = (key) => normalizeLMArena(benchmarks[key], lmArenaScores[key]);

    const scores = {
        // 일반 지식: (5A MMLU Pro) + (1A GPQA Diamond) + (4A LMArena-Text)
        general_knowledge: weightedAverage([
            { value: getBenchmark(benchmarks, 'MMLU Pro'), weight: 5 },
            { value: getBenchmark(benchmarks, 'GPQA Diamond'), weight: 1 },
            { value: getLMArena('LMArena-Text'), weight: 4 }
        ]),

        // 전문 지식: (2A MMLU Pro) + (4A GPQA Diamond) + (6A Humanity's Last Exam) + (5A LMArena-Text-Expert) + (2A LMArena-Text-Hard-Prompts)
        expert_knowledge: weightedAverage([
            { value: getBenchmark(benchmarks, 'MMLU Pro'), weight: 2 },
            { value: getBenchmark(benchmarks, 'GPQA Diamond'), weight: 4 },
            { value: getBenchmark(benchmarks, "Humanity's Last Exam"), weight: 6 },
            { value: getLMArena('LMArena-Text-Expert'), weight: 5 },
            { value: getLMArena('LMArena-Text-Hard-Prompts'), weight: 2 }
        ]),

        // 일반 추론: (4A MMLU Pro) + (3A GPQA Diamond) + (3A Humanity's Last Exam) + (2A AA-LCR) + (2A LMArena-Text-Hard-Prompts)
        general_reasoning: weightedAverage([
            { value: getBenchmark(benchmarks, 'MMLU Pro'), weight: 4 },
            { value: getBenchmark(benchmarks, 'GPQA Diamond'), weight: 3 },
            { value: getBenchmark(benchmarks, "Humanity's Last Exam"), weight: 3 },
            { value: getBenchmark(benchmarks, 'AA-LCR'), weight: 2 },
            { value: getLMArena('LMArena-Text-Hard-Prompts'), weight: 2 }
        ]),

        // 수학 추론: (1A GPQA Diamond) + (7A AIME 2025) + (8A LMArean-Text-Math) + (1A MMLU Pro) + (1A Humanity's Last Exam)
        math_reasoning: weightedAverage([
            { value: getBenchmark(benchmarks, 'GPQA Diamond'), weight: 1 },
            { value: getBenchmark(benchmarks, 'AIME 2025'), weight: 7 },
            { value: getLMArena('LMArean-Text-Math'), weight: 8 },
            { value: getBenchmark(benchmarks, 'MMLU Pro'), weight: 1 },
            { value: getBenchmark(benchmarks, "Humanity's Last Exam"), weight: 1 }
        ]),

        // 코딩: (5A LiveCodeBench) + (3A SciCode) + (5A LMArena-Text-Coding)
        coding: weightedAverage([
            { value: getBenchmark(benchmarks, 'LiveCodeBench'), weight: 5 },
            { value: getBenchmark(benchmarks, 'SciCode'), weight: 3 },
            { value: getLMArena('LMArena-Text-Coding'), weight: 5 }
        ]),

        // 시각 이해: (2A LMArena-Text) + (8A MMMU Pro)
        vision: weightedAverage([
            { value: getLMArena('LMArena-Text'), weight: 2 },
            { value: getBenchmark(benchmarks, 'MMMU Pro'), weight: 8 }
        ]),

        // 음성 이해 (비활성화)
        audio: 0,

        // 동영상 이해 (비활성화)
        video: 0,

        // 긴 맥락 이해: (4A AA-LCR) + (2A LMArena-Text-Longer-Query) + (1A LMArena-Text-Multi-Turn) + (2A AA-Omniscience Accuracy) + (4A AA-Omniscience Hallucination Rate)
        long_context: weightedAverage([
            { value: getBenchmark(benchmarks, 'AA-LCR'), weight: 4 },
            { value: getLMArena('LMArena-Text-Longer-Query'), weight: 2 },
            { value: getLMArena('LMArena-Text-Multi-Turn'), weight: 1 },
            { value: getBenchmark(benchmarks, 'AA-Omniscience Accuracy'), weight: 2 },
            { value: getBenchmark(benchmarks, 'AA-Omniscience Hallucination Rate'), weight: 4 }
        ]),

        // 환각: (2A AA-LCR) + (4A AA-Omniscience Accuracy) + (8A (100 - AA-Omniscience Hallucination Rate)) + (3A LMArena-Text-Longer-Query)
        // ⚠️ 환각률을 환각 저항률로 변환 (100 - 원점수)
        hallucination: weightedAverage([
            { value: getBenchmark(benchmarks, 'AA-LCR'), weight: 2 },
            { value: getBenchmark(benchmarks, 'AA-Omniscience Accuracy'), weight: 4 },
            {
                value: benchmarks['AA-Omniscience Hallucination Rate'] !== null &&
                       benchmarks['AA-Omniscience Hallucination Rate'] !== undefined
                    ? 100 - benchmarks['AA-Omniscience Hallucination Rate']
                    : null,
                weight: 8
            },
            { value: getLMArena('LMArena-Text-Longer-Query'), weight: 3 }
        ]),

        // 자연스러운 말투: (4A LMArena-Text) + (4A LMArena-Text-Creative-Writing) + (2A LMArena-Text-Multi-Turn)
        natural_speech: weightedAverage([
            { value: getLMArena('LMArena-Text'), weight: 4 },
            { value: getLMArena('LMArena-Text-Creative-Writing'), weight: 4 },
            { value: getLMArena('LMArena-Text-Multi-Turn'), weight: 2 }
        ])
    };

    // 종합 점수: 모든 카테고리의 평균 (시각 미지원 모델은 vision 제외)
    const categoriesToAverage = model.supportsVision !== false
        ? SCORE_CATEGORIES
        : SCORE_CATEGORIES.filter(c => c !== 'vision');

    const categoryScores = categoriesToAverage.map(c => scores[c] || 0);
    scores.overall = categoryScores.length > 0
        ? Math.round((categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length) * 100) / 100
        : 0;

    return scores;
}
