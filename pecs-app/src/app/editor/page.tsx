"use client";

import { useMemo, useRef, useState } from 'react';
import { Canvas, CardData, SheetSettings } from '@/components/editor/Canvas';
import { NumberField, SelectField, TextField, ToggleField, ActionRow, Button } from '@/components/editor/Controls';
import { AssetBrowser } from '@/components/editor/AssetBrowser';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { v4 as uuidv4 } from 'uuid';

const A4 = { w: 210, h: 297 };
const Letter = { w: 215.9, h: 279.4 };

function defaultSettings(): SheetSettings {
  return {
    columns: 3,
    rows: 4,
    pageWidthMm: A4.w,
    pageHeightMm: A4.h,
    marginMm: 10,
    gapMm: 6,
    cardWidthMm: 60,
    cardHeightMm: 60,
    textPosition: 'below',
    fontFamily: 'Inter, Arial, sans-serif',
    fontSizePt: 12,
    bold: true,
  };
}

export default function EditorPage() {
  const [settings, setSettings] = useState<SheetSettings>(defaultSettings());
  const [cards, setCards] = useState<CardData[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCells = useMemo(() => settings.columns * settings.rows, [settings]);

  const addCardFromFile = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setCards((prev) => [...prev, { id: uuidv4(), label: file.name.replace(/\.[^.]+$/, ''), objectUrl }]);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await addCardFromFile(file);
    }
    e.currentTarget.value = '';
  };

  const uploadToLibrary = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name);
    setUploading(true);
    try {
      const response = await fetch('/api/upload', { 
        method: 'POST', 
        body: form, 
        headers: { 'x-user-id': localStorage.getItem('userId') || 'demo-user' } 
      });
      if (response.ok) {
        alert('File uploaded successfully! Check "Your assets" section below.');
        // Refresh asset browser by triggering a re-render
        window.location.reload();
      } else {
        const error = await response.text();
        alert('Upload failed: ' + error);
        console.error('Upload failed:', error);
      }
    } catch (error) {
      alert('Upload error: ' + error);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const addCardFromUrl = (url: string, label: string) => {
    setCards((prev) => [...prev, { id: uuidv4(), label, imageUrl: url }]);
  };

  const updateCardLabel = (id: string, label: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
  };

  const removeCard = (id: string) => setCards((prev) => prev.filter((c) => c.id !== id));

  const exportPdf = async () => {
    const element = document.getElementById('print-area');
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ unit: 'mm', format: [settings.pageWidthMm, settings.pageHeightMm] });
    pdf.addImage(imgData, 'PNG', 0, 0, settings.pageWidthMm, settings.pageHeightMm);
    pdf.save('pecs-sheet.pdf');
  };

  const setPageFormat = (format: 'A4' | 'Letter') => {
    const size = format === 'A4' ? A4 : Letter;
    setSettings((s) => ({ ...s, pageWidthMm: size.w, pageHeightMm: size.h }));
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr]">
      <aside className="space-y-4 rounded-lg bg-gray-900 p-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <div className="space-y-3">
          <SelectField
            label="Paper format"
            value={`${settings.pageWidthMm}x${settings.pageHeightMm}`}
            onChange={(v) => setPageFormat(v === `${A4.w}x${A4.h}` ? 'A4' : 'Letter')}
            options={[
              { value: `${A4.w}x${A4.h}`, label: 'A4 (210×297 mm)' },
              { value: `${Letter.w}x${Letter.h}`, label: 'Letter (8.5×11 in)' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Columns" value={settings.columns} min={1} onChange={(v) => setSettings({ ...settings, columns: v })} />
            <NumberField label="Rows" value={settings.rows} min={1} onChange={(v) => setSettings({ ...settings, rows: v })} />
            <NumberField label="Card width" value={settings.cardWidthMm} min={10} onChange={(v) => setSettings({ ...settings, cardWidthMm: v })} suffix="mm" />
            <NumberField label="Card height" value={settings.cardHeightMm} min={10} onChange={(v) => setSettings({ ...settings, cardHeightMm: v })} suffix="mm" />
            <NumberField label="Margin" value={settings.marginMm} min={0} onChange={(v) => setSettings({ ...settings, marginMm: v })} suffix="mm" />
            <NumberField label="Gap" value={settings.gapMm} min={0} onChange={(v) => setSettings({ ...settings, gapMm: v })} suffix="mm" />
          </div>
          <SelectField
            label="Text position"
            value={settings.textPosition}
            onChange={(v) => setSettings({ ...settings, textPosition: v as SheetSettings['textPosition'] })}
            options={[
              { value: 'above', label: 'Above image' },
              { value: 'below', label: 'Below image' },
            ]}
          />
          <TextField label="Font family" value={settings.fontFamily} onChange={(v) => setSettings({ ...settings, fontFamily: v })} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Font size" value={settings.fontSizePt} min={6} onChange={(v) => setSettings({ ...settings, fontSizePt: v })} suffix="pt" />
            <ToggleField label="Bold" checked={settings.bold} onChange={(v) => setSettings({ ...settings, bold: v })} />
          </div>
        </div>

        <h2 className="mt-6 text-lg font-semibold">Add cards</h2>
        <div className="space-y-3">
          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={onFileChange} className="w-full rounded bg-gray-800 px-2 py-2 text-gray-100" />
          <UrlAddForm onAdd={addCardFromUrl} />
          <UploadToLibrary onUpload={uploadToLibrary} uploading={uploading} />
        </div>

        <h2 className="mt-6 text-lg font-semibold">Your assets</h2>
        <AssetBrowser onPick={(a) => addCardFromUrl(a.url, a.name)} />

        <h2 className="mt-6 text-lg font-semibold">Export</h2>
        <ActionRow>
          <Button onClick={exportPdf}>Download PDF</Button>
          <Button variant="secondary" onClick={() => window.print()}>Print</Button>
        </ActionRow>
      </aside>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sheet preview</h2>
          <div className="text-sm text-gray-400">{cards.length} cards • {totalCells} cells</div>
        </div>
        <div className="overflow-auto rounded bg-gray-200 p-4">
          <Canvas cards={cards} settings={settings} />
        </div>

        <h3 className="mt-4 text-base font-semibold">Cards</h3>
        <div className="grid grid-cols-1 gap-2">
          {cards.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded bg-gray-900 p-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded bg-gray-800">
                  {c.imageUrl || c.objectUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.objectUrl || c.imageUrl!} alt="thumb" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <input
                  className="rounded bg-gray-800 px-2 py-1 text-sm"
                  value={c.label}
                  onChange={(e) => updateCardLabel(c.id, e.target.value)}
                />
              </div>
              <Button variant="secondary" onClick={() => removeCard(c.id)}>Remove</Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function UrlAddForm({ onAdd }: { onAdd: (url: string, label: string) => void }) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  return (
    <div className="flex gap-2">
      <input className="flex-1 rounded bg-gray-800 px-2 py-2 text-gray-100" placeholder="Image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
      <input className="w-40 rounded bg-gray-800 px-2 py-2 text-gray-100" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
      <Button onClick={() => url && onAdd(url, label || 'Card')}>Add</Button>
    </div>
  );
}

function UploadToLibrary({ onUpload, uploading }: { onUpload: (file: File) => Promise<void>; uploading: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-gray-800 px-3 py-2 text-sm">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try { await onUpload(file); } finally { setBusy(false); }
          if (e.currentTarget) e.currentTarget.value = '';
        }}
      />
      <span>{busy || uploading ? 'Uploading...' : 'Upload to library'}</span>
    </label>
  );
}