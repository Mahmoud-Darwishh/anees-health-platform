import 'server-only';

import { MedplumClient } from '@medplum/core';

import { getMedplumConfig } from './config';

type MedplumClientState = {
  client: MedplumClient;
  loginPromise?: Promise<void>;
};

let medplumClientState: MedplumClientState | undefined;

function createMedplumClient(): MedplumClient {
  const { baseUrl } = getMedplumConfig();

  return new MedplumClient({
    baseUrl,
    cacheTime: 0,
    logLevel: process.env.NODE_ENV === 'development' ? 'basic' : 'none',
  });
}

export async function getMedplumClient(): Promise<MedplumClient> {
  const { clientId, clientSecret } = getMedplumConfig();

  medplumClientState ??= { client: createMedplumClient() };

  if (!medplumClientState.loginPromise) {
    medplumClientState.loginPromise = medplumClientState.client
      .startClientLogin(clientId, clientSecret)
      .then(() => undefined)
      .catch((error) => {
        medplumClientState = undefined;
        throw error;
      });
  }

  await medplumClientState.loginPromise;
  return medplumClientState.client;
}