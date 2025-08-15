"use client";

import { ChangeEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';

export function NumberField({ label, value, onChange, min = 0, step = 1, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: number; suffix?: string;
}) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value));
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-gray-300">{label}</span>
      <div className="flex items-center gap-1">
        <input type="number" min={min} step={step} value={value} onChange={handle} className="w-14 rounded bg-gray-800 px-2 py-1 text-gray-100" />
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

// Simple searchable font selector
export const COMMON_FONTS = [
  'Inter, Arial, sans-serif',
  'Arial, Helvetica, sans-serif',
  'Helvetica, Arial, sans-serif',
  'Times New Roman, Times, serif',
  'Georgia, serif',
  'Courier New, Courier, monospace',
  'Verdana, Geneva, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Trebuchet MS, Helvetica, sans-serif',
  'Comic Sans MS, cursive, sans-serif',
];

export function FontPicker({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void, placeholder: string }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return COMMON_FONTS.filter((f) => f.toLowerCase().includes(q));
  }, [query]);
  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-gray-300">{label}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-48 rounded bg-gray-800 px-2 py-1 text-gray-100"
        />
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded bg-gray-800 px-2 py-1 text-gray-100">
        {filtered.map((opt) => (
          <option key={opt} value={opt} style={{ fontFamily: opt }}>{opt}</option>
        ))}
      </select>
    </div>
  );
}