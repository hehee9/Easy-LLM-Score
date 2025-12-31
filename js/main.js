/**
 * @file js/main.js
 * @description 메인 앱 초기화
 * - 데이터 로드 및 차트 렌더링
 */

import { loadModels, loadData } from './data-loader.js';
import { renderRadarChart } from './chart-radar.js';
import { renderBarChart, updateBarChart } from './chart-bar.js';
import { getActiveCategories, formatModelName } from './config.js';

// 전역 변수
let allModels = [];
let selectedModelIds = new Set();  // 선택된 모델 ID
let radarChart = null;
let barChart = null;
let currentCategory = 'overall';  // 기본 카테고리 (종합)
let dateFilter = { start: null, end: null };  // 출시일 필터

// ============================================================
// URL 쿼리 파라미터 관련 함수
// ============================================================

/**
 * @description URL 쿼리 파라미터에서 상태 읽기
 * @returns {{ models: string[]|null, category: string|null }}
 */
function getStateFromURL() {
    const params = new URLSearchParams(window.location.search);

    const modelsParam = params.get('models');
    const models = modelsParam ? modelsParam.split(',').filter(Boolean) : null;

    const category = params.get('category');

    return { models, category };
}

/**
 * @description 현재 상태를 URL 쿼리 파라미터에 반영 (페이지 새로고침 없이)
 */
function updateURL() {
    const params = new URLSearchParams();

    // 모델 ID 목록 (선택된 것만)
    if (selectedModelIds.size > 0) {
        params.set('models', Array.from(selectedModelIds).join(','));
    }

    // 카테고리 (기본값 'overall'이 아닐 때만)
    if (currentCategory && currentCategory !== 'overall') {
        params.set('category', currentCategory);
    }

    // URL 업데이트 (히스토리에 추가하지 않고 교체)
    const newURL = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

    history.replaceState(null, '', newURL);
}

/*
// ============================================================
// 공유 버튼 (디자인 작업 후 주석 해제)
// ============================================================

function createShareButton() {
    const container = document.getElementById('share-button-container');
    if (!container) return;

    const button = document.createElement('button');
    button.className = 'share-button';
    button.textContent = '🔗 공유 링크 복사';
    button.addEventListener('click', copyShareLink);

    container.appendChild(button);
}

async function copyShareLink() {
    try {
        await navigator.clipboard.writeText(window.location.href);
        alert('링크가 클립보드에 복사되었습니다.');
    } catch (err) {
        // 클립보드 API 실패 시 fallback
        prompt('아래 링크를 복사하세요:', window.location.href);
    }
}
*/

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

        // 최종 업데이트 날짜 표시
        const data = await loadData();
        const lastUpdatedEl = document.getElementById('last-updated');
        if (lastUpdatedEl && data.metadata?.lastUpdated) {
            lastUpdatedEl.textContent = data.metadata.lastUpdated;
        }

        // URL에서 상태 읽기
        const urlState = getStateFromURL();

        // 모델 선택: URL 파라미터 > 기본값
        if (urlState.models && urlState.models.length > 0) {
            // URL에 지정된 모델만 선택 (유효한 ID만)
            const validIds = new Set(allModels.map(m => m.id));
            urlState.models.forEach(id => {
                if (validIds.has(id)) {
                    selectedModelIds.add(id);
                }
            });
            console.log(`URL에서 모델 로드: ${selectedModelIds.size}개`);
        } else {
            // 기본 모델 선택
            allModels.forEach(model => {
                if (model.isDefault) {
                    selectedModelIds.add(model.id);
                }
            });
            console.log(`기본 선택 모델: ${selectedModelIds.size}개`);
        }

        // 카테고리: URL 파라미터 > 기본값
        if (urlState.category) {
            const validCategories = getActiveCategories().map(c => c.id);
            if (validCategories.includes(urlState.category)) {
                currentCategory = urlState.category;
                console.log(`URL에서 카테고리 로드: ${currentCategory}`);
            }
        }

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

        // 초기 URL 상태 동기화 (URL이 없었던 경우 현재 상태로 설정)
        updateURL();
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

    // 출시일 필터 UI 생성
    const dateFilterUI = createDateFilter();
    container.appendChild(dateFilterUI);

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
    selectAllLabel.id = 'select-all-label';
    selectAllLabel.textContent = `전체 (${selectedModelIds.size}/${allModels.length})`;

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

        const selectedCount = models.filter(m => selectedModelIds.has(m.id)).length;
        const providerName = document.createElement('span');
        providerName.className = 'provider-name';
        providerName.dataset.provider = provider;
        providerName.textContent = `${provider} (${selectedCount}/${models.length})`;

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
            name.textContent = formatModelName(model);

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

/** @description 모든 모델 선택/취소 (필터링된 모델 제외) */
function selectAllModels(select) {
    allModels.forEach(model => {
        // 필터링된 모델은 전체 선택에서 제외
        if (isModelFilteredOut(model.id)) return;

        if (select) {
            selectedModelIds.add(model.id);
        } else {
            selectedModelIds.delete(model.id);
        }
    });

    // UI 업데이트 (필터링되지 않은 모델만)
    document.querySelectorAll('.model-item input[type="checkbox"]').forEach(cb => {
        const item = cb.closest('.model-item');
        if (!item.classList.contains('filtered-out')) {
            cb.checked = select;
        }
    });
    document.querySelectorAll('.provider-checkbox').forEach(cb => {
        // 개발사 체크박스는 updateProviderCheckbox에서 처리
    });

    // 개발사별 체크박스 상태 업데이트
    const grouped = groupModelsByProvider(allModels);
    Object.keys(grouped).forEach(provider => {
        updateProviderCheckbox(provider);
    });

    updateSelectionCounts();
    updateCharts();
}

/** @description 전체 선택 체크박스 상태 업데이트 */
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allModels.length > 0 && allModels.every(m => selectedModelIds.has(m.id));
    }
}

/** @description 선택된 모델 수 레이블 업데이트 */
function updateSelectionCounts() {
    // 전체 선택 레이블 업데이트
    const selectAllLabel = document.getElementById('select-all-label');
    if (selectAllLabel) {
        selectAllLabel.textContent = `전체 (${selectedModelIds.size}/${allModels.length})`;
    }

    // 개발사별 레이블 업데이트
    const grouped = groupModelsByProvider(allModels);
    Object.keys(grouped).forEach(provider => {
        const models = grouped[provider];
        const selectedCount = models.filter(m => selectedModelIds.has(m.id)).length;
        const label = document.querySelector(`.provider-name[data-provider="${provider}"]`);
        if (label) {
            label.textContent = `${provider} (${selectedCount}/${models.length})`;
        }
    });
}

/** @description 개발사별 모델 선택/취소 (필터링된 모델 제외) */
function selectProviderModels(provider, select) {
    const grouped = groupModelsByProvider(allModels);
    const models = grouped[provider] || [];

    models.forEach(model => {
        // 필터링된 모델은 개발사 선택에서 제외
        if (isModelFilteredOut(model.id)) return;

        if (select) {
            selectedModelIds.add(model.id);
        } else {
            selectedModelIds.delete(model.id);
        }
    });

    // 해당 개발사의 체크박스 UI 업데이트 (필터링되지 않은 모델만)
    const group = document.querySelector(`.provider-group[data-provider="${provider}"]`);
    if (group) {
        group.querySelectorAll('.model-item input[type="checkbox"]').forEach(cb => {
            const item = cb.closest('.model-item');
            if (!item.classList.contains('filtered-out')) {
                cb.checked = select;
            }
        });
    }

    // 전체 선택 체크박스 상태 업데이트
    updateSelectAllCheckbox();
    updateSelectionCounts();

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

// ============================================================
// 출시일 필터 관련 함수
// ============================================================

/** @description 날짜 필터 UI 생성 */
function createDateFilter() {
    const container = document.createElement('div');
    container.className = 'date-filter';

    const label = document.createElement('span');
    label.className = 'filter-label';
    label.textContent = '출시일';

    const startInput = document.createElement('input');
    startInput.type = 'date';
    startInput.id = 'filter-start-date';
    startInput.addEventListener('change', applyDateFilter);

    const separator = document.createElement('span');
    separator.textContent = '~';
    separator.style.color = 'var(--text-secondary)';

    const endInput = document.createElement('input');
    endInput.type = 'date';
    endInput.id = 'filter-end-date';
    endInput.addEventListener('change', applyDateFilter);

    container.appendChild(label);
    container.appendChild(startInput);
    container.appendChild(separator);
    container.appendChild(endInput);

    return container;
}

/** @description 날짜 필터 적용 */
function applyDateFilter() {
    const startInput = document.getElementById('filter-start-date');
    const endInput = document.getElementById('filter-end-date');

    dateFilter.start = startInput.value || null;
    dateFilter.end = endInput.value || null;

    // 모든 모델 아이템에 필터 적용
    document.querySelectorAll('.model-item').forEach(item => {
        const modelId = item.querySelector('input[type="checkbox"]').dataset.modelId;
        const model = allModels.find(m => m.id === modelId);
        const releaseDate = model?.releaseDate;

        const isInRange = isDateInRange(releaseDate, dateFilter);

        // 범위 밖 모델은 연하게 표시 (숨기지 않음)
        if (isInRange) {
            item.classList.remove('filtered-out');
        } else {
            item.classList.add('filtered-out');
        }
    });

    updateSelectionCounts();
}

/** @description 날짜 범위 체크 헬퍼 */
function isDateInRange(dateStr, filter) {
    if (!dateStr) return true;  // 날짜 없는 모델은 항상 표시
    if (!filter.start && !filter.end) return true;

    const date = new Date(dateStr);
    if (filter.start && date < new Date(filter.start)) return false;
    if (filter.end && date > new Date(filter.end)) return false;
    return true;
}

/** @description 필터링 상태 체크 헬퍼 (전체 선택에서 사용) */
function isModelFilteredOut(modelId) {
    const checkbox = document.querySelector(`.model-item input[data-model-id="${modelId}"]`);
    return checkbox?.closest('.model-item')?.classList.contains('filtered-out') || false;
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
    updateSelectionCounts();

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

    // URL 업데이트
    updateURL();
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

    // URL 업데이트
    updateURL();
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