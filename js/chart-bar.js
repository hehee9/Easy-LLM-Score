/**
 * @file js/chart-bar.js
 * @description 막대 그래프 렌더링
 * - ECharts를 사용하여 카테고리별 모델 성능을 비교
 */

import { CATEGORIES, CHART_CONFIG, getModelColor } from './config.js';

// 바 차트 동적 높이 설정
const BAR_HEIGHT_PER_MODEL = 35;  // 모델당 높이 (px)
const MIN_BAR_CHART_HEIGHT = 400;
const MAX_BAR_CHART_HEIGHT = 1500;

/**
 * @description 모델 수에 따른 바 차트 높이 계산
 * @param {number} modelCount 모델 수
 * @returns {number} 차트 높이 (px)
 */
function calculateBarChartHeight(modelCount) {
    return Math.min(
        MAX_BAR_CHART_HEIGHT,
        Math.max(MIN_BAR_CHART_HEIGHT, modelCount * BAR_HEIGHT_PER_MODEL)
    );
}

/**
 * @description 막대 그래프 렌더링
 * @param {string} containerId 차트를 렌더링할 DOM 요소 ID
 * @param {Array} models 표시할 모델 배열
 * @param {string} [categoryId='general_knowledge'] 표시할 카테고리 ID
 * @returns {Object} ECharts 인스턴스
 */
export function renderBarChart(containerId, models, categoryId = 'general_knowledge') {
    const container = document.getElementById(containerId);

    if (!container) {
      console.error(`컨테이너를 찾을 수 없습니다: ${containerId}`);
      return null;
    }

    // 동적 높이 설정
    const chartHeight = calculateBarChartHeight(models.length);
    container.style.height = `${chartHeight}px`;

    // ECharts 인스턴스 초기화
    const chart = echarts.init(container);

    // 카테고리 정보 가져오기
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    const categoryName = category ? category.name : categoryId;
    const isReversed = category?.reversed || false;

    // 카테고리별로 모델 정렬 (역방향 지표는 오름차순)
    const sortedModels = sortModelsByCategory(models, categoryId);

    // 데이터 준비
    const modelNames = sortedModels.map(m => m.name);
    const scores = sortedModels.map(m => m.scores[categoryId] || 0);
    const colors = sortedModels.map((model) => {
      // 원래 모델 배열에서의 인덱스를 찾아서 일관된 색상 사용
      const originalIndex = models.findIndex(m => m.id === model.id);
      return getModelColor(originalIndex);
    });

    // 차트 옵션 설정
    const option = {
        ...CHART_CONFIG,
        title: {
            text: '',  // 제목은 HTML에서 관리
            left: 'center'
        },
        grid: {
            left: '15%',
            right: '10%',
            top: '10%',
            bottom: '10%'
        },
        xAxis: {
            type: 'value',
            max: 100,
            min: 0,
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#eee'
                }
            },
            axisLabel: {
                formatter: '{value}'
            }
        },
        yAxis: {
            type: 'category',
            data: modelNames,
            axisTick: {
                show: false
            },
            axisLine: {
                show: false
            },
            axisLabel: {
                fontSize: 14
            }
        },
        series: [{
            type: 'bar',
            data: scores.map((score, index) => ({
                value: score,
                itemStyle: {
                    color: colors[index]
                }
            })),
            label: {
                show: true,
                position: 'right',
                formatter: '{c}',
                fontSize: 13,
                color: '#666'
            },
            barWidth: '60%',
            emphasis: {
                itemStyle: {
                    opacity: 0.8
                }
            }
        }],
        tooltip: {
            ...CHART_CONFIG.tooltip,
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: (params) => {
                const data = params[0];
                const suffix = isReversed ? ' (낮을수록 좋음)' : '';
                return `
                    <strong>${data.name}</strong><br/>
                    ${categoryName}${suffix}: <strong>${data.value}</strong>점
                `;
            }
        }
    };

    // 차트 렌더링
    chart.setOption(option);

    // 반응형 처리
    const resizeHandler = () => chart.resize();
    window.addEventListener('resize', resizeHandler);

    // 정리 함수
    chart.dispose = () => {
        window.removeEventListener('resize', resizeHandler);
        chart.dispose();
    };

    return chart;
}

/**
 * @description 카테고리별 모델 정렬
 * - 높은 점수가 위쪽, 낮은 점수가 아래쪽
 * @param {Array} models 모델 배열
 * @param {string} categoryId 카테고리 ID
 * @returns {Array} 정렬된 모델 배열
 */
function sortModelsByCategory(models, categoryId) {
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    const isReversed = category?.reversed || false;

    return [...models].sort((a, b) => {
        const scoreA = a.scores[categoryId] || 0;
        const scoreB = b.scores[categoryId] || 0;

        // 역방향 지표(환각)는 낮은 점수가 위쪽
        if (isReversed) {
            return scoreB - scoreA;  // 내림차순 (낮은 점수가 위)
        } else {
            return scoreA - scoreB;  // 오름차순 (높은 점수가 위)
        }
  });
}

/**
 * @description 막대 그래프 업데이트
 * @param {Object} chart ECharts 인스턴스
 * @param {Array} models 새로운 모델 배열
 * @param {string} categoryId 새로운 카테고리 ID
 */
export function updateBarChart(chart, models, categoryId) {
    if (!chart) return;

    // 동적 높이 업데이트
    const container = chart.getDom();
    if (container) {
        const chartHeight = calculateBarChartHeight(models.length);
        container.style.height = `${chartHeight}px`;
        chart.resize();
    }

    // 카테고리 정보
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    const categoryName = category ? category.name : categoryId;
    const isReversed = category?.reversed || false;

    // 카테고리별로 모델 정렬
    const sortedModels = sortModelsByCategory(models, categoryId);

    // 데이터 준비
    const modelNames = sortedModels.map(m => m.name);
    const scores = sortedModels.map(m => m.scores[categoryId] || 0);
    const colors = sortedModels.map((model) => {
        const originalIndex = models.findIndex(m => m.id === model.id);
        return getModelColor(originalIndex);
    });

    // 차트 업데이트
    chart.setOption({
        yAxis: {
            data: modelNames
        },
        series: [{
            data: scores.map((score, index) => ({
                value: score,
                itemStyle: {
                    color: colors[index]
                }
            }))
        }],
        tooltip: {
            formatter: (params) => {
                const data = params[0];
                const suffix = isReversed ? ' (낮을수록 좋음)' : '';
                return `
                    <strong>${data.name}</strong><br/>
                    ${categoryName}${suffix}: <strong>${data.value}</strong>점
                `;
            }
        }
    });
}
