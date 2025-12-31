import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 모델명 정규화 (공백, 특수문자 제거)
function normalizeModelName(name) {
  return name
    .toLowerCase()
    .replace(/[\s\-_.]/g, '')
    .replace(/\(.*?\)/g, '')  // 괄호 제거
    .trim();
}

// 모델 매칭 (LM Arena ↔ AA)
function matchModels(lmarenaModel, aaModels, modelMapping) {
  // 1. 수동 매핑 우선 사용
  const manualMatch = modelMapping[lmarenaModel];
  if (manualMatch) {
    return aaModels.find(m => m.id === manualMatch || m.name === manualMatch || m.slug === manualMatch);
  }

  // 2. 정규화된 이름으로 자동 매칭
  const normalizedLM = normalizeModelName(lmarenaModel);
  return aaModels.find(m => {
    const normalizedAA1 = normalizeModelName(m.name || '');
    const normalizedAA2 = normalizeModelName(m.slug || '');
    return normalizedAA1 === normalizedLM || normalizedAA2 === normalizedLM;
  });
}

// 점수 변환 (0-1 범위 → 0-100)
function convertScore(score) {
  if (score === null || score === undefined) return 0;
  if (score >= 0 && score <= 1) return score * 100;
  return score;
}

// Get manual benchmark value if exists
function getManualValue(modelId, benchmarkName, manualData) {
  return manualData.models?.[modelId]?.[benchmarkName] || 0;
}

// 모델이 1년 이상 오래되었는지 확인
function isModelTooOld(releaseDate, maxAgeMonths = 12) {
  if (!releaseDate) return false;  // 출시일 없으면 포함

  const release = new Date(releaseDate);
  const now = new Date();

  // 기준일: 현재 날짜에서 maxAgeMonths 전
  const cutoffDate = new Date(now);
  cutoffDate.setMonth(cutoffDate.getMonth() - maxAgeMonths);

  return release < cutoffDate;
}

async function mergeData() {
  console.log('Starting data merge...\n');

  const rawDir = join(__dirname, '..', 'data', 'raw');

  // 모델 매핑 테이블 로드
  const mappingPath = join(__dirname, 'model-mapping.json');
  const modelMapping = existsSync(mappingPath)
    ? JSON.parse(readFileSync(mappingPath, 'utf8'))
    : {};

  // Load manual data
  const manualDataPath = join(rawDir, 'manual-data.json');
  const manualData = existsSync(manualDataPath)
    ? JSON.parse(readFileSync(manualDataPath, 'utf8'))
    : { models: {} };

  // 1. LM Arena 데이터 로드
  const lmarenaFiles = [
    'lmarena-text',
    'lmarena-text-creative-writing',
    'lmarena-text-math',
    'lmarena-text-coding',
    'lmarena-text-expert',
    'lmarena-text-hard-prompts',
    'lmarena-text-longer-query',
    'lmarena-text-multi-turn',
    'lmarena-vision'
  ];

  const lmarenaData = {};
  for (const file of lmarenaFiles) {
    try {
      const data = JSON.parse(readFileSync(join(rawDir, `${file}.json`), 'utf8'));
      lmarenaData[file] = data;
      console.log(` ✓ Loaded ${file}.json (${data.models?.length || 0} models)`);
    } catch (error) {
      console.warn(`⚠ Failed to load ${file}.json:`, error.message);
      lmarenaData[file] = { models: [] };
    }
  }

  // 2. Artificial Analysis 데이터 로드
  const aaData = JSON.parse(readFileSync(join(rawDir, 'aa-models.json'), 'utf8'));
  const aaModels = aaData.models || [];
  console.log(` ✓ Loaded aa-models.json (${aaModels.length} models)\n`);

  // 3. LM Arena-Text를 기준으로 모델 병합
  const baseModels = lmarenaData['lmarena-text'].models || [];
  const mergedModels = [];
  const unmatchedModels = [];
  const skippedOldModels = [];  // 1년 이상 된 모델
  const usedIds = new Set();  // 중복 ID 체크용

  for (const lmModel of baseModels) {
    // AA 모델 매칭
    const aaMatch = matchModels(lmModel.model, aaModels, modelMapping);

    if (aaMatch) {
      // 1년 이상 된 모델 제외
      if (isModelTooOld(aaMatch.release_date)) {
        skippedOldModels.push({ name: lmModel.model, releaseDate: aaMatch.release_date });
        continue;
      }
      // 매칭 성공
      let modelId = (aaMatch.slug || aaMatch.id || lmModel.model).toLowerCase().replace(/[\s\-]/g, '-');

      // 중복 ID 체크 및 처리
      if (usedIds.has(modelId)) {
        // 원본 LM Arena 모델명으로 고유 ID 생성 시도
        let newId = lmModel.model.toLowerCase().replace(/[\s\.]/g, '-');

        // 원본 이름도 중복이면 숫자 접미사 추가
        let suffix = 2;
        while (usedIds.has(newId)) {
          newId = `${lmModel.model.toLowerCase().replace(/[\s\.]/g, '-')}-${suffix}`;
          suffix++;
        }

        console.warn(`⚠ Duplicate ID detected: ${modelId}, using: ${newId}`);
        modelId = newId;
      }
      usedIds.add(modelId);

      mergedModels.push({
        id: modelId,
        name: aaMatch.name || lmModel.model,
        provider: aaMatch.model_creator?.name || 'Unknown',  // AA의 model_creator.name만 사용
        releaseDate: aaMatch.release_date || '',
        benchmarks: {
          // Artificial Analysis 점수 (0-1 → 0-100 변환)
          'MMLU Pro': convertScore(aaMatch.evaluations?.mmlu_pro),
          'GPQA Diamond': convertScore(aaMatch.evaluations?.gpqa),
          "Humanity's Last Exam": convertScore(aaMatch.evaluations?.hle),
          'AA-LCR': convertScore(aaMatch.evaluations?.lcr),
          'LiveCodeBench': convertScore(aaMatch.evaluations?.livecodebench),
          'SciCode': convertScore(aaMatch.evaluations?.scicode),
          'AIME 2025': convertScore(aaMatch.evaluations?.aime_25),
          'MMMU Pro': getManualValue(modelId, 'MMMU Pro', manualData),
          'AA-Omniscience': getManualValue(modelId, 'AA-Omniscience', manualData),
          'AA-Omniscience Accuracy': getManualValue(modelId, 'AA-Omniscience Accuracy', manualData),
          'AA-Omniscience Hallucination Rate': getManualValue(modelId, 'AA-Omniscience Hallucination Rate', manualData),

          // LM Arena 점수
          'LMArena-Text': lmModel.score || 0,
          'LMArena-Text-Creative-Writing':
            lmarenaData['lmarena-text-creative-writing'].models.find(m => m.model === lmModel.model)?.score || 0,
          'LMArean-Text-Math':
            lmarenaData['lmarena-text-math'].models.find(m => m.model === lmModel.model)?.score || 0,
          'LMArena-Text-Coding':
            lmarenaData['lmarena-text-coding'].models.find(m => m.model === lmModel.model)?.score || 0,
          'LMArena-Text-Expert':
            lmarenaData['lmarena-text-expert'].models.find(m => m.model === lmModel.model)?.score || 0,
          'LMArena-Text-Hard-Prompts':
            lmarenaData['lmarena-text-hard-prompts'].models.find(m => m.model === lmModel.model)?.score || 0,
          'LMArena-Text-Longer-Query':
            lmarenaData['lmarena-text-longer-query'].models.find(m => m.model === lmModel.model)?.score || 0,
          'LMArena-Text-Multi-Turn':
            lmarenaData['lmarena-text-multi-turn'].models.find(m => m.model === lmModel.model)?.score || 0,
          'LMArena-Vision':
            lmarenaData['lmarena-vision'].models.find(m => m.model === lmModel.model)?.score || 0
        },
        metadata: {
          lmarenaRank: lmModel.rank,
          lmarenaVotes: lmModel.votes,
          pricing: {
            input: aaMatch.pricing?.price_1m_input_tokens || 0,
            output: aaMatch.pricing?.price_1m_output_tokens || 0
          },
          performance: {
            outputTokensPerSecond: aaMatch.median_output_tokens_per_second || 0,
            timeToFirstToken: aaMatch.median_time_to_first_token_seconds || 0
          }
        },
        tags: [],
        description: '',
        // 시각 입력 지원 여부 (manual-data.json에서 false로 지정된 모델만 제외, 기본값: true)
        supportsVision: manualData.models?.[modelId]?.supportsVision !== false,
        // 추론 모델 여부 (manual-data.json에서 true로 지정된 모델만)
        isReasoning: manualData.models?.[modelId]?.isReasoning === true
      });

      console.log(` ✓ Merged: ${lmModel.model}`);
    } else {
      // 매칭 실패 (LM Arena에만 존재)
      unmatchedModels.push(lmModel.model);
      console.warn(`⚠ Unmatched: ${lmModel.model}`);
    }
  }

  // 4. 최종 JSON 생성 (defaultModelIds는 data-loader.js에서 동적으로 선택)
  const output = {
    metadata: {
      version: '2.0.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      description: 'LLM 벤치마크 통합 데이터',
      totalModels: mergedModels.length,
      defaultModelIds: [],  // data-loader.js에서 동적으로 선택
      dataSources: {
        lmarena: {
          lastFetched: lmarenaData['lmarena-text'].fetchedAt,
          totalModels: baseModels.length
        },
        artificialanalysis: {
          lastFetched: aaData.fetchedAt,
          totalModels: aaModels.length
        }
      }
    },
    models: mergedModels
  };

  const outputPath = join(__dirname, '..', 'data', 'models.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Merge complete!`);
  console.log(`  - Total models: ${mergedModels.length}`);
  console.log(`  - Skipped old models (>1 year): ${skippedOldModels.length}`);
  console.log(`  - Unmatched models: ${unmatchedModels.length}`);

  // 6. 매칭 실패 모델 저장 (디버깅용)
  if (unmatchedModels.length > 0) {
    console.log(`\nUnmatched models (add to model-mapping.json):`);
    unmatchedModels.forEach(name => console.log(`  - ${name}`));

    writeFileSync(
      join(rawDir, 'unmatched-models.json'),
      JSON.stringify({
        unmatchedModels,
        suggestion: "Add these models to scripts/model-mapping.json",
        timestamp: new Date().toISOString()
      }, null, 2)
    );
  }
}

mergeData().catch(console.error);
