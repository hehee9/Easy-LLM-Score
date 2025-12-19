/**
 * @file js/chart-rader.js
 * @description 레이더 차트 렌더링
 * - ECharts를 사용하여 모델들의 종합 성능을 시각화
 */

import { getActiveCategories, normalizeScore, getModelColor, formatModelName, CHART_CONFIG } from './config.js';

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

    // 화면 비율 기반 높이 설정 (범례 없으니 60vh로 충분)
    container.style.height = '60vh';

    // ECharts 인스턴스 초기화
    const chart = echarts.init(container);

    // 활성화된 카테고리만 사용 (음성/동영상/종합 제외)
    const activeCategories = getActiveCategories().filter(cat => cat.id !== 'overall');

    // 레이더 차트 indicator 설정 (활성화된 카테고리만)
    const indicator = activeCategories.map(cat => ({
        name: cat.name,
        max: 100
    }));

    // 각 모델의 데이터 시리즈 생성
    const seriesData = models.map((model) => ({
        name: formatModelName(model.name),
        // normalizeScore로 환각 점수 자동 반전
        value: activeCategories.map(cat =>
            normalizeScore(model.scores[cat.id] || 0, cat.id)
        ),
        itemStyle: {
            color: getModelColor(model)  // 개발사(provider) 기반 색상
        },
        lineStyle: {
            opacity: 0.4,
            width: 1.5
        },
        areaStyle: {
            opacity: 0.1
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
            show: false  // 범례 제거 (마우스 호버 툴팁으로 대체)
        },
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                return `<strong>${params.name}</strong>`;
            }
        },
        radar: {
            indicator: indicator,
            center: ['50%', '50%'],  // 중앙에 배치
            radius: '65%',           // 범례 없으니 크게
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
                focus: 'self',  // 호버한 시리즈만 강조
                lineStyle: {
                    width: 3,
                    opacity: 1
                },
                areaStyle: {
                    opacity: 0.4
                },
                itemStyle: {
                    opacity: 1
                }
            },
            blur: {
                lineStyle: {
                    opacity: 0.15
                },
                areaStyle: {
                    opacity: 0.03
                },
                itemStyle: {
                    opacity: 0.15
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

    const activeCategories = getActiveCategories().filter(cat => cat.id !== 'overall');

    const seriesData = models.map((model) => ({
        name: formatModelName(model.name),
        value: activeCategories.map(cat =>
            normalizeScore(model.scores[cat.id] || 0, cat.id)
        ),
        itemStyle: {
            color: getModelColor(model)  // 개발사(provider) 기반 색상
        },
        lineStyle: {
            opacity: 0.4,
            width: 1.5
        },
        areaStyle: {
            opacity: 0.1
        }
    }));

    chart.setOption({
        series: [{
            data: seriesData,
            emphasis: {
                focus: 'self',
                lineStyle: {
                    width: 3,
                    opacity: 1
                },
                areaStyle: {
                    opacity: 0.4
                },
                itemStyle: {
                    opacity: 1
                }
            },
            blur: {
                lineStyle: {
                    opacity: 0.15
                },
                areaStyle: {
                    opacity: 0.03
                },
                itemStyle: {
                    opacity: 0.15
                }
            }
        }]
    });
}