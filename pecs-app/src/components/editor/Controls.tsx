"use client";

import { ChangeEvent } from 'react';
import { Button } from '@/components/ui/Button';

export function NumberField({ label, value, onChange, min = 0, step = 1, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: number; suffix?: string;
}) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value));
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-gray-300">{label}</span>
      <div className="flex items-center gap-1">
        <input type="number" min={min} step={step} value={value} onChange={handle} className="w-24 rounded bg-gray-800 px-2 py-1 text-gray-100" />
        {suffix && <span className="text-gray-400">{suffix}</span>}
      </div>
    </label>
  );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-gray-300">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-48 rounded bg-gray-800 px-2 py-1 text-gray-100" />
    </label>
  );
}

export function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-gray-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-48 rounded bg-gray-800 px-2 py-1 text-gray-100">
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

export function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-gray-300">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export { Button };