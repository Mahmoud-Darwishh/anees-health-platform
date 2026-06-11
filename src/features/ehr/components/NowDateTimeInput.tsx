'use client';

import { useState } from 'react';

function toLocalInputValue(date: Date): string {
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

type NowDateTimeInputProps = {
  name: string;
  id?: string;
  className?: string;
  required?: boolean;
};

/**
 * A datetime-local input that defaults to the client's current local time and
 * stays editable, so staff can record "now" by default or correct the time if
 * a dose was given/forgotten earlier.
 */
export function NowDateTimeInput({ name, id, className, required }: NowDateTimeInputProps) {
  const [value, setValue] = useState(() => toLocalInputValue(new Date()));

  return (
    <input
      type="datetime-local"
      name={name}
      id={id}
      className={className}
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
      required={required}
    />
  );
}
