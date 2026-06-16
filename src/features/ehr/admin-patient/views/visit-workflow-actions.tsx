'use client';

import { useState, useTransition } from 'react';
import {
  acknowledgeVisitAction,
  startTravelAction,
  markArrivedAction,
  checkInVisitAction,
  checkOutVisitAction,
} from '../actions';

type VisitFlags = {
  acknowledged: boolean;
  enRoute: boolean;
  arrived: boolean;
  checkedIn: boolean;
  checkedOut: boolean;
  closed: boolean;
};

type StepKind = 'instant' | 'geo';

type WorkflowStep = {
  key: string;
  label: string;
  kind: StepKind;
  purpose?: 'checkin' | 'checkout';
  action: (formData: FormData) => Promise<void>;
  done: boolean;
  ready: boolean;
};

function geoErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission was denied. Allow it in your browser, or switch on the testing override to enter coordinates.';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Your location is unavailable right now. Try again, or use the testing override.';
  }
  if (error.code === error.TIMEOUT) {
    return 'Getting your location timed out. Try again, or use the testing override.';
  }
  return 'Could not read your current location.';
}

export function VisitWorkflowActions({
  medplumPatientId,
  visitId,
  flags,
}: {
  medplumPatientId: string;
  visitId: string;
  flags: VisitFlags;
}) {
  const [override, setOverride] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [pending, startTransition] = useTransition();

  const steps: WorkflowStep[] = [
    { key: 'ack', label: 'Acknowledge', kind: 'instant', action: acknowledgeVisitAction, done: flags.acknowledged, ready: !flags.acknowledged },
    { key: 'enroute', label: 'Start travel', kind: 'instant', action: startTravelAction, done: flags.enRoute, ready: flags.acknowledged && !flags.enRoute },
    { key: 'arrived', label: 'Mark arrived', kind: 'instant', action: markArrivedAction, done: flags.arrived, ready: flags.enRoute && !flags.arrived },
    { key: 'checkin', label: 'Check in', kind: 'geo', purpose: 'checkin', action: checkInVisitAction, done: flags.checkedIn, ready: (flags.arrived || flags.enRoute) && !flags.checkedIn },
    { key: 'checkout', label: 'Check out', kind: 'geo', purpose: 'checkout', action: checkOutVisitAction, done: flags.checkedOut, ready: flags.checkedIn && !flags.checkedOut },
  ];

  function baseFormData(): FormData {
    const fd = new FormData();
    fd.set('medplumPatientId', medplumPatientId);
    fd.set('visitId', visitId);
    if (override) {
      fd.set('force', 'on');
    }
    return fd;
  }

  function runInstant(step: WorkflowStep) {
    setGeoError(null);
    setBusyKey(step.key);
    startTransition(async () => {
      try {
        await step.action(baseFormData());
      } finally {
        setBusyKey(null);
      }
    });
  }

  function submitGeo(step: WorkflowStep, lat: string, lng: string, accuracy?: string) {
    startTransition(async () => {
      try {
        const fd = baseFormData();
        if (step.purpose === 'checkin') {
          fd.set('checkInLatitude', lat);
          fd.set('checkInLongitude', lng);
          if (accuracy) fd.set('checkInAccuracyMeters', accuracy);
        } else {
          fd.set('checkOutLatitude', lat);
          fd.set('checkOutLongitude', lng);
          if (accuracy) fd.set('checkOutAccuracyMeters', accuracy);
        }
        await step.action(fd);
      } finally {
        setBusyKey(null);
      }
    });
  }

  function runGeo(step: WorkflowStep) {
    setGeoError(null);
    setBusyKey(step.key);

    // Override + manual coordinates entered → skip the device and use them.
    if (override && manualLat.trim() && manualLng.trim()) {
      submitGeo(step, manualLat.trim(), manualLng.trim());
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setBusyKey(null);
      setGeoError('This device cannot share a location. Use the testing override to enter coordinates.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        submitGeo(
          step,
          String(position.coords.latitude),
          String(position.coords.longitude),
          String(Math.round(position.coords.accuracy)),
        );
      },
      (error) => {
        setBusyKey(null);
        setGeoError(geoErrorMessage(error));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  function handleRun(step: WorkflowStep) {
    if (step.kind === 'geo') {
      runGeo(step);
    } else {
      runInstant(step);
    }
  }

  const nextStep = steps.find((step) => step.ready) ?? null;
  const visibleSteps = override ? steps : nextStep ? [nextStep] : [];
  const isBusy = pending || busyKey != null;

  return (
    <div className="anees-vwa">
      <div className="anees-vwa-head">
        <span
          className="anees-vwa-title"
          title="Time is stamped automatically when you tap. Check-in / check-out read your device’s current GPS — no manual entry."
        >
          Update visit
        </span>
        <label className="anees-vwa-override">
          <input
            type="checkbox"
            checked={override}
            onChange={(event) => setOverride(event.target.checked)}
          />
          Testing override
        </label>
      </div>

      {!override && flags.closed && (
        <p className="anees-vwa-note">This visit is closed. Switch on the testing override to force a state change.</p>
      )}

      {!override && !flags.closed && !nextStep && (
        <p className="anees-vwa-note">All workflow steps are complete.</p>
      )}

      {visibleSteps.length > 0 && (
        <div className="anees-vwa-buttons">
          {visibleSteps.map((step) => {
            const running = busyKey === step.key;
            const tone = step.kind === 'geo' ? 'is-geo' : 'is-instant';
            return (
              <button
                key={step.key}
                type="button"
                className={`anees-vwa-btn ${tone} ${step.done ? 'is-done' : ''}`}
                onClick={() => handleRun(step)}
                disabled={isBusy}
              >
                {running ? 'Working…' : step.label}
                {step.kind === 'geo' && <span className="anees-vwa-btn-hint">uses live GPS</span>}
                {override && <span className="anees-vwa-btn-force">force</span>}
              </button>
            );
          })}
        </div>
      )}

      {geoError && <p className="anees-vwa-error" role="alert">{geoError}</p>}

      {override && (
        <div className="anees-vwa-manual">
          <p className="anees-vwa-manual-title">Manual coordinates (override only)</p>
          <div className="anees-vwa-manual-grid">
            <input
              className="form-control form-control-sm"
              placeholder="Latitude"
              inputMode="decimal"
              value={manualLat}
              onChange={(event) => setManualLat(event.target.value)}
            />
            <input
              className="form-control form-control-sm"
              placeholder="Longitude"
              inputMode="decimal"
              value={manualLng}
              onChange={(event) => setManualLng(event.target.value)}
            />
          </div>
          <p className="anees-vwa-manual-hint">
            Leave blank to still capture live GPS. Forced changes are recorded as overrides in the audit ledger.
          </p>
        </div>
      )}
    </div>
  );
}
