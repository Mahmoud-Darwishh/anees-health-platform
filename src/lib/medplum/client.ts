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

/**
 * Paginate a Medplum search to completeness (offset-based), accumulating every
 * page up to a safety cap.
 *
 * Fixes silent truncation on clinical lists: a single fixed `_count` page could
 * drop active records once a patient accumulates history — especially where
 * entered-in-error rows are filtered client-side *after* the fetch, so corrected
 * records can push live ones past the cap. For safety-critical lists (allergies,
 * medications, problems) a missing row is a patient-safety hazard, not just a UX
 * one. Reads should be sorted so the newest records survive if the cap is hit.
 *
 * Offset paging (vs. cursor/`Bundle.link`) is used deliberately: it composes with
 * the resilient client proxy (which wraps every method and would break a
 * `for await` over an async generator) and is more than adequate for the bounded
 * per-patient lists this is applied to.
 */
export async function searchAllResources<T>(
  resourceType: string,
  query: Record<string, string | undefined>,
  options: { pageSize?: number; maxResources?: number } = {},
): Promise<T[]> {
  const medplum = await getMedplumClient();
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 100, 200));
  const maxResources = Math.max(1, options.maxResources ?? 2000);

  const baseQuery: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && key !== '_count' && key !== '_offset') {
      baseQuery[key] = value;
    }
  }

  const all: T[] = [];
  let offset = 0;
  while (all.length < maxResources) {
    const page = (await medplum.searchResources(
      resourceType as Parameters<typeof medplum.searchResources>[0],
      { ...baseQuery, _count: String(pageSize), _offset: String(offset) },
    )) as unknown as T[];

    all.push(...page);
    if (page.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return all.length > maxResources ? all.slice(0, maxResources) : all;
}