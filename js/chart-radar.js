/**
 * @file js/chart-rader.js
 * @description 레이더 차트 렌더링
 * - ECharts를 사용하여 모델들의 종합 성능을 시각화
 */

import { getActiveCategories, normalizeScore, CHART_COLORS, CHART_CONFIG } from './config.js';

// 레이더 차트 동적 높이 설정
const RADAR_BASE_HEIGHT = 500;
const LEGEND_HEIGHT_PER_ROW = 30;  // 범례 줄당 높이 (px)
const MODELS_PER_ROW = 3;  // 범례 한 줄에 표시되는 모델 수 (추정)

/**
 * @description 모델 수에 따른 레이더 차트 높이 계산
 * @param {number} modelCount 모델 수
 * @returns {number} 차트 높이 (px)
 */
function calculateRadarChartHeight(modelCount) {
    const legendRows = Math.ceil(modelCount / MODELS_PER_ROW);
    // 3줄 이상일 때부터 추가 높이 적용
    const extraHeight = Math.max(0, legendRows - 3) * LEGEND_HEIGHT_PER_ROW;
    return RADAR_BASE_HEIGHT + extraHeight;
}

/**
 * @description 레이더 차트 렌더링
 * @param {string} containerId 차트를 렌더링할 DOM 요소 ID
 * @param {Array} models 표시할 모델 배열
 * @returns {Object} ECharts 인스턴스
 */
export function renderRadarChart(containerId, models) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`컨테이너를 찾을 수 없습니다: ${containerId}`);
        return null;
    }

    // 동적 높이 설정
    const chartHeight = calculateRadarChartHeight(models.length);
    container.style.height = `${chartHeight}px`;

    // ECharts 인스턴스 초기화
    const chart = echarts.init(container);

    // 활성화된 카테고리만 사용 (음성/동영상 제외)
    const activeCategories = getActiveCategories();

    // 레이더 차트 indicator 설정 (활성화된 카테고리만)
    const indicator = activeCategories.map(cat => ({
        name: cat.name,
        max: 100
    }));

    // 각 모델의 데이터 시리즈 생성
    const seriesData = models.map((model, index) => ({
        name: model.name,
        // normalizeScore로 환각 점수 자동 반전
        value: activeCategories.map(cat =>
            normalizeScore(model.scores[cat.id] || 0, cat.id)
        ),
        itemStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length]
        },
        areaStyle: {
            opacity: 0.3
        }
    }));

    // 차트 옵션 설정
    const option = {
        ...CHART_CONFIG,
        title: {
            text: '',  // 제목은 HTML에서 관리
            left: 'center'
        },
        legend: {
            data: models.map(m => m.name),
            bottom: 10,
            textStyle: {
                fontSize: 14
            }
        },
        radar: {
            indicator: indicator,
            shape: 'polygon',
            splitNumber: 5,
            name: {
                textStyle: {
                    fontSize: 14,
                    color: '#333'
                }
            },
            splitLine: {
                lineStyle: {
                    color: '#ddd'
                }
            },
            splitArea: {
                show: true,
                areaStyle: {
                    color: ['rgba(250, 250, 250, 0.3)', 'rgba(200, 200, 200, 0.3)']
                }
            },
            axisLine: {
                lineStyle: {
                    color: '#ddd'
                }
            }
        },
        series: [{
            type: 'radar',
            data: seriesData,
            emphasis: {
                lineStyle: {
                    width: 4
                }
            }
        }]
    };

    // 차트 렌더링
    chart.setOption(option);

    // 반응형 처리
    const resizeHandler = () => chart.resize();
    window.addEventListener('resize', resizeHandler);

    // 정리 함수 반환 (나중에 차트를 제거할 때 사용)
    chart.dispose = () => {
        window.removeEventListener('resize', resizeHandler);
        chart.dispose();
    };

    return chart;
}

/**
 * @description 레이더 차트 업데이트
 * @param {Object} chart ECharts 인스턴스
 * @param {Array} models 새로운 모델 배열
 */
export function updateRadarChart(chart, models) {
    if (!chart) return;

    const activeCategories = getActiveCategories();

    const seriesData = models.map((model, index) => ({
        name: model.name,
        value: activeCategories.map(cat =>
            normalizeScore(model.scores[cat.id] || 0, cat.id)
        ),
        itemStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length]
        },
        areaStyle: {
            opacity: 0.3
        }
    }));

    chart.setOption({
        legend: {
            data: models.map(m => m.name)
        },
        series: [{
            data: seriesData
        }]
    });
}