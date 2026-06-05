import type { ReactNode } from 'react';

import type { AssignableStaff } from './types';

export function Row({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="row border-bottom py-2">
      <div className="col-4 text-muted small">{label}</div>
      <div className="col-8">{value ?? '—'}</div>
    </div>
  );
}

export function encounterStatusLabel(status?: string): string {
  switch (status) {
    case 'planned':
      return 'Scheduled';
    case 'in-progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status ?? 'Unknown';
  }
}

export function encounterVisitType(encounter: {
  serviceType?: Array<{ coding?: Array<{ code?: string; display?: string }> }>;
}): string {
  const coding = encounter.serviceType?.[0]?.coding?.[0];
  if (coding?.display) {
    return coding.display;
  }

  switch (coding?.code) {
    case 'in_home':
      return 'In-home';
    case 'clinic':
      return 'Clinic';
    case 'virtual':
      return 'Virtual';
    default:
      return '—';
  }
}

export function taskStatusLabel(status: string): string {
  switch (status) {
    case 'requested':
      return 'Open';
    case 'in-progress':
      return 'In progress';
    case 'completed':
      return 'Done';
    case 'on-hold':
      return 'On hold';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function taskTitle(task: { code?: { text?: string; coding?: Array<{ display?: string }> } }): string {
  return task.code?.text ?? task.code?.coding?.[0]?.display ?? 'Follow-up';
}

export function taskPriorityLabel(priority?: string | null): string {
  switch (priority) {
    case 'stat':
      return 'STAT';
    case 'asap':
      return 'ASAP';
    case 'urgent':
      return 'Urgent';
    case 'routine':
      return 'Routine';
    default:
      return '—';
  }
}

export function taskDueDate(task: { executionPeriod?: { end?: string } }): string {
  return task.executionPeriod?.end ? new Date(task.executionPeriod.end).toLocaleDateString('en-GB') : '—';
}

export function reportCode(report: { code?: { coding?: Array<{ code?: string }> } }): string {
  return report.code?.coding?.[0]?.code ?? 'unknown';
}

export function appointmentTypeLabel(type?: string | null): string {
  switch (type) {
    case 'in_home':
      return 'In-home';
    case 'clinic':
      return 'Clinic';
    case 'virtual':
      return 'Virtual';
    default:
      return type ?? '—';
  }
}

export function reportComponentText(
  report: {
    component?: Array<{
      code?: { coding?: Array<{ code?: string }> };
      valueString?: string;
      valueInteger?: number;
    }>;
  },
  code: string,
): string | null {
  const component = report.component?.find((entry) => entry.code?.coding?.[0]?.code === code);
  if (!component) return null;
  if (typeof component.valueString === 'string' && component.valueString.trim()) return component.valueString;
  if (typeof component.valueInteger === 'number') return String(component.valueInteger);
  return null;
}

export function toCareTeamRole(
  role: AssignableStaff['role'],
): 'doctor' | 'nurse' | 'physiotherapist' | 'medical_ops' | 'admin' | 'superadmin' | null {
  const allowedRoles: Array<'doctor' | 'nurse' | 'physiotherapist' | 'medical_ops' | 'admin' | 'superadmin'> = [
    'doctor',
    'nurse',
    'physiotherapist',
    'medical_ops',
    'admin',
    'superadmin',
  ];

  if (role === 'operator') {
    return 'medical_ops';
  }

  if (!allowedRoles.includes(role as (typeof allowedRoles)[number])) {
    return null;
  }

  return role as (typeof allowedRoles)[number];
}
