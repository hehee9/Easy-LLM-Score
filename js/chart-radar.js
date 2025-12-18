/**
 * @file js/chart-rader.js
 * @description 레이더 차트 렌더링
 * - ECharts를 사용하여 모델들의 종합 성능을 시각화
 */

import { getActiveCategories, normalizeScore, CHART_COLORS, CHART_CONFIG } from './config.js';

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

    // 화면 비율 기반 높이 설정 (뷰포트 높이의 80%)
    container.style.height = '80vh';

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
            type: 'scroll',  // 스크롤 가능한 범례
            data: models.map(m => m.name),
            bottom: 0,
            left: 'center',
            width: '90%',
            textStyle: {
                fontSize: 13
            },
            pageButtonItemGap: 5,
            pageButtonGap: 10,
            pageTextStyle: {
                color: '#333'
            }
        },
        radar: {
            indicator: indicator,
            center: ['50%', '40%'],  // 차트를 위쪽에 배치 (세로 40% 위치)
            radius: '35%',           // 차트 크기를 줄여서 범례 공간 확보
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