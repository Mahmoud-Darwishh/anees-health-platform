import { auth } from '@/auth';
import type { Session } from 'next-auth';

export async function getSession(): Promise<Session | null> {
  return auth();
}

export async function requirePatient(): Promise<Session> {
  const session = await auth();
  if (!session || session.user.role !== 'patient') {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireStaff(): Promise<Session> {
  const session = await auth();
  if (!session || session.user.role !== 'staff') {
    throw new Error('Unauthorized');
  }
  return session;
}

export function isPatientLinked(session: Session): boolean {
  return session.user.role === 'patient' && !!session.user.patientId;
}
