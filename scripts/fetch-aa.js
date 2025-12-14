import fetch from 'node-fetch';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_KEY = process.env.AA_API_KEY || 'aa_DcmBnqhrRNXDoYmFjwzSPkEKdPmzUnRJ';
const API_URL = 'https://artificialanalysis.ai/api/v2/data/llms/models';

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // 200 OK가 아닌 경우 상태 코드 반환
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit reached. Retrying...');
          await new Promise(resolve => setTimeout(resolve, 5000 * (i + 1)));
          continue;
        }
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

async function fetchAA() {
  console.log('Fetching Artificial Analysis data...');

  const rawDir = join(__dirname, '..', 'data', 'raw');
  const outputPath = join(rawDir, 'aa-models.json');

  try {
    const response = await fetchWithRetry(API_URL, {
      headers: {
        'x-api-key': API_KEY
      }
    });

    // 200 OK가 아닌 경우 기존 파일 보존
    if (!response.ok) {
      console.warn(` ⚠ Failed with status ${response.status || 'network error'} - preserving existing data`);

      // 기존 파일이 있으면 읽어서 반환
      if (existsSync(outputPath)) {
        const existingData = JSON.parse(readFileSync(outputPath, 'utf8'));
        console.log(` ✓ Using existing data (${existingData.models?.length || 0} models)`);
        return existingData;
      } else {
        // 기존 파일도 없으면 에러 던지기
        console.error(` ✗ No existing data found`);
        throw new Error(`HTTP ${response.status}: No existing data available`);
      }
    }

    // 200 OK인 경우 정상 처리
    const responseData = await response.json();
    const models = responseData.data || [];
    console.log(` ✓ Fetched ${models.length} models from Artificial Analysis`);

    const output = {
      models: models,
      fetchedAt: new Date().toISOString()
    };

    // data/raw 디렉토리 생성
    mkdirSync(rawDir, { recursive: true });

    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(` ✓ Saved to ${outputPath}`);

    return output;
  } catch (error) {
    console.error(' ✗ Failed to fetch Artificial Analysis data:', error.message);

    // 기존 파일이 있으면 읽어서 반환
    if (existsSync(outputPath)) {
      const existingData = JSON.parse(readFileSync(outputPath, 'utf8'));
      console.log(` ✓ Using existing data (${existingData.models?.length || 0} models)`);
      return existingData;
    } else {
      // 기존 파일도 없으면 에러 던지기
      throw error;
    }
  }
}

fetchAA().catch(console.error);
