import { spawnSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const CORE_REQUIRED_KEYS = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'NEXT_PUBLIC_SITE_URL',
  'KASHIER_MODE',
  'KASHIER_MERCHANT_ID',
  'KASHIER_API_KEY',
  'KASHIER_SECRET_KEY',
  'MEDPLUM_BASE_URL',
  'MEDPLUM_CLIENT_ID',
  'MEDPLUM_CLIENT_SECRET',
];

const FEATURE_KEYS = [
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'PWA_PUSH_SERVER_KEY',
  'EHR_STORAGE_ROOT',
];

const portArg = process.argv.find((arg) => arg.startsWith('--port='));
const port = Number(portArg?.split('=')[1] ?? 3002);

function loadEnvFiles() {
  const files = ['.env', '.env.local'];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

function runStep(command, args) {
  console.log(`\n==> ${command} ${args.join(' ')}`);
  const res = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

function checkEnv() {
  const missingCore = CORE_REQUIRED_KEYS.filter((k) => {
    const v = process.env[k];
    return !v || !String(v).trim();
  });

  const missingFeature = FEATURE_KEYS.filter((k) => {
    const v = process.env[k];
    return !v || !String(v).trim();
  });

  if (missingCore.length > 0) {
    console.error('\nMissing required environment variables:');
    for (const key of missingCore) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }

  if (missingFeature.length > 0) {
    console.warn('\nWarning: missing optional feature environment variables:');
    for (const key of missingFeature) {
      console.warn(`- ${key}`);
    }
    console.warn('Deployment can still succeed, but related features may be disabled.');
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function smokeCheck() {
  console.log(`\n==> Starting production server on port ${port}`);
  const child = spawn('npm', ['run', 'start', '--', '-p', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: process.env,
  });

  let output = '';
  const onOut = (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(text);
  };

  child.stdout.on('data', onOut);
  child.stderr.on('data', onOut);

  const deadline = Date.now() + 30000;
  while (!output.includes('Ready in') && Date.now() < deadline) {
    await wait(300);
  }

  if (!output.includes('Ready in')) {
    child.kill('SIGTERM');
    throw new Error('Server did not become ready within 30s');
  }

  try {
    const home = await fetch(`http://127.0.0.1:${port}/en`, { redirect: 'manual' });
    const portal = await fetch(`http://127.0.0.1:${port}/en/portal`, { redirect: 'manual' });

    console.log(`\nSmoke results:`);
    console.log(`- /en => ${home.status}`);
    console.log(`- /en/portal => ${portal.status}`);

    if (home.status !== 200) {
      throw new Error(`/en expected 200 but got ${home.status}`);
    }

    if (portal.status !== 307 && portal.status !== 302) {
      throw new Error(`/en/portal expected redirect (302/307) but got ${portal.status}`);
    }
  } finally {
    child.kill('SIGTERM');
  }
}

async function main() {
  console.log('Deployment preflight started');
  loadEnvFiles();
  checkEnv();
  runStep('npm', ['run', 'db:migrate:status']);
  runStep('npm', ['run', 'db:migrate:deploy']);
  runStep('npm', ['run', 'build']);
  await smokeCheck();
  console.log('\nPreflight passed. Ready to deploy.');
}

main().catch((err) => {
  console.error(`\nPreflight failed: ${err.message}`);
  process.exit(1);
});
