'use client';

import { useState } from 'react';

type CaptureState =
  | { status: 'idle'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

const DEFAULT_STATE: CaptureState = {
  status: 'idle',
  message: 'Location not captured yet.',
};

export function NursingHandoffLocationCapture() {
  const [state, setState] = useState<CaptureState>(DEFAULT_STATE);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [accuracy, setAccuracy] = useState<string>('');

  const handleCapture = () => {
    if (!navigator.geolocation) {
      setState({
        status: 'error',
        message: 'Geolocation is not available in this browser/device.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = position.coords.latitude.toFixed(7);
        const nextLongitude = position.coords.longitude.toFixed(7);
        const nextAccuracy = Math.round(position.coords.accuracy).toString();

        setLatitude(nextLatitude);
        setLongitude(nextLongitude);
        setAccuracy(nextAccuracy);
        setState({
          status: 'success',
          message: `Location captured (accuracy ~${nextAccuracy}m).`,
        });
      },
      (error) => {
        setState({
          status: 'error',
          message: `Could not capture location: ${error.message}`,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  };

  return (
    <div className="border rounded p-2 bg-light">
      <input type="hidden" name="handoffLatitude" value={latitude} />
      <input type="hidden" name="handoffLongitude" value={longitude} />
      <input type="hidden" name="handoffAccuracyMeters" value={accuracy} />

      <div className="d-flex flex-wrap align-items-center gap-2">
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleCapture}>
          Capture current location
        </button>
        <span
          className={`small ${
            state.status === 'error'
              ? 'text-danger'
              : state.status === 'success'
                ? 'text-success'
                : 'text-muted'
          }`}
        >
          {state.message}
        </span>
      </div>

      {latitude && longitude && (
        <div className="small text-muted mt-1">
          GPS: {latitude}, {longitude}
        </div>
      )}
    </div>
  );
}
