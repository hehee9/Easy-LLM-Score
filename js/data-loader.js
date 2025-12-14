/**
 * @file js/data-loader.js
 * @description 데이터 로더
 * - models.json 파일을 로드하고 전처리
 */

import { DATA_PATH } from './config.js';
import { calculateScores } from './score-formulas.js';

/**
 * @description models.json 파일 로드
 * @returns {Promise<Object>} 로드된 데이터
 */
export async function loadData() {
    try {
        const response = await fetch(DATA_PATH);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        throw error;
    }
}

/**
 * @description 기본 표시 모델만 추출
 * @param {Object} data loadData()로 로드한 전체 데이터
 * @returns {Array} 기본 표시 모델 배열
 */
export function getDefaultModels(data) {
    const defaultIds = data.metadata?.defaultModelIds || [];
    return data.models.filter(m => defaultIds.includes(m.id));
}

/**
 * @description 모델 데이터만 추출 (하위 호환성 유지)
 * - benchmarks를 scores로 변환
 * @param {boolean} [defaultOnly=false] true면 기본 모델만, false면 모든 모델
 * @returns {Promise<Array>} 모델 배열 (scores 포함)
 */
export async function loadModels(defaultOnly = false) {
    try {
        const data = await loadData();

        // 모든 모델 또는 기본 모델만 선택
        const models = defaultOnly ? getDefaultModels(data) : data.models;

        // 각 모델의 benchmarks에서 scores 계산 (LM Arena 정규화를 위해 전체 모델 배열 전달)
        return models.map(model => ({
            ...model,
            scores: calculateScores(model, models),
            isDefault: data.metadata?.defaultModelIds?.includes(model.id) || false
        }));
    } catch (error) {
        console.error('모델 로드 실패:', error);
        return [];
    }
}

/**
 * @description 카테고리 데이터만 추출
 * @returns {Promise<Array>} 카테고리 배열
 */
export async function loadCategories() {
    try {
        const data = await loadData();
        return data.categories || [];
    } catch (error) {
        console.error('카테고리 로드 실패:', error);
        return [];
    }
}

/**
 * @description 특정 카테고리의 점수로 모델 정렬
 * @param {Array} models 모델 배열
 * @param {string} categoryId 카테고리 ID
 * @param {boolean} [descending=true] 내림차순 여부
 * @returns {Array} 정렬된 모델 배열
 */
export function sortModelsByCategory(models, categoryId, descending = true) {
    return [...models].sort((a, b) => {
        const scoreA = a.scores[categoryId] || 0;
        const scoreB = b.scores[categoryId] || 0;
        return descending ? scoreB - scoreA : scoreA - scoreB;
    });
}
