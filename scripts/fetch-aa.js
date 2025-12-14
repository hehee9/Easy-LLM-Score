import fetch from 'node-fetch';
import { writeFileSync, mkdirSync } from 'fs';
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
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit reached. Retrying...');
          await new Promise(resolve => setTimeout(resolve, 5000 * (i + 1)));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`Retry ${i + 1}/${maxRetries} after error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}

async function fetchAA() {
  console.log('Fetching Artificial Analysis data...');

  try {
    const response = await fetchWithRetry(API_URL, {
      headers: {
        'x-api-key': API_KEY
      }
    });

    const responseData = await response.json();
    const models = responseData.data || [];
    console.log(` Fetched ${models.length} models from Artificial Analysis`);

    const output = {
      models: models,
      fetchedAt: new Date().toISOString()
    };

    // data/raw 	 ¬ Ý1
    const rawDir = join(__dirname, '..', 'data', 'raw');
    mkdirSync(rawDir, { recursive: true });

    const outputPath = join(rawDir, 'aa-models.json');
    writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(` Saved to ${outputPath}`);
    return output;
  } catch (error) {
    console.error(' Failed to fetch Artificial Analysis data:', error.message);
    throw error;
  }
}

fetchAA().catch(console.error);
