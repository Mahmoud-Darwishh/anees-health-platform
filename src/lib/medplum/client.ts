import 'server-only';

import { ClientStorage, MedplumClient, MemoryStorage } from '@medplum/core';

import { getMedplumConfig } from './config';

type MedplumClientState = {
  client: MedplumClient;
  proxiedClient: MedplumClient;
  loginPromise?: Promise<void>;
};

let medplumClientState: MedplumClientState | undefined;

function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as {
    status?: number;
    statusCode?: number;
    code?: number | string;
    message?: string;
    issue?: Array<{ details?: { text?: string } }>;
  };

  if (maybeError.status === 401 || maybeError.statusCode === 401 || maybeError.code === 401) {
    return true;
  }

  const normalizedMessage = maybeError.message?.toLowerCase() ?? '';
  if (normalizedMessage.includes('401') || normalizedMessage.includes('unauthorized')) {
    return true;
  }

  return (maybeError.issue ?? []).some((issue) => {
    const text = issue.details?.text?.toLowerCase() ?? '';
    return text.includes('401') || text.includes('unauthorized');
  });
}

async function loginMedplumClient(state: MedplumClientState): Promise<void> {
  const { clientId, clientSecret } = getMedplumConfig();

  state.loginPromise = state.client
    .startClientLogin(clientId, clientSecret)
    .then(() => undefined)
    .catch((error) => {
      medplumClientState = undefined;
      throw error;
    });

  try {
    await state.loginPromise;
  } finally {
    if (medplumClientState === state) {
      state.loginPromise = undefined;
    }
  }
}

async function ensureMedplumLogin(state: MedplumClientState): Promise<void> {
  if (!state.loginPromise) {
    await loginMedplumClient(state);
    return;
  }

  await state.loginPromise;
}

async function forceMedplumRelogin(state: MedplumClientState): Promise<void> {
  if (state.loginPromise) {
    await state.loginPromise;
    return;
  }

  await loginMedplumClient(state);
}

function createResilientClientProxy(state: MedplumClientState): MedplumClient {
  return new Proxy(state.client, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') {
        return value;
      }

      return async (...args: unknown[]) => {
        try {
          return await value.apply(target, args);
        } catch (error) {
          if (!isUnauthorizedError(error) || medplumClientState !== state) {
            throw error;
          }

          await forceMedplumRelogin(state);
          return value.apply(target, args);
        }
      };
    },
  }) as MedplumClient;
}

function createMedplumClient(): MedplumClient {
  const { baseUrl } = getMedplumConfig();

  return new MedplumClient({
    baseUrl,
    cacheTime: 0,
    logLevel: process.env.NODE_ENV === 'development' ? 'basic' : 'none',
    storage: new ClientStorage(new MemoryStorage()),
  });
}

export async function getMedplumClient(): Promise<MedplumClient> {
  if (!medplumClientState) {
    const client = createMedplumClient();
    const state: MedplumClientState = {
      client,
      proxiedClient: client,
    };
    state.proxiedClient = createResilientClientProxy(state);
    medplumClientState = state;
  }

  await ensureMedplumLogin(medplumClientState);
  return medplumClientState.proxiedClient;
}