'use client';

import { useState } from 'react';

type DocumentFileInputProps = {
  id: string;
  name: string;
  className?: string;
  maxBytes: number;
};

function toMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(0);
}

export function DocumentFileInput({ id, name, className, maxBytes }: DocumentFileInputProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <input
        id={id}
        name={name}
        type="file"
        className={className}
        required
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) {
            setError(null);
            return;
          }

          if (file.size > maxBytes) {
            event.currentTarget.value = '';
            setError(`Selected file is too large. Maximum allowed size is ${toMb(maxBytes)} MB.`);
            return;
          }

          setError(null);
        }}
      />
      <div className="form-text">Max upload size: {toMb(maxBytes)} MB.</div>
      {error ? <div className="text-danger small mt-1">{error}</div> : null}
    </>
  );
}
