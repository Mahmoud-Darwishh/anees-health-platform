require('ts-node').register({
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'node',
  },
});

require('./backfill-patient-goals-to-fhir.ts');
