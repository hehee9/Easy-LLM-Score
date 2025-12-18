import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CATEGORIES = [
  { id: 'text', path: 'text', field: 'LMArena-Text' },
  { id: 'text-creative-writing', path: 'text/creative-writing', field: 'LMArena-Text-Creative-Writing' },
  { id: 'text-math', path: 'text/math', field: 'LMArean-Text-Math' },
  { id: 'text-coding', path: 'text/coding', field: 'LMArena-Text-Coding' },
  { id: 'text-expert', path: 'text/expert', field: 'LMArena-Text-Expert' },
  { id: 'text-hard-prompts', path: 'text/hard-prompts', field: 'LMArena-Text-Hard-Prompts' },
  { id: 'text-longer-query', path: 'text/longer-query', field: 'LMArena-Text-Longer-Query' },
  { id: 'text-multi-turn', path: 'text/multi-turn', field: 'LMArena-Text-Multi-Turn' }
];

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // 200 OK가 아닌 경우 상태 코드 반환
      if (!response.ok) {
        return { status: response.status, ok: false };
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) {
        // 최종 실패 시 에러 객체 반환
        return { status: 0, ok: false, error: error.message };
      }
      console.warn(`Retry ${i + 1}/${maxRetries} after error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}

async function fetchLMArena(category) {
  const url = `https://lmarena.ai/ko/leaderboard/${category.path}`;
  const rawDir = join(__dirname, '..', 'data', 'raw');
  const outputPath = join(rawDir, `lmarena-${category.id}.json`);

  console.log(`Fetching ${category.field} from ${url}...`);

  try {
    const response = await fetchWithRetry(url);

    // 200 OK가 아닌 경우 기존 파일 보존
    if (!response.ok) {
      console.warn(` ⚠ Failed with status ${response.status || 'network error'} - preserving existing data`);

      // 기존 파일이 있으면 읽어서 반환
      if (existsSync(outputPath)) {
        const existingData = JSON.parse(readFileSync(outputPath, 'utf8'));
        console.log(` ✓ Using existing data (${existingData.models?.length || 0} models)`);
        return existingData;
      } else {
        // 기존 파일도 없으면 빈 배열 반환
        console.warn(` ✗ No existing data found, returning empty result`);
        return { category: category.field, models: [], error: `HTTP ${response.status}` };
      }
    }

    // 200 OK인 경우 정상 처리
    const html = await response.text();
    const $ = cheerio.load(html);

    const models = [];
    $('tbody > tr').each((i, tr) => {
      const td = $(tr).find('td');
      if (td.length === 0) return;

      const rank = parseInt(td.eq(0).text().trim());
      const rankRange = td.eq(1).text().trim();  // 순위 범위 (예: "1◄─►2")
      const model = td.eq(2).text().trim();
      const score = parseFloat(td.eq(3).text().trim());
      const votesText = td.eq(4).text().trim().replace(/,/g, '');
      const votes = parseInt(votesText) || 0;

      if (model && !isNaN(score)) {
        models.push({ rank, rankRange, model, score, votes });
      }
    });

    console.log(` ✓ Fetched ${models.length} models for ${category.field}`);
    return { category: category.field, models, fetchedAt: new Date().toISOString() };
  } catch (error) {
    console.error(` ✗ Failed to fetch ${category.field}:`, error.message);

    // 기존 파일이 있으면 읽어서 반환
    if (existsSync(outputPath)) {
      const existingData = JSON.parse(readFileSync(outputPath, 'utf8'));
      console.log(` ✓ Using existing data (${existingData.models?.length || 0} models)`);
      return existingData;
    } else {
      // 기존 파일도 없으면 빈 배열 반환
      return { category: category.field, models: [], error: error.message };
    }
  }
}

async function main() {
  // data/raw 디렉토리 생성
  const rawDir = join(__dirname, '..', 'data', 'raw');
  mkdirSync(rawDir, { recursive: true });

  const results = {};

  for (const category of CATEGORIES) {
    const data = await fetchLMArena(category);
    results[category.id] = data;

    // 개별 파일로 저장 (성공한 경우에만)
    if (!data.error || data.models.length > 0) {
      const outputPath = join(rawDir, `lmarena-${category.id}.json`);
      writeFileSync(outputPath, JSON.stringify(data, null, 2));
    }

    // Rate limiting (1초 대기)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ All LM Arena data fetched successfully');
}

main().catch(console.error);
