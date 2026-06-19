import Link from 'next/link';
import { VisitTransitionForm } from '@/features/ehr/clinician-physio/VisitTransitionForm';
import type { ClinicianVisitFlowState } from '@/features/ehr/clinician-shared/visit-flow';
import type { NurseSessionData } from './data';
import {
  nurseAcknowledgeVisitAction,
  nurseStartTravelAction,
  nurseMarkArrivedAction,
  nurseCheckInVisitAction,
  nurseCheckOutVisitAction,
} from './actions';
import { NurseVitalsForm } from './NurseVitalsForm';
import { NurseAssessmentForm } from './NurseAssessmentForm';

type TransitionConfig = {
  label: string;
  transitionType: 'acknowledge' | 'start_travel' | 'mark_arrived' | 'check_in' | 'check_out';
  action: (formData: FormData) => Promise<void>;
};

function nextTransition(flowState: ClinicianVisitFlowState): TransitionConfig | null {
  if (flowState === 'scheduled') return { label: 'Acknowledge', transitionType: 'acknowledge', action: nurseAcknowledgeVisitAction };
  if (flowState === 'acknowledged') return { label: 'Start travel', transitionType: 'start_travel', action: nurseStartTravelAction };
  if (flowState === 'en_route') return { label: "I've arrived", transitionType: 'mark_arrived', action: nurseMarkArrivedAction };
  if (flowState === 'arrived') return { label: 'Check in', transitionType: 'check_in', action: nurseCheckInVisitAction };
  return null;
}

function flowLabel(state: ClinicianVisitFlowState): string {
  if (state === 'scheduled') return 'Scheduled';
  if (state === 'acknowledged') return 'Acknowledged';
  if (state === 'en_route') return 'En route';
  if (state === 'arrived') return 'Arrived';
  if (state === 'checked_in') return 'Checked in';
  if (state === 'checked_out') return 'Checked out';
  return 'Closed';
}

export function NurseSessionView({ data }: { data: NurseSessionData }) {
  const transition = nextTransition(data.flowState);
  const chartHref = `/admin/patients/${data.patient.medplumPatientId}`;

  return (
    <section className="clinician-surface">
      <Link href="/clinician/nursing/today" className="btn btn-sm btn-link px-0 mb-2">← Back to My Journey</Link>

      {/* Always-visible safety header */}
      <div className="clinician-visit-card mb-3">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div>
            <h2 className="h6 mb-0">{data.patient.fullName}</h2>
            {data.patient.arabicName ? <p className="text-muted small mb-0">{data.patient.arabicName}</p> : null}
            <p className="text-muted small mb-0">
              {data.patient.age !== null ? `${data.patient.age}y · ` : ''}{data.code} · {data.scheduledTimeLabel}
            </p>
          </div>
          <span className="clinician-chip">{flowLabel(data.flowState)}</span>
        </div>
        <div className="d-flex flex-wrap gap-2 mt-2">
          {data.patient.dnrStatus === 'dnr' ? <span className="badge text-bg-warning">DNR</span> : null}
          {data.patient.addressDetail ? <span className="badge text-bg-light border">{data.patient.addressDetail}</span> : null}
        </div>
        <p className="small mt-2 mb-0">
          <Link href={chartHref}>Review allergies, medications &amp; alerts in the full chart →</Link>
        </p>
      </div>

      {/* Visit-flow transition (pre-check-in) */}
      {transition ? (
        <div className="clinician-visit-card mb-3">
          <h3 className="h6">Visit flow</h3>
          <p className="text-muted small">Complete the next step to progress this visit.</p>
          <VisitTransitionForm
            action={transition.action}
            label={transition.label}
            transitionType={transition.transitionType}
            visitId={data.visitId}
          />
        </div>
      ) : null}

      {/* Documentation (on-site) */}
      {data.canDocument ? (
        <>
          <div className="clinician-visit-card mb-3">
            <h3 className="h6">Vitals</h3>
            <NurseVitalsForm visitId={data.visitId} />
          </div>

          <div className="clinician-visit-card mb-3">
            <h3 className="h6">Assessment</h3>
            <NurseAssessmentForm visitId={data.visitId} />
          </div>

          {data.flowState === 'checked_in' ? (
            <div className="clinician-visit-card mb-3">
              <h3 className="h6">Finish visit</h3>
              <p className="text-muted small">Check out once documentation is complete. At least one signed entry is required.</p>
              <VisitTransitionForm
                action={nurseCheckOutVisitAction}
                label="Check out"
                transitionType="check_out"
                visitId={data.visitId}
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="alert alert-light border">
          Documentation opens once you have checked in on-site.
        </div>
      )}
    </section>
  );
}
