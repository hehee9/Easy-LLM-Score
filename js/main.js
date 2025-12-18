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
let selectedModelIds = new Set();  // 선택된 모델 ID
let radarChart = null;
let barChart = null;
let currentCategory = 'general_knowledge';  // 기본 카테고리

/** @description 앱 초기화 */
async function init() {
    try {
        // 데이터 로드 (모든 모델)
        allModels = await loadModels(false);

        if (allModels.length === 0) {
            console.error('모델 데이터가 없습니다.');
            showError('모델 데이터를 불러올 수 없습니다.');
            return;
        }

        console.log(`${allModels.length}개 모델 로드 완료:`, allModels.map(m => m.name));

        // 기본 모델 선택
        allModels.forEach(model => {
            if (model.isDefault) {
                selectedModelIds.add(model.id);
            }
        });

        console.log(`기본 선택 모델: ${selectedModelIds.size}개`);

        // 모델 선택 UI 생성
        createModelSelector();

        // 레이더 차트 렌더링 (선택된 모델만)
        radarChart = renderRadarChart('radar-chart', getSelectedModels());

        if (radarChart) {
            console.log('레이더 차트 렌더링 완료');
        }

        // 카테고리 탭 버튼 생성
        createCategoryTabs();

        // 막대 그래프 렌더링 (기본 카테고리)
        barChart = renderBarChart('bar-chart', getSelectedModels(), currentCategory);

        if (barChart) {
            console.log('막대 그래프 렌더링 완료');
        }
    } catch (error) {
        console.error('초기화 실패:', error);
        showError('데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

/** @description 선택된 모델만 반환 */
function getSelectedModels() {
    return allModels.filter(model => selectedModelIds.has(model.id));
}

/** @description 개발사별로 모델 그룹화 */
function groupModelsByProvider(models) {
    const grouped = {};
    models.forEach(model => {
        const provider = model.provider || 'Unknown';
        if (!grouped[provider]) {
            grouped[provider] = [];
        }
        grouped[provider].push(model);
    });
    // 각 그룹 내 이름 역순 정렬 (최신 모델이 위로)
    Object.values(grouped).forEach(group => {
        group.sort((a, b) => b.name.localeCompare(a.name, 'ko'));
    });
    return grouped;
}

/** @description 개발사에 기본 선택 모델이 있는지 확인 */
function hasDefaultModel(models) {
    return models.some(m => m.isDefault);
}

/** @description 모델 선택 UI 생성 (개발사별 그룹핑) */
function createModelSelector() {
    const container = document.getElementById('model-selector');

    if (!container) {
        console.warn('모델 선택 컨테이너를 찾을 수 없습니다.');
        return;
    }

    container.innerHTML = '<h3>모델 선택</h3>';

    // 검색창 생성
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '모델 검색...';
    searchInput.className = 'model-search';
    searchInput.addEventListener('input', (e) => {
        filterModels(e.target.value);
    });
    container.appendChild(searchInput);

    // 전체 선택 체크박스 (개발사 헤더와 동일한 스타일)
    const selectAllRow = document.createElement('div');
    selectAllRow.className = 'provider-header select-all-header';

    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.className = 'provider-checkbox';
    selectAllCheckbox.id = 'select-all-checkbox';
    selectAllCheckbox.checked = allModels.every(m => selectedModelIds.has(m.id));
    selectAllCheckbox.addEventListener('change', (e) => {
        selectAllModels(e.target.checked);
    });

    const selectAllLabel = document.createElement('span');
    selectAllLabel.className = 'provider-name';
    selectAllLabel.textContent = `전체 (${allModels.length})`;

    selectAllRow.appendChild(selectAllCheckbox);
    selectAllRow.appendChild(selectAllLabel);
    container.appendChild(selectAllRow);

    // 개발사별 그룹화
    const grouped = groupModelsByProvider(allModels);

    // 개발사 정렬: 모델 수 내림차순, 같으면 가나다순
    const sortedProviders = Object.keys(grouped).sort((a, b) => {
        const countDiff = grouped[b].length - grouped[a].length;
        if (countDiff !== 0) return countDiff;
        return a.localeCompare(b, 'ko');
    });

    // 그룹 컨테이너
    const groupsContainer = document.createElement('div');
    groupsContainer.className = 'provider-groups';

    sortedProviders.forEach(provider => {
        const models = grouped[provider];
        const isExpanded = hasDefaultModel(models);

        // 개발사 그룹
        const group = document.createElement('div');
        group.className = `provider-group${isExpanded ? '' : ' collapsed'}`;
        group.dataset.provider = provider;

        // 개발사 헤더
        const header = document.createElement('div');
        header.className = 'provider-header';

        // 개발사 체크박스
        const providerCheckbox = document.createElement('input');
        providerCheckbox.type = 'checkbox';
        providerCheckbox.className = 'provider-checkbox';
        providerCheckbox.checked = models.every(m => selectedModelIds.has(m.id));
        providerCheckbox.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        providerCheckbox.addEventListener('change', (e) => {
            selectProviderModels(provider, e.target.checked);
        });

        const providerName = document.createElement('span');
        providerName.className = 'provider-name';
        providerName.textContent = `${provider} (${models.length})`;

        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '▼';

        header.appendChild(providerCheckbox);
        header.appendChild(providerName);
        header.appendChild(toggleIcon);

        header.addEventListener('click', (e) => {
            if (e.target !== providerCheckbox) {
                group.classList.toggle('collapsed');
            }
        });

        // 모델 목록
        const modelList = document.createElement('div');
        modelList.className = 'provider-models';

        models.forEach(model => {
            const item = document.createElement('label');
            item.className = 'model-item';
            item.dataset.modelName = model.name.toLowerCase();

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedModelIds.has(model.id);
            checkbox.dataset.modelId = model.id;

            checkbox.addEventListener('change', (e) => {
                handleModelToggle(model.id, e.target.checked);
                updateProviderCheckbox(provider);
            });

            const name = document.createElement('span');
            name.textContent = model.name;
            if (model.isDefault) {
                name.style.fontWeight = 'bold';
            }

            item.appendChild(checkbox);
            item.appendChild(name);
            modelList.appendChild(item);
        });

        group.appendChild(header);
        group.appendChild(modelList);
        groupsContainer.appendChild(group);
    });

    container.appendChild(groupsContainer);
}

/** @description 모든 모델 선택/취소 */
function selectAllModels(select) {
    allModels.forEach(model => {
        if (select) {
            selectedModelIds.add(model.id);
        } else {
            selectedModelIds.delete(model.id);
        }
    });

    // UI 업데이트
    document.querySelectorAll('.model-item input[type="checkbox"]').forEach(cb => {
        cb.checked = select;
    });
    document.querySelectorAll('.provider-checkbox').forEach(cb => {
        cb.checked = select;
    });

    updateCharts();
}

/** @description 전체 선택 체크박스 상태 업데이트 */
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allModels.length > 0 && allModels.every(m => selectedModelIds.has(m.id));
    }
}

/** @description 개발사별 모델 선택/취소 */
function selectProviderModels(provider, select) {
    const grouped = groupModelsByProvider(allModels);
    const models = grouped[provider] || [];

    models.forEach(model => {
        if (select) {
            selectedModelIds.add(model.id);
        } else {
            selectedModelIds.delete(model.id);
        }
    });

    // 해당 개발사의 체크박스 UI 업데이트
    const group = document.querySelector(`.provider-group[data-provider="${provider}"]`);
    if (group) {
        group.querySelectorAll('.model-item input[type="checkbox"]').forEach(cb => {
            cb.checked = select;
        });
    }

    // 전체 선택 체크박스 상태 업데이트
    updateSelectAllCheckbox();

    updateCharts();
}

/** @description 개발사 체크박스 상태 업데이트 */
function updateProviderCheckbox(provider) {
    const grouped = groupModelsByProvider(allModels);
    const models = grouped[provider] || [];
    const allSelected = models.every(m => selectedModelIds.has(m.id));

    const group = document.querySelector(`.provider-group[data-provider="${provider}"]`);
    if (group) {
        const providerCheckbox = group.querySelector('.provider-checkbox');
        if (providerCheckbox) {
            providerCheckbox.checked = allSelected;
        }
    }
}

/** @description 검색어로 모델 필터링 */
function filterModels(query) {
    const searchTerm = query.toLowerCase().trim();
    const groups = document.querySelectorAll('.provider-group');

    groups.forEach(group => {
        const items = group.querySelectorAll('.model-item');
        let visibleCount = 0;

        items.forEach(item => {
            const modelName = item.dataset.modelName || '';
            const isMatch = !searchTerm || modelName.includes(searchTerm);
            item.style.display = isMatch ? '' : 'none';
            if (isMatch) visibleCount++;
        });

        // 검색 결과가 있으면 그룹 펼침, 없으면 숨김
        if (searchTerm) {
            group.style.display = visibleCount > 0 ? '' : 'none';
            if (visibleCount > 0) {
                group.classList.remove('collapsed');
            }
        } else {
            group.style.display = '';
        }
    });
}

/** @description 모델 선택/해제 처리 */
function handleModelToggle(modelId, isChecked) {
    if (isChecked) {
        selectedModelIds.add(modelId);
    } else {
        selectedModelIds.delete(modelId);
    }

    // 전체 선택 체크박스 상태 업데이트
    updateSelectAllCheckbox();

    // 차트 업데이트
    updateCharts();

    console.log(`모델 ${isChecked ? '선택' : '해제'}: ${modelId}`);
}

/** @description 차트 업데이트 */
function updateCharts() {
    const selectedModels = getSelectedModels();

    // 레이더 차트 업데이트 (0개여도 빈 차트 표시)
    if (radarChart) {
        radarChart = renderRadarChart('radar-chart', selectedModels);
    }

    // 막대 그래프 업데이트
    if (barChart) {
        updateBarChart(barChart, selectedModels, currentCategory);
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

    // 막대 그래프 업데이트 (선택된 모델만)
    updateBarChart(barChart, getSelectedModels(), categoryId);

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