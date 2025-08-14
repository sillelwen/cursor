"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, CardData, SheetSettings } from '@/components/editor/Canvas';
import { NumberField, SelectField, TextField, ToggleField, ActionRow, Button, FontPicker, COMMON_FONTS } from '@/components/editor/Controls';
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
    marginTopMm: 10,
    marginRightMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
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
  const [assetsRefresh, setAssetsRefresh] = useState(0);
  const [addingFiles, setAddingFiles] = useState(false);
  const [addingProgress, setAddingProgress] = useState<{ done: number; total: number } | null>(null);
  const [sheets, setSheets] = useState<any[]>([]);
  const [currentSheetId, setCurrentSheetId] = useState<string | undefined>(undefined);
  const [isDirty, setIsDirty] = useState(false);
  const lastSnapshotRef = useRef<string>("");
  const [cachedDefaults, setCachedDefaults] = useState<Partial<SheetSettings> | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCells = useMemo(() => settings.columns * settings.rows, [settings]);

  const sanitizeLabel = (name: string) => name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();

  // Track dirty state by comparing snapshot of settings+cards
  useEffect(() => {
    const snapshot = JSON.stringify({ settings, cards });
    setIsDirty(snapshot !== lastSnapshotRef.current);
  }, [settings, cards]);

  function markSavedSnapshot() {
    lastSnapshotRef.current = JSON.stringify({ settings, cards });
    setIsDirty(false);
  }

  const addCardFromFile = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const tempId = uuidv4();
    setCards((prev) => [...prev, { id: tempId, label: sanitizeLabel(file.name), objectUrl, uploadingAsset: true }]);
    // Also upload to assets so the image persists
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name);
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'x-user-id': userId }, body: form });
    if (res.ok) {
      const data = await res.json();
        const asset = data.asset;
        setCards((prev) => prev.map((c) => c.id === tempId ? { ...c, imageUrl: asset.url, assetId: asset.id, uploadingAsset: false } : c));
    } else {
        setCards((prev) => prev.map((c) => c.id === tempId ? { ...c, uploadingAsset: false } : c));
      }
    } catch {
      setCards((prev) => prev.map((c) => c.id === tempId ? { ...c, uploadingAsset: false } : c));
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const list = Array.from(files);
    setAddingFiles(true);
    setAddingProgress({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      await addCardFromFile(list[i]);
      setAddingProgress({ done: i + 1, total: list.length });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setAddingFiles(false);
    setAddingProgress(null);
  };

  const uploadToLibrary = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name);
    setUploading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert('Please sign in first');
        return;
      }
      const response = await fetch('/api/upload', { 
        method: 'POST', 
        body: form, 
        headers: { 'x-user-id': userId },
      });
      if (response.ok) {
        setAssetsRefresh((n) => n + 1);
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
    const tempId = uuidv4();
    setCards((prev) => [...prev, { id: tempId, label, imageUrl: url, fontFamily: settings.fontFamily, fontSizePt: settings.fontSizePt, bold: settings.bold, uploadingAsset: true }]);
    // Mirror remote URL to local uploads so it appears in PDF and persists
    (async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        const res = await fetch('/api/upload/from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({ url, name: label }),
        });
        if (res.ok) {
          const data = await res.json();
          const asset = data.asset;
          setCards((prev) => prev.map((c) => c.id === tempId ? { ...c, imageUrl: asset.url, assetId: asset.id, uploadingAsset: false } : c));
        } else {
          setCards((prev) => prev.map((c) => c.id === tempId ? { ...c, uploadingAsset: false } : c));
        }
      } catch {
        setCards((prev) => prev.map((c) => c.id === tempId ? { ...c, uploadingAsset: false } : c));
      }
    })();
  };

  const updateCardLabel = (id: string, label: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
  };

  const updateCardFont = (id: string, changes: Partial<Pick<CardData, 'fontFamily' | 'fontSizePt' | 'bold'>>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  };

  const removeCard = (id: string) => setCards((prev) => prev.filter((c) => c.id !== id));

  const exportPdf = async () => {
    const pdf = new jsPDF({ unit: 'mm', format: [settings.pageWidthMm, settings.pageHeightMm] });

    const mmPerPt = 0.352778;
    const marginLeft = settings.marginLeftMm;
    const marginTop = settings.marginTopMm;
    const gap = settings.gapMm;
    const cardW = settings.cardWidthMm;
    const cardH = settings.cardHeightMm;

    async function loadImageInfo(src: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
      try {
        const response = await fetch(src, { cache: 'no-store' });
        if (!response.ok) return null;
        const blob = await response.blob();
        const { dataUrl, width, height } = await new Promise<{ dataUrl: string; width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0, w, h);
            // Normalize to PNG to avoid format issues
            const png = canvas.toDataURL('image/png');
            resolve({ dataUrl: png, width: w, height: h });
          };
          // Use object URL for performance
          img.src = URL.createObjectURL(blob);
        });
        return { dataUrl, width, height };
      } catch {
        return null;
      }
    }

    const totalCells = settings.columns * settings.rows;
    const displayCards = cards.length >= totalCells ? cards.slice(0, totalCells) : [...cards, ...Array.from({ length: totalCells - cards.length }, (_, i) => ({ id: `empty-${i}`, label: '' })) as any];

    const imageInfos: Array<{ dataUrl: string; width: number; height: number } | null> = await Promise.all(
      displayCards.map((c) => (c && (c as any).imageUrl ? loadImageInfo((c as any).imageUrl as string) : Promise.resolve(null)))
    );

    for (let r = 0; r < settings.rows; r++) {
      for (let c = 0; c < settings.columns; c++) {
        const idx = r * settings.columns + c;
        const card = displayCards[idx] as any;
        const x = marginLeft + c * (cardW + gap);
        const y = marginTop + r * (cardH + gap);

        // Draw text
        const label = (card?.label as string) || '';
        const effectiveFontSizePt = (card?.fontSizePt as number) ?? settings.fontSizePt;
        const isBold = (card?.bold as boolean) ?? settings.bold;
        const textHeightMm = effectiveFontSizePt * mmPerPt * 1.2;
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        pdf.setFontSize(effectiveFontSizePt);
        if (label) {
          if (settings.textPosition === 'above') {
            pdf.text(label, x + cardW / 2, y + textHeightMm * 0.8, { align: 'center', baseline: 'middle' });
          }
        }

        // Draw image maintaining aspect ratio within the remaining area
        const imgInfo = imageInfos[idx];
        const imageAreaY = settings.textPosition === 'above' ? y + textHeightMm : y;
        const imageAreaH = settings.textPosition === 'above' ? (cardH - textHeightMm) : (settings.textPosition === 'below' && label ? (cardH - textHeightMm) : cardH);
        if (imgInfo) {
          const imgWpx = imgInfo.width;
          const imgHpx = imgInfo.height;
          const imgRatio = imgWpx / imgHpx;
          const boxRatio = cardW / imageAreaH;
          let drawW = cardW;
          let drawH = imageAreaH;
          if (imgRatio > boxRatio) {
            // image is wider relative to box
            drawW = cardW;
            drawH = drawW / imgRatio;
          } else {
            // image is taller relative to box
            drawH = imageAreaH;
            drawW = drawH * imgRatio;
          }
          const dx = x + (cardW - drawW) / 2;
          const dy = imageAreaY + (imageAreaH - drawH) / 2;
          pdf.addImage(imgInfo.dataUrl, 'PNG', dx, dy, drawW, drawH);
        }

        // Draw text below if needed
        if (label && settings.textPosition === 'below') {
          pdf.text(label, x + cardW / 2, y + cardH - textHeightMm * 0.2, { align: 'center', baseline: 'bottom' });
        }

        // Optional: outline card (keeps layout visible)
        pdf.setDrawColor(200);
        pdf.rect(x, y, cardW, cardH);
      }
    }

    pdf.save('pecs-sheet.pdf');
  };

  const setPageFormat = (format: 'A4' | 'Letter') => {
    const size = format === 'A4' ? A4 : Letter;
    setSettings((s) => ({ ...s, pageWidthMm: size.w, pageHeightMm: size.h }));
  };

  // Expose minimal save/load hooks on window for the buttons below
  (window as any).PECSEditorState = {
    getSavePayload: (titleOverride?: string) => ({
      title: titleOverride && titleOverride.trim() ? titleOverride.trim() : 'Untitled',
      settings,
      cards,
    }),
    loadFromSheet: (sheet: any) => {
      try {
        const parsed = typeof sheet.settings === 'string' ? JSON.parse(sheet.settings) : sheet.settings;
        setSettings((s) => ({ ...s, ...(parsed || {}) }));
        const restored = Array.isArray(sheet.cards) ? sheet.cards.map((c: any) => ({
          id: c.id,
          label: c.label,
          imageUrl: c.imageUrl || undefined,
          fontFamily: c.fontFamily || undefined,
          fontSizePt: typeof c.fontSizePt === 'number' ? c.fontSizePt : undefined,
          bold: typeof c.bold === 'boolean' ? c.bold : undefined,
        })) : [];
        setCards(restored);
        setCurrentSheetId(sheet.id as string);
        setTimeout(markSavedSnapshot, 0);
      } catch {}
    },
  };

  async function saveDefaults() {
    const userId = localStorage.getItem('userId');
    if (!userId) return alert('Please sign in first');
    const res = await fetch('/api/sheets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) return alert('Failed to save defaults');
    alert('Defaults saved');
  }

  async function applyDefaults() {
    const userId = localStorage.getItem('userId');
    if (!userId) return alert('Please sign in first');
    const res = await fetch('/api/sheets', { headers: { 'x-user-id': userId } });
    if (!res.ok) return alert('Failed to load defaults');
      const data = await res.json();
    if (data.defaultSettings) {
      setSettings((s) => ({ ...s, ...data.defaultSettings }));
      alert('Defaults applied');
    } else {
      alert('No defaults saved yet');
    }
  }

  async function refreshSheets() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    const res = await fetch('/api/sheets', { headers: { 'x-user-id': userId } });
    if (!res.ok) return;
    const data = await res.json();
    setSheets(Array.isArray(data.sheets) ? data.sheets : []);
    if (data.defaultSettings) setCachedDefaults(data.defaultSettings);
  }

  // Load sheets and defaults on mount; apply defaults to a fresh editor
  useEffect(() => {
    (async () => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        const res = await fetch('/api/sheets', { headers: { 'x-user-id': userId } });
    if (res.ok) {
      const data = await res.json();
          setSheets(Array.isArray(data.sheets) ? data.sheets : []);
          if (data.defaultSettings) {
            setCachedDefaults(data.defaultSettings);
            setSettings((s) => ({ ...s, ...data.defaultSettings }));
          }
        }
      }
      // ensure a title exists
      setSettings((s) => ({ ...s, ...(typeof (s as any).title === 'string' ? {} : {}), ...(s as any), }));
      // Ensure a runtime title field without TS directive
      setSettings((s) => ({ ...(s as any), title: (s as any).title || 'Untitled' } as any));
      markSavedSnapshot();
    })();
  }, []);

  async function newSheet() {
    if (isDirty) {
      const shouldSave = confirm('Save changes before creating a new sheet?');
      if (shouldSave) {
        await saveSheet((settings as any).title || 'Untitled');
        await refreshSheets();
      }
    }
    const base = cachedDefaults ? { ...defaultSettings(), ...cachedDefaults } : defaultSettings();
    setSettings((s) => ({ ...(base as any), title: 'Untitled' } as any));
    setCards([]);
    setCurrentSheetId(undefined);
    setTimeout(markSavedSnapshot, 0);
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(index: number, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDrop(index: number) {
    if (dragIndex === null) return;
    if (dragIndex === index) {
      handleDragEnd();
      return;
    }
    setCards((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    handleDragEnd();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr]">
      <aside className="space-y-4 rounded-lg bg-gray-900 p-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <div className="space-y-5">
        <div className="space-y-3">
            <TextField label="Sheet name" value={(settings as any).title || 'Untitled'} onChange={(v) => setSettings({ ...settings, /* runtime-only */
              // @ts-expect-error dynamic field for UI only
              title: v || 'Untitled' })} />
          <SelectField
            label="Paper format"
            value={`${settings.pageWidthMm}x${settings.pageHeightMm}`}
            onChange={(v) => setPageFormat(v === `${A4.w}x${A4.h}` ? 'A4' : 'Letter')}
            options={[
              { value: `${A4.w}x${A4.h}`, label: 'A4 (210×297 mm)' },
              { value: `${Letter.w}x${Letter.h}`, label: 'Letter (8.5×11 in)' },
            ]}
          />
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-200">Sheet</h3>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Columns" value={settings.columns} min={1} onChange={(v) => setSettings({ ...settings, columns: v })} />
            <NumberField label="Rows" value={settings.rows} min={1} onChange={(v) => setSettings({ ...settings, rows: v })} />
            <NumberField label="Gap" value={settings.gapMm} min={0} onChange={(v) => setSettings({ ...settings, gapMm: v })} suffix="mm" />
          </div>
            <h4 className="font-medium text-gray-150">Margin</h4>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Top" value={settings.marginTopMm} min={0} onChange={(v) => setSettings({ ...settings, marginTopMm: v })} suffix="mm" />
              <NumberField label="Right" value={settings.marginRightMm} min={0} onChange={(v) => setSettings({ ...settings, marginRightMm: v })} suffix="mm" />
              <NumberField label="Bottom" value={settings.marginBottomMm} min={0} onChange={(v) => setSettings({ ...settings, marginBottomMm: v })} suffix="mm" />
              <NumberField label="Left" value={settings.marginLeftMm} min={0} onChange={(v) => setSettings({ ...settings, marginLeftMm: v })} suffix="mm" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-200">Card</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Width" value={settings.cardWidthMm} min={10} onChange={(v) => setSettings({ ...settings, cardWidthMm: v })} suffix="mm" />
              <NumberField label="Height" value={settings.cardHeightMm} min={10} onChange={(v) => setSettings({ ...settings, cardHeightMm: v })} suffix="mm" />
          <SelectField
            label="Text position"
            value={settings.textPosition}
            onChange={(v) => setSettings({ ...settings, textPosition: v as SheetSettings['textPosition'] })}
            options={[
              { value: 'above', label: 'Above image' },
              { value: 'below', label: 'Below image' },
            ]}
          />
            </div>
            <FontPicker label="Font family" value={settings.fontFamily} onChange={(v) => setSettings({ ...settings, fontFamily: v })} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Font size" value={settings.fontSizePt} min={6} onChange={(v) => setSettings({ ...settings, fontSizePt: v })} suffix="pt" />
            <ToggleField label="Bold" checked={settings.bold} onChange={(v) => setSettings({ ...settings, bold: v })} />
            </div>
          </div>
        </div>

        <h2 className="mt-6 text-lg font-semibold">Add cards</h2>
        <div className="space-y-3">
          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={onFileChange} disabled={addingFiles}
                 className="w-full rounded bg-gray-800 px-2 py-2 text-gray-100 disabled:opacity-50" />
          {addingFiles && (
            <div className="text-xs text-gray-300 animate-pulse">
              Adding images{addingProgress ? ` (${addingProgress.done}/${addingProgress.total})` : '...'}
            </div>
          )}
          <UrlAddForm onAdd={addCardFromUrl} />
        </div>

        <h2 className="mt-6 text-lg font-semibold">Your assets</h2>
        <AssetBrowser onPick={(a) => addCardFromUrl(a.url, sanitizeLabel(a.name))} refreshToken={assetsRefresh} />
        <div className="mt-2">
          <UploadToLibrary onUpload={uploadToLibrary} uploading={uploading} />
        </div>

        <h2 className="mt-6 text-lg font-semibold">Export</h2>
        <ActionRow>
          <Button onClick={exportPdf}>Download PDF</Button>
          <Button variant="secondary" onClick={() => window.print()}>Print</Button>
        </ActionRow>

        <h2 className="mt-6 text-lg font-semibold">Save / Load</h2>
        <ActionRow>
          <Button variant="secondary" onClick={async () => { await saveSheet((settings as any).title || 'Untitled'); await refreshSheets(); }}>Save sheet</Button>
          <Button variant="secondary" onClick={async () => { (window as any).__CURRENT_SHEET_ID__ = undefined; await saveSheet((settings as any).title || 'Untitled'); await refreshSheets(); }}>Save as new</Button>
          <Button variant="secondary" onClick={loadMostRecent}>Load last</Button>
          <Button variant="secondary" onClick={saveDefaults}>Save defaults</Button>
          <Button variant="secondary" onClick={applyDefaults}>Apply defaults</Button>
          <Button onClick={newSheet}>New sheet</Button>
        </ActionRow>

        <h2 className="mt-6 text-lg font-semibold">Your sheets</h2>
          <div className="space-y-2">
          {sheets.length === 0 && (
            <div className="text-sm text-gray-400">No saved sheets yet.</div>
          )}
            {sheets.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded bg-gray-800 px-2 py-2 text-sm">
              <div className="truncate pr-2">
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-gray-400">{new Date(s.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => (window as any).PECSEditorState?.loadFromSheet?.(s)}>Load</Button>
                <Button variant="secondary" onClick={async () => {
                  const userId = localStorage.getItem('userId');
                  if (!userId) return alert('Please sign in first');
                  const res = await fetch(`/api/sheets/${s.id}`, { method: 'DELETE', headers: { 'x-user-id': userId } });
                  if (!res.ok) return alert('Delete failed');
                  await refreshSheets();
                }}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
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
          {cards.map((c, index) => (
            <div
              key={c.id}
              className={`flex items-center justify-between rounded bg-gray-900 p-2 ${dragOverIndex === index ? 'ring-2 ring-blue-500' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(index, e)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded bg-gray-800">
                  {c.imageUrl || c.objectUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.objectUrl || c.imageUrl!} alt="thumb" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                <input
                  className="rounded bg-gray-800 px-2 py-1 text-sm"
                  value={c.label}
                  onChange={(e) => updateCardLabel(c.id, e.target.value)}
                />
                  <div className="flex gap-2 items-center">
                    <select
                      className="w-44 rounded bg-gray-800 px-2 py-1 text-xs"
                      value={c.fontFamily ?? settings.fontFamily}
                      onChange={(e) => updateCardFont(c.id, { fontFamily: e.target.value })}
                    >
                      {COMMON_FONTS.map((f) => (
                        <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                      ))}
                    </select>
                <input
                  type="number"
                  className="w-20 rounded bg-gray-800 px-2 py-1 text-xs"
                  placeholder="Size"
                      value={c.fontSizePt ?? settings.fontSizePt}
                      onChange={(e) => updateCardFont(c.id, { fontSizePt: Number(e.target.value || settings.fontSizePt) })}
                />
                <label className="flex items-center gap-1 text-xs text-gray-300">
                  <input
                    type="checkbox"
                        checked={c.bold ?? settings.bold}
                    onChange={(e) => updateCardFont(c.id, { bold: e.target.checked })}
                  />
                  Bold
                </label>
                  </div>
                </div>
              </div>
                <Button variant="secondary" onClick={() => removeCard(c.id)}>Remove</Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
async function saveSheet(title?: string) {
  const userId = localStorage.getItem('userId');
  if (!userId) return alert('Please sign in first');
  // Minimal save: create new sheet each time
  const state: any = (window as any).PECSEditorState;
  const payload = state?.getSavePayload?.(title);
  if (!payload) return alert('Nothing to save');
  const currentId: string | undefined = (window as any).__CURRENT_SHEET_ID__;
  const endpoint = currentId ? `/api/sheets/${currentId}` : '/api/sheets';
  const method = currentId ? 'PUT' : 'POST';
  const res = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return alert('Save failed');
  const data = await res.json();
  // Update current sheet id (for subsequent updates)
  (window as any).__CURRENT_SHEET_ID__ = data.sheet?.id || (window as any).__CURRENT_SHEET_ID__;
  alert(currentId ? 'Saved changes' : 'Saved');
}

async function loadMostRecent() {
  const userId = localStorage.getItem('userId');
  if (!userId) return alert('Please sign in first');
  const res = await fetch('/api/sheets', { headers: { 'x-user-id': userId } });
  if (!res.ok) return alert('Load failed');
  const data = await res.json();
  const sheet = (data.sheets || [])[0];
  if (!sheet) return alert('No sheets yet');
  const state: any = (window as any).PECSEditorState;
  state?.loadFromSheet?.(sheet);
}

function UrlAddForm({ onAdd }: { onAdd: (url: string, label: string) => void }) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  return (
    <div className="flex gap-2 flex-wrap">
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
      <span>{busy || uploading ? 'Uploading...' : 'Upload'}</span>
    </label>
  );
}