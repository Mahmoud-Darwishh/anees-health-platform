type MedplumConfig = {
  baseUrl: string;
  projectId?: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Medplum env var: ${name}`);
  }
  return value;
}

export function getMedplumConfig(): MedplumConfig {
  return {
    baseUrl: required('MEDPLUM_BASE_URL'),
    projectId: process.env.MEDPLUM_PROJECT_ID?.trim() || undefined,
    clientId: required('MEDPLUM_CLIENT_ID'),
    clientSecret: required('MEDPLUM_CLIENT_SECRET'),
    scopes: process.env.MEDPLUM_SCOPES?.trim() || 'openid profile email offline_access',
  };
}

export function getMedplumProjectId(): string {
  return required('MEDPLUM_PROJECT_ID');
}
