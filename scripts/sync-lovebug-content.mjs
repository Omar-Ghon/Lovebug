import fs from 'node:fs/promises';
import path from 'node:path';

const APPS_SCRIPT_URL = process.env.LOVEBUG_CONTENT_URL;
const OUTPUT_PATH = path.resolve('src/assets/data/order-categories.json');

if (!APPS_SCRIPT_URL) {
  throw new Error('Missing LOVEBUG_CONTENT_URL environment variable.');
}

async function main() {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Lovebug content. HTTP ${response.status}`);
  }

  const json = await response.json();

  if (!json?.success) {
    throw new Error(json?.error || 'Apps Script returned unsuccessful response.');
  }

  if (!Array.isArray(json.data)) {
    throw new Error('Apps Script response data is not an array.');
  }

  const formatted = JSON.stringify(
    {
      success: true,
      version: json.version,
      lastUpdated: json.lastUpdated,
      data: json.data
    },
    null,
    2
  );

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, formatted, 'utf8');

  console.log(`Lovebug content synced to ${OUTPUT_PATH}`);
  console.log(`Version: ${json.version}`);
  console.log(`Last updated: ${json.lastUpdated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});