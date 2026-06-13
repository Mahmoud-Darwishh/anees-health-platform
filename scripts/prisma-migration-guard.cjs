const { spawnSync } = require('node:child_process');

const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

if (!shadowDatabaseUrl) {
  console.error('SHADOW_DATABASE_URL is required for the Prisma migration drift guard.');
  process.exit(1);
}

const prismaArgs = [
  require.resolve('prisma/build/index.js'),
  'migrate',
  'diff',
  '--from-migrations',
  './prisma/migrations',
  '--to-schema-datamodel',
  './prisma/schema.prisma',
  '--shadow-database-url',
  shadowDatabaseUrl,
  '--exit-code',
];

const result = spawnSync(process.execPath, prismaArgs, { stdio: 'inherit' });

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
