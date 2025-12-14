/**
 * @file js/main.js
 * @description 메인 앱 초기화
 * - 데이터 로드 및 차트 렌더링
 */

import { loadModels } from './data-loader.js';
import { renderRadarChart } from './chart-radar.js';
import { renderBarChart, updateBarChart } from './chart-bar.js';
import { getActiveCategories } from './config.js';

// 전역 변수
let allModels = [];
let radarChart = null;
let barChart = null;
let currentCategory = 'general_knowledge';  // 기본 카테고리

/** @description 앱 초기화 */
async function init() {
    try {
        // 데이터 로드
        allModels = await loadModels();

        if (allModels.length === 0) {
            console.error('모델 데이터가 없습니다.');
            showError('모델 데이터를 불러올 수 없습니다.');
            return;
        }

        console.log(`${allModels.length}개 모델 로드 완료:`, allModels.map(m => m.name));

        // 레이더 차트 렌더링 (모든 모델 표시)
        radarChart = renderRadarChart('radar-chart', allModels);

        if (radarChart) {
            console.log('레이더 차트 렌더링 완료');
        }

        // 카테고리 탭 버튼 생성
        createCategoryTabs();

        // 막대 그래프 렌더링 (기본 카테고리)
        barChart = renderBarChart('bar-chart', allModels, currentCategory);

        if (barChart) {
            console.log('막대 그래프 렌더링 완료');
        }
    } catch (error) {
        console.error('초기화 실패:', error);
        showError('데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

/** @description 카테고리 탭 버튼 생성 */
function createCategoryTabs() {
    const container = document.getElementById('category-tabs');

    if (!container) {
        console.error('카테고리 탭 컨테이너를 찾을 수 없습니다.');
        return;
    }

    // 기존 버튼 제거
    container.innerHTML = '';

    // 활성화된 카테고리만 버튼 생성 (음성/동영상 제외)
    const activeCategories = getActiveCategories();

    activeCategories.forEach(category => {
        const button = document.createElement('button');
        button.textContent = category.name;
        button.dataset.categoryId = category.id;
        button.className = category.id === currentCategory ? 'active' : '';

        // 클릭 이벤트 리스너
        button.addEventListener('click', () => {
            handleCategoryChange(category.id);
        });

        container.appendChild(button);
    });
}

/**
 * @description 카테고리 변경 처리
 * @param {string} categoryId 새로운 카테고리 ID
 */
function handleCategoryChange(categoryId) {
    if (categoryId === currentCategory) return;

    currentCategory = categoryId;

    // 탭 버튼 활성화 상태 업데이트
    const buttons = document.querySelectorAll('#category-tabs button');
    buttons.forEach(btn => {
        if (btn.dataset.categoryId === categoryId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 막대 그래프 업데이트
    updateBarChart(barChart, allModels, categoryId);

    console.log(`카테고리 변경: ${categoryId}`);
}

/**
 * @description 에러 메시지 표시
 * @param {string} message 에러 메시지
 */
function showError(message) {
    const container = document.getElementById('radar-chart');
    if (container) {
        container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #ff4d4f;
                font-size: 16px;
            ">
                <p>⚠️ ${message}</p>
            </div>
        `;
    }
}


document.addEventListener('DOMContentLoaded', init);