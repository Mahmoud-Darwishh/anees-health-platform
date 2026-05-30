import { MEDPLUM_CODE_SYSTEMS, MEDPLUM_EXTENSION_URLS } from './constants';

export type PortalScope = 'profile' | 'visits' | 'vitals' | 'notes' | 'tasks';
export type PortalConsentDecision = 'allow' | 'deny';

export type CaregiverIdentity = {
  phone?: string | null;
  email?: string | null;
};

export type ConsentResource = {
  resourceType: 'Consent';
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
  status?: string;
  patient?: { reference?: string };
  dateTime?: string;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
    valueUri?: string;
  }>;
  provision?: {
    type?: 'permit' | 'deny';
    actor?: Array<{
      reference?: {
        reference?: string;
        display?: string;
        identifier?: {
          system?: string;
          value?: string;
        };
      };
    }>;
  };
};

export type ConsentResolution = {
  consentId: string;
  scopes: PortalScope[];
};

const DEFAULT_CAREGIVER_PORTAL_SCOPES: PortalScope[] = ['profile', 'visits'];

function normalizePhone(value?: string | null): string {
  return (value ?? '').replace(/[^\d+]/g, '').toLowerCase();
}

function normalizeValue(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function includesIdentity(haystack?: string, identities?: Set<string>): boolean {
  if (!haystack || !identities || identities.size === 0) {
    return false;
  }

  const normalizedHaystack = normalizeValue(haystack);
  return identities.has(normalizedHaystack);
}

function getScopeFromCode(code?: string): PortalScope | null {
  switch ((code ?? '').toLowerCase()) {
    case 'profile':
      return 'profile';
    case 'visits':
      return 'visits';
    case 'vitals':
      return 'vitals';
    case 'notes':
      return 'notes';
    case 'tasks':
      return 'tasks';
    default:
      return null;
  }
}

export function extractScopes(consent: ConsentResource): PortalScope[] {
  const scopeSet = new Set<PortalScope>();

  for (const ext of consent.extension ?? []) {
    if (ext.url !== MEDPLUM_EXTENSION_URLS.portalScope) {
      continue;
    }

    const resolved = getScopeFromCode(ext.valueCode ?? ext.valueString);
    if (resolved) {
      scopeSet.add(resolved);
    }
  }

  if (scopeSet.size === 0) {
    return [...DEFAULT_CAREGIVER_PORTAL_SCOPES];
  }

  return Array.from(scopeSet);
}

export function consentDeniesAccess(consent: ConsentResource): boolean {
  return consent.provision?.type === 'deny';
}

export function matchesCaregiverIdentity(consent: ConsentResource, identity: CaregiverIdentity): boolean {
  const phone = normalizePhone(identity.phone);
  const email = normalizeValue(identity.email);

  const normalizedIdentities = new Set<string>();
  if (phone) {
    normalizedIdentities.add(phone);
  }
  if (email) {
    normalizedIdentities.add(email);
  }

  if (normalizedIdentities.size === 0) {
    return false;
  }

  for (const ext of consent.extension ?? []) {
    if (
      ext.url === MEDPLUM_EXTENSION_URLS.caregiverPhone ||
      ext.url === MEDPLUM_EXTENSION_URLS.caregiverEmail
    ) {
      const value = ext.valueString ?? ext.valueUri;
      const normalized = ext.url === MEDPLUM_EXTENSION_URLS.caregiverPhone
        ? normalizePhone(value)
        : normalizeValue(value);

      if (normalized && normalizedIdentities.has(normalized)) {
        return true;
      }
    }
  }

  for (const actor of consent.provision?.actor ?? []) {
    const identifier = actor.reference?.identifier;
    if (!identifier?.value) {
      continue;
    }

    const normalized = identifier.system === MEDPLUM_CODE_SYSTEMS.caregiverPhone
      ? normalizePhone(identifier.value)
      : normalizeValue(identifier.value);

    if (normalized && normalizedIdentities.has(normalized)) {
      return true;
    }

    if (includesIdentity(actor.reference?.display, normalizedIdentities)) {
      return true;
    }
  }

  return false;
}

export function resolvePortalConsentFromResources(
  consents: ConsentResource[],
  identity: CaregiverIdentity,
): ConsentResolution | null {
  for (const consent of consents) {
    if (!consent.id || consent.status !== 'active') {
      continue;
    }

    if (!matchesCaregiverIdentity(consent, identity)) {
      continue;
    }

    if (consentDeniesAccess(consent)) {
      return null;
    }

    return {
      consentId: consent.id,
      scopes: extractScopes(consent),
    };
  }

  return null;
}
