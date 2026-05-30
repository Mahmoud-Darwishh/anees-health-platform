import 'server-only';

import { getMedplumClient } from './client';
import { MEDPLUM_CODE_SYSTEMS, MEDPLUM_EXTENSION_URLS } from './constants';
import {
  consentDeniesAccess,
  extractScopes,
  matchesCaregiverIdentity,
  resolvePortalConsentFromResources,
  type CaregiverIdentity,
  type ConsentResolution,
  type ConsentResource,
  type PortalConsentDecision,
  type PortalScope,
} from './consent-policy';

export type {
  CaregiverIdentity,
  ConsentResolution,
  ConsentResource,
  PortalConsentDecision,
  PortalScope,
};

export type PortalConsentSummary = {
  id: string;
  versionId?: string;
  status?: string;
  decision: PortalConsentDecision;
  caregiverPhone?: string;
  caregiverEmail?: string;
  scopes: PortalScope[];
  updatedAt?: string;
};

type ConsentProvisionActor = NonNullable<
  NonNullable<NonNullable<ConsentResource['provision']>['actor']>[number]
>;

function extractCaregiverPhone(consent: ConsentResource): string | undefined {
  for (const ext of consent.extension ?? []) {
    if (ext.url === MEDPLUM_EXTENSION_URLS.caregiverPhone) {
      const value = ext.valueString ?? ext.valueUri;
      if (value) {
        return value;
      }
    }
  }

  for (const actor of consent.provision?.actor ?? []) {
    const identifier = actor.reference?.identifier;
    if (identifier?.system === MEDPLUM_CODE_SYSTEMS.caregiverPhone && identifier.value) {
      return identifier.value;
    }
  }

  return undefined;
}

function extractCaregiverEmail(consent: ConsentResource): string | undefined {
  for (const ext of consent.extension ?? []) {
    if (ext.url === MEDPLUM_EXTENSION_URLS.caregiverEmail) {
      const value = ext.valueString ?? ext.valueUri;
      if (value) {
        return value;
      }
    }
  }

  for (const actor of consent.provision?.actor ?? []) {
    const identifier = actor.reference?.identifier;
    if (identifier?.system === MEDPLUM_CODE_SYSTEMS.caregiverEmail && identifier.value) {
      return identifier.value;
    }
  }

  return undefined;
}

function buildConsentExtensions(identity: CaregiverIdentity, scopes: PortalScope[]) {
  const extensions: Array<{ url: string; valueString?: string; valueCode?: string }> = [];

  const phone = identity.phone?.trim();
  const email = identity.email?.trim().toLowerCase();

  if (phone) {
    extensions.push({
      url: MEDPLUM_EXTENSION_URLS.caregiverPhone,
      valueString: phone,
    });
  }

  if (email) {
    extensions.push({
      url: MEDPLUM_EXTENSION_URLS.caregiverEmail,
      valueString: email,
    });
  }

  for (const scope of scopes) {
    extensions.push({
      url: MEDPLUM_EXTENSION_URLS.portalScope,
      valueCode: scope,
    });
  }

  return extensions;
}

function buildProvisionActors(identity: CaregiverIdentity): ConsentProvisionActor[] {
  const actors: ConsentProvisionActor[] = [];

  const phone = identity.phone?.trim();
  if (phone) {
    actors.push({
      reference: {
        identifier: {
          system: MEDPLUM_CODE_SYSTEMS.caregiverPhone,
          value: phone,
        },
      },
    });
  }

  const email = identity.email?.trim().toLowerCase();
  if (email) {
    actors.push({
      reference: {
        identifier: {
          system: MEDPLUM_CODE_SYSTEMS.caregiverEmail,
          value: email,
        },
      },
    });
  }

  return actors;
}

function toSummary(consent: ConsentResource): PortalConsentSummary | null {
  if (!consent.id) {
    return null;
  }

  return {
    id: consent.id,
    versionId: consent.meta?.versionId,
    status: consent.status,
    decision: consentDeniesAccess(consent) ? 'deny' : 'allow',
    caregiverPhone: extractCaregiverPhone(consent),
    caregiverEmail: extractCaregiverEmail(consent),
    scopes: extractScopes(consent),
    updatedAt: consent.meta?.lastUpdated ?? consent.dateTime,
  };
}

export async function listPatientCaregiverPortalConsents(
  patientMedplumId: string,
): Promise<PortalConsentSummary[]> {
  const medplum = await getMedplumClient();

  const consents = (await medplum.searchResources('Consent', {
    patient: `Patient/${patientMedplumId}`,
    _sort: '-_lastUpdated',
    _count: '50',
  } as never)) as ConsentResource[];

  return consents
    .map((consent) => toSummary(consent))
    .filter((item): item is PortalConsentSummary => !!item);
}

export async function upsertCaregiverPortalConsent(input: {
  patientMedplumId: string;
  identity: CaregiverIdentity;
  decision: PortalConsentDecision;
  scopes: PortalScope[];
  expectedVersionId?: string | null;
  consentId?: string | null;
}): Promise<PortalConsentSummary> {
  const medplum = await getMedplumClient();

  const existing = input.consentId
    ? ((await medplum.readResource('Consent', input.consentId)) as ConsentResource)
    : (await medplum.searchResources('Consent', {
        patient: `Patient/${input.patientMedplumId}`,
        _sort: '-_lastUpdated',
        _count: '50',
      } as never)).find((item) => matchesCaregiverIdentity(item as ConsentResource, input.identity)) as ConsentResource | undefined;

  if (input.expectedVersionId && existing?.meta?.versionId !== input.expectedVersionId) {
    throw new Error('Consent was updated by another user. Please refresh and try again.');
  }

  const payload: ConsentResource = {
    resourceType: 'Consent',
    status: 'active',
    patient: { reference: `Patient/${input.patientMedplumId}` },
    dateTime: new Date().toISOString(),
    extension: buildConsentExtensions(input.identity, input.scopes),
    provision: {
      type: input.decision === 'deny' ? 'deny' : 'permit',
      actor: buildProvisionActors(input.identity),
    },
  };

  const saved = existing?.id
    ? ((await medplum.updateResource(
        {
          ...existing,
          ...payload,
          id: existing.id,
        } as never,
        {
          headers: input.expectedVersionId
            ? { 'If-Match': `W/\"${input.expectedVersionId}\"` }
            : undefined,
        },
      )) as ConsentResource)
    : ((await medplum.createResource(payload as never)) as ConsentResource);

  const summary = toSummary(saved);
  if (!summary) {
    throw new Error('Consent could not be persisted.');
  }

  return summary;
}

export async function resolvePortalConsentForCaregiver(
  patientMedplumId: string,
  identity: CaregiverIdentity,
): Promise<ConsentResolution | null> {
  const medplum = await getMedplumClient();

  const consents = (await medplum.searchResources('Consent', {
    patient: `Patient/${patientMedplumId}`,
    status: 'active',
    _sort: '-_lastUpdated',
    _count: '50',
  } as never)) as ConsentResource[];

  return resolvePortalConsentFromResources(consents, identity);
}
