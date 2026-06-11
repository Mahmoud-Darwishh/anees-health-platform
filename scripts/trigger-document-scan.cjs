#!/usr/bin/env node

const DEFAULT_BASE_URL = process.env.APP_BASE_URL || 'http://127.0.0.1:3000';
const DEFAULT_SCAN_PATH = '/api/internal/ehr/documents/scan?limit=25';

async function main() {
  const key = process.env.EHR_DOCUMENT_SCAN_KEY || process.env.CRON_SECRET;
  if (!key) {
    console.error('[scan-cron] Missing EHR_DOCUMENT_SCAN_KEY or CRON_SECRET');
    process.exit(1);
  }

  const baseUrl = (process.env.EHR_DOCUMENT_SCAN_URL || `${DEFAULT_BASE_URL}${DEFAULT_SCAN_PATH}`).trim();
  const includeFailed = String(process.env.EHR_DOCUMENT_SCAN_INCLUDE_FAILED || '').toLowerCase() === 'true';
  const url = new URL(baseUrl);

  if (includeFailed && !url.searchParams.has('includeFailed')) {
    url.searchParams.set('includeFailed', 'true');
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
    },
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`[scan-cron] Failed (${response.status}): ${text}`);
    process.exit(1);
  }

  console.log(`[scan-cron] Success: ${text}`);
}

main().catch((error) => {
  console.error('[scan-cron] Unexpected failure:', error?.message || String(error));
  process.exit(1);
});
