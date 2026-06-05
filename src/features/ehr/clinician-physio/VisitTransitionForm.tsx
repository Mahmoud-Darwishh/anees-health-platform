'use client';

import { useRef, useState } from 'react';

type TransitionAction = (formData: FormData) => Promise<void>;

type Props = {
  action: TransitionAction;
  label: string;
  visitId: string;
  transitionType: 'acknowledge' | 'start_travel' | 'mark_arrived' | 'check_in' | 'check_out';
};

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function requiresCoordinates(type: Props['transitionType']): boolean {
  return type === 'check_in' || type === 'check_out';
}

function toCoordinatePayload(position: GeolocationPosition): Coordinates {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null,
  };
}

async function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toCoordinatePayload(position)),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000,
      },
    );
  });
}

export function VisitTransitionForm({ action, label, visitId, transitionType }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const preparedSubmitRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeFieldName =
    transitionType === 'acknowledge'
      ? 'acknowledgedAt'
      : transitionType === 'start_travel'
        ? 'enRouteAt'
        : transitionType === 'mark_arrived'
          ? 'arrivedAt'
          : transitionType === 'check_in'
            ? 'checkInAt'
            : 'checkOutAt';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (preparedSubmitRef.current) {
      preparedSubmitRef.current = false;
      return;
    }

    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = formRef.current;
    if (!form) {
      setError('Form is unavailable. Please refresh and try again.');
      setIsSubmitting(false);
      return;
    }

    const nowIso = new Date().toISOString();
    const timeInput = form.querySelector<HTMLInputElement>(`input[name="${timeFieldName}"]`);
    if (timeInput) {
      timeInput.value = nowIso;
    }

    if (requiresCoordinates(transitionType)) {
      try {
        const coordinates = await getCurrentCoordinates();
        const latitudeFieldName = transitionType === 'check_in' ? 'checkInLatitude' : 'checkOutLatitude';
        const longitudeFieldName = transitionType === 'check_in' ? 'checkInLongitude' : 'checkOutLongitude';
        const accuracyFieldName = transitionType === 'check_in' ? 'checkInAccuracyMeters' : 'checkOutAccuracyMeters';

        const latitudeInput = form.querySelector<HTMLInputElement>(`input[name="${latitudeFieldName}"]`);
        const longitudeInput = form.querySelector<HTMLInputElement>(`input[name="${longitudeFieldName}"]`);
        const accuracyInput = form.querySelector<HTMLInputElement>(`input[name="${accuracyFieldName}"]`);

        if (latitudeInput) latitudeInput.value = String(coordinates.latitude);
        if (longitudeInput) longitudeInput.value = String(coordinates.longitude);
        if (accuracyInput && coordinates.accuracy !== null) {
          accuracyInput.value = String(coordinates.accuracy);
        }
      } catch {
        setError('Location is required for check-in/out. Please enable GPS and try again.');
        setIsSubmitting(false);
        return;
      }
    }

    preparedSubmitRef.current = true;
    form.requestSubmit();
    setIsSubmitting(false);
  }

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="visitId" value={visitId} />

      <input type="hidden" name={timeFieldName} defaultValue="" />

      {transitionType === 'check_in' ? (
        <>
          <input type="hidden" name="checkInLatitude" defaultValue="" />
          <input type="hidden" name="checkInLongitude" defaultValue="" />
          <input type="hidden" name="checkInAccuracyMeters" defaultValue="" />
          <details className="mt-2">
            <summary className="small text-muted">Geofence override (only if requested by Med Ops)</summary>
            <div className="mt-2 d-grid gap-2">
              <select name="geofenceOverrideMethod" className="form-select form-select-sm" defaultValue="">
                <option value="">No override</option>
                <option value="med_ops">Med Ops unlock</option>
                <option value="code">Patient verification code</option>
                <option value="photo">Door photo proof</option>
              </select>
              <input
                name="geofenceOverrideReason"
                className="form-control form-control-sm"
                placeholder="Reason for override"
                dir="auto"
              />
              <input
                name="geofenceOverrideMediaId"
                className="form-control form-control-sm"
                placeholder="Proof media id (optional)"
                dir="auto"
              />
            </div>
          </details>
        </>
      ) : null}

      {transitionType === 'check_out' ? (
        <>
          <input type="hidden" name="checkOutLatitude" defaultValue="" />
          <input type="hidden" name="checkOutLongitude" defaultValue="" />
          <input type="hidden" name="checkOutAccuracyMeters" defaultValue="" />
        </>
      ) : null}

      <button type="submit" className="btn btn-sm btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Working...' : label}
      </button>
      {error ? <p className="clinician-form-error mt-2 mb-0">{error}</p> : null}
    </form>
  );
}
