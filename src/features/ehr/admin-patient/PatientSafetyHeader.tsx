import Link from 'next/link';
import type { ReactNode } from 'react';
import type { DnrStatus } from '@prisma/client';

import type { AdminPatientDetailData } from './types';

type SafetyHeaderLinks = {
  allergies: string;
  dnr: string;
  problems: string;
  medications: string;
  visits: string;
  measurements: string;
  careTeam: string;
  tasks: string;
  restricted: string;
};

type LatestVisit = AdminPatientDetailData['localVisits'][number] | null;
type LatestVitals = AdminPatientDetailData['vitals'][number] | null;

type PatientSafetyHeaderProps = {
  patientName: string;
  patientCode: string | null;
  patientGender?: string | null;
  patientBirthDate?: string | null;
  dnrStatus: DnrStatus | null;
  restrictedAccess: AdminPatientDetailData['restrictedAccess'];
  allergies: AdminPatientDetailData['allergies'];
  activeDiagnoses: string[];
  activeMedicationCount: number;
  careTeamCount: number;
  openTaskCount: number;
  latestVisit: LatestVisit;
  latestVitals: LatestVitals;
  links: SafetyHeaderLinks;
  children?: ReactNode;
};

function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) {
    return null;
  }

  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function dnrLabel(status: PatientSafetyHeaderProps['dnrStatus']): string {
  switch (status) {
    case 'dnr':
      return 'DNR active';
    case 'full_code':
      return 'Full code';
    case 'unknown':
      return 'Unknown code status';
    default:
      return 'Not flagged';
  }
}

function dnrTone(status: PatientSafetyHeaderProps['dnrStatus']): string {
  switch (status) {
    case 'dnr':
      return 'is-warning';
    case 'unknown':
      return 'is-muted';
    case 'full_code':
      return 'is-ok';
    default:
      return 'is-muted';
  }
}

function vitalsSummary(vitals: LatestVitals): string {
  if (!vitals) {
    return 'No vitals yet';
  }

  const metrics = [
    vitals.systolicBp && vitals.diastolicBp ? `BP ${vitals.systolicBp}/${vitals.diastolicBp}` : null,
    vitals.heartRate ? `HR ${vitals.heartRate}` : null,
    vitals.spo2Pct ? `SpO2 ${vitals.spo2Pct}%` : null,
    vitals.temperatureC ? `Temp ${vitals.temperatureC}C` : null,
    vitals.painScore !== null && vitals.painScore !== undefined ? `Pain ${vitals.painScore}/10` : null,
  ].filter(Boolean);

  return metrics.length > 0 ? metrics.join(' - ') : 'Vitals recorded';
}

function formatGenderAge(gender?: string | null, birthDate?: string | null): string {
  const age = calculateAge(birthDate);
  const parts = [
    gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : null,
    age !== null ? `${age} yrs` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' - ') : 'Demographics pending';
}

export function PatientSafetyHeader({
  patientName,
  patientCode,
  patientGender,
  patientBirthDate,
  dnrStatus,
  restrictedAccess,
  allergies,
  activeDiagnoses,
  activeMedicationCount,
  careTeamCount,
  openTaskCount,
  latestVisit,
  latestVitals,
  links,
  children,
}: PatientSafetyHeaderProps) {
  const hasAllergies = allergies.length > 0;
  const allergyPreview = allergies.slice(0, 2).map((allergy) => allergy.allergen).join(', ');
  const diagnosisPreview = activeDiagnoses.length > 0 ? activeDiagnoses.join(', ') : 'None recorded';
  const restrictedLabel = restrictedAccess.hasRestrictedContent
    ? restrictedAccess.requiresReason
      ? 'Restricted - locked'
      : 'Restricted - access active'
    : 'Restricted - no signal';

  return (
    <section id="patient-safety-header" className="card bg-white border-danger-subtle anees-patient-safety-header" aria-label="Patient safety header">
      <div className="card-body">
        <div className="anees-safety-topline">
          <div className="anees-safety-heading">
            <p className="text-muted small mb-1">Patient safety header</p>
            <h2 className="h5 mb-1">{patientName}</h2>
            <div className="anees-safety-identity">
              <span>{patientCode ?? 'No case ID'}</span>
              <span>{formatGenderAge(patientGender, patientBirthDate)}</span>
            </div>
          </div>

          <div className="anees-safety-badges" aria-label="Critical patient safety indicators">
            <Link href={links.allergies} className={`anees-safety-badge ${hasAllergies ? 'is-critical' : 'is-muted'}`}>
              Allergies: {allergies.length}
            </Link>
            <Link href={links.dnr} className={`anees-safety-badge ${dnrTone(dnrStatus)}`}>
              {dnrLabel(dnrStatus)}
            </Link>
            <Link href={links.restricted} className={`anees-safety-badge ${restrictedAccess.hasRestrictedContent ? 'is-locked' : 'is-muted'}`}>
              {restrictedLabel}
            </Link>
          </div>
        </div>

        <div className="anees-safety-strip" aria-label="Patient safety summary">
          <Link href={links.problems} className="anees-safety-item">
            <span>Problems</span>
            <strong>{diagnosisPreview}</strong>
          </Link>

          <Link href={links.medications} className="anees-safety-item">
            <span>Meds</span>
            <strong>{activeMedicationCount}</strong>
            {hasAllergies && <em>{allergyPreview}</em>}
          </Link>

          <Link href={links.visits} className="anees-safety-item">
            <span>Visit</span>
            <strong>{latestVisit ? latestVisit.effectiveState.replaceAll('_', ' ') : 'none'}</strong>
          </Link>

          <Link href={links.measurements} className="anees-safety-item">
            <span>Vitals</span>
            <strong>{vitalsSummary(latestVitals)}</strong>
          </Link>

          <Link href={links.tasks} className="anees-safety-item">
            <span>Tasks</span>
            <strong>{openTaskCount}</strong>
          </Link>

          <Link href={links.careTeam} className="anees-safety-item">
            <span>Team</span>
            <strong>{careTeamCount}</strong>
          </Link>
        </div>

        {restrictedAccess.hasRestrictedContent && restrictedAccess.requiresReason && (
          <p className="anees-safety-restricted-note mb-0">
            Restricted content exists on this chart. Details remain hidden until a reasoned access request or approved break-glass token is active.
          </p>
        )}

        {children}
      </div>
    </section>
  );
}
