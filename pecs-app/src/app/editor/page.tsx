"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

export const dynamic = 'force-dynamic';
import { Canvas, CardData, SheetSettings } from '@/components/editor/Canvas';
import { NumberField, SelectField, TextField, ToggleField, ActionRow, Button, FontPicker, COMMON_FONTS } from '@/components/editor/Controls';
import { AssetBrowser } from '@/components/editor/AssetBrowser';
import { v4 as uuidv4 } from 'uuid';
import { getTranslation } from '@/lib/i18n';
import { useLocale } from '@/contexts/LocaleContext';
import { useSession } from 'next-auth/react';
// import html2pdf from 'html2pdf.js'; // Will be imported dynamically
import { Accordeon } from '@/components/ui/Accordeon';

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
  const [addingProgress, setAddingProgress] = useState<number | null>(null);
  const [sheets, setSheets] = useState<any[]>([]);
  const [currentSheetId, setCurrentSheetId] = useState<string | undefined>(undefined);
  const [isDirty, setIsDirty] = useState(false);
  const lastSnapshotRef = useRef<string>("");
  const [cachedDefaults, setCachedDefaults] = useState<Partial<SheetSettings> | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { locale } = useLocale();
  const { data: session, status } = useSession();

  const totalCells = useMemo(() => settings.columns * settings.rows, [settings]);

  const t = (key: keyof typeof import('@/lib/i18n').translations.en) => getTranslation(locale || 'en', key);

  // Load sheets and defaults when session is ready
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      refreshSheets();
    }
  }, [status, session?.user?.id]);

  const sanitizeLabel = (name: string) => name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();

  function markSavedSnapshot() {
    const snapshot = JSON.stringify({ settings, cards });
    lastSnapshotRef.current = snapshot;
    setIsDirty(false);
  }

  const addCardFromFile = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const tempId = uuidv4();
    setCards((prev) => [...prev, { id: tempId, label: sanitizeLabel(file.name), objectUrl, uploadingAsset: true }]);
    try {
      const userId = session?.user?.id;
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
    for (let i = 0; i < list.length; i++) {
      setAddingProgress(i / list.length * 100);
      await addCardFromFile(list[i]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setAddingFiles(false);
    setAddingProgress(null);
  };

  const uploadToLibrary = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name);
    setUploading(true);
    try {
      const userId = session?.user?.id;
      if (!userId) {
        alert(t('pleaseSignIn'));
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
        alert(t('uploadFailed') + ': ' + error);
        console.error('Upload failed:', error);
      }
    } catch (error) {
      alert(t('uploadError') + ': ' + error);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const addCardFromUrl = (url: string, label: string) => {
    const tempId = uuidv4();
    setCards((prev) => [...prev, { id: tempId, label, imageUrl: url, uploadingAsset: true }]);
    (async () => {
      try {
        const userId = session?.user?.id;
        if (!userId) return;
        const res = await fetch('/api/upload/from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({ url, name: label })
        });
        if (res.ok) {
          const data = await res.json();
          setCards((prev) => prev.map((c) => c.id === tempId ? { ...c, imageUrl: data.url, assetId: data.assetId, uploadingAsset: false } : c));
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
    const element = document.getElementById('print-area');
    if (!element) return;

    // Dynamically import html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;
    
    var opt = {
      margin: 0,
      filename: `${(settings as any).title || t('untitled')}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'A4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const setPageFormat = (format: 'A4' | 'Letter') => {
    const size = format === 'A4' ? A4 : Letter;
    setSettings((s) => ({ ...s, pageWidthMm: size.w, pageHeightMm: size.h }));
  };

  // Expose minimal save/load hooks on window for the buttons below
  (window as any).PECSEditorState = {
    saveSnapshot: markSavedSnapshot,
    getSettings: () => settings,
    getCards: () => cards,
    loadFromSheet: (sheet: any) => {
      setSettings((s) => ({ ...s, ...JSON.parse(sheet.settings) }));
      setCards(Array.isArray(sheet.cards) ? sheet.cards : JSON.parse(sheet.cards));
      setCurrentSheetId(sheet.id);
      setTimeout(markSavedSnapshot, 0);
    }
  };

  async function saveDefaults() {
    const userId = session?.user?.id;
    if (!userId) return alert(t('pleaseSignIn'));
    const res = await fetch('/api/sheets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ defaultSheetSettings: JSON.stringify(settings) })
    });
    if (res.ok) {
      alert(t('defaultsSaved'));
    } else {
      alert(t('failedToSaveDefaults'));
    }
  }

  async function applyDefaults() {
    const userId = session?.user?.id;
    if (!userId) return alert(t('pleaseSignIn'));
    const res = await fetch('/api/sheets', { headers: { 'x-user-id': userId } });
    if (!res.ok) return alert(t('failedToLoadDefaults'));
    const data = await res.json();
    if (data.defaultSettings) {
      setSettings((s) => ({ ...s, ...data.defaultSettings }));
      alert(t('defaultsApplied'));
    } else {
      alert(t('noDefaultsSaved'));
    }
  }

  async function refreshSheets() {
    const userId = session?.user?.id;
    if (userId) {
      try {
        const res = await fetch('/api/sheets', { headers: { 'x-user-id': userId } });
    if (res.ok) {
      const data = await res.json();
          console.log('Loaded sheets:', data);
          setSheets(Array.isArray(data.sheets) ? data.sheets : []);
          if (data.defaultSettings) {
            setCachedDefaults(data.defaultSettings);
            setSettings((s) => ({ ...s, ...data.defaultSettings }));
          }
        } else {
          console.error('Failed to load sheets:', res.status, res.statusText);
        }
      } catch (error) {
        console.error('Error loading sheets:', error);
      }
    } else {
      console.log('No userId found in session');
    }
  }

  async function newSheet() {
    if (isDirty) {
      if (!confirm(t('saveChangesPrompt'))) return;
      await saveSheet(t, (settings as any).title || t('untitled'));
      await refreshSheets();
    }
    const base = cachedDefaults ? { ...defaultSettings(), ...cachedDefaults } : defaultSettings();
    setSettings(base);
        setCards([]);
    setCurrentSheetId(undefined);
    (window as any).__CURRENT_SHEET_ID__ = undefined;
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr] editor-grid">
      <aside className="space-y-4 rounded-lg bg-gray-900 p-4 order-2 lg:order-1">
        <div className="space-y-3">
          <TextField label={t('sheetName')} value={(settings as any).title || t('untitled')} onChange={(v) => setSettings({
            ...settings, /* runtime-only */
            // @ts-expect-error dynamic field for UI only
            title: v || t('untitled')
          })} />
          <ActionRow>
            <Button className="text-sm py-1" variant="secondary" onClick={async () => { await saveSheet(t, (settings as any).title || t('untitled')); await refreshSheets(); }}>{t('saveSheet')}</Button>
            <Button className="text-sm py-1" variant="secondary" onClick={async () => { (window as any).__CURRENT_SHEET_ID__ = undefined; await saveSheet(t, (settings as any).title || t('untitled')); await refreshSheets(); }}>{t('saveAsNew')}</Button>
          </ActionRow>
          <ActionRow>
            <Button className="text-sm py-1" onClick={newSheet}>{t('newSheet')}</Button>
          </ActionRow>
          </div>
        <Accordeon heading={t('settings')}>
          <div className="space-y-5">
            <div className="space-y-3">
          <SelectField
                label={t('paperFormat')}
            value={`${settings.pageWidthMm}x${settings.pageHeightMm}`}
            onChange={(v) => setPageFormat(v === `${A4.w}x${A4.h}` ? 'A4' : 'Letter')}
            options={[
              { value: `${A4.w}x${A4.h}`, label: 'A4 (210×297 mm)' },
              { value: `${Letter.w}x${Letter.h}`, label: 'Letter (8.5×11 in)' },
            ]}
          />
            </div>
            <div className="space-y-3">
              <h3 className="font-medium text-gray-200">{t('sheet')}</h3>
              <div className="grid grid-cols-2 gap-x-10 gap-y-3">
                <NumberField label={t('columns')} value={settings.columns} min={1} max={Math.floor((settings.pageWidthMm - settings.marginRightMm - settings.marginLeftMm + settings.gapMm) / (settings.cardWidthMm + settings.gapMm))} onChange={(v) => setSettings({ ...settings, columns: v })} />
                <NumberField label={t('rows')} value={settings.rows} min={1} max={Math.floor((settings.pageHeightMm - settings.marginBottomMm - settings.marginTopMm + settings.gapMm) / (settings.cardHeightMm + settings.gapMm))} onChange={(v) => setSettings({ ...settings, rows: v })} />
                <NumberField label={t('gap')} value={settings.gapMm} min={0} onChange={(v) => setSettings({ ...settings, gapMm: v })} suffix={t('mm')} />
              </div>
              <h4 className="font-medium text-gray-150">{t('margin')}</h4>
              <div className="grid grid-cols-2 gap-x-10 gap-y-3">
                <NumberField label={t('top')} value={settings.marginTopMm} min={0} onChange={(v) => setSettings({ ...settings, marginTopMm: v })} suffix={t('mm')} />
                <NumberField label={t('right')} value={settings.marginRightMm} min={0} onChange={(v) => setSettings({ ...settings, marginRightMm: v })} suffix={t('mm')} />
                <NumberField label={t('bottom')} value={settings.marginBottomMm} min={0} onChange={(v) => setSettings({ ...settings, marginBottomMm: v })} suffix={t('mm')} />
                <NumberField label={t('left')} value={settings.marginLeftMm} min={0} onChange={(v) => setSettings({ ...settings, marginLeftMm: v })} suffix={t('mm')} />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-200">{t('card')}</h3>
              <div className="grid grid-cols-2 gap-x-10 gap-y-3">
                <NumberField label={t('width')} value={settings.cardWidthMm} min={1} max={settings.pageWidthMm - settings.marginLeftMm - settings.marginRightMm} onChange={(v) => setSettings({ ...settings, cardWidthMm: v })} suffix={t('mm')} />
                <NumberField label={t('height')} value={settings.cardHeightMm} min={1} max={settings.pageHeightMm - settings.marginTopMm - settings.marginBottomMm} onChange={(v) => setSettings({ ...settings, cardHeightMm: v })} suffix={t('mm')} />
          </div>
          <SelectField
                label={t('textPosition')}
            value={settings.textPosition}
            onChange={(v) => setSettings({ ...settings, textPosition: v as SheetSettings['textPosition'] })}
            options={[
                  { value: 'above', label: t('aboveImage') },
                  { value: 'below', label: t('belowImage') },
                ]}
              />
              <FontPicker label={t('fontFamily')} value={settings.fontFamily} onChange={(v) => setSettings({ ...settings, fontFamily: v })} placeholder={t('searchFonts')} />
              <div className="grid grid-cols-2 gap-x-10 gap-y-3">
                <NumberField label={t('fontSize')} value={settings.fontSizePt} min={6} onChange={(v) => setSettings({ ...settings, fontSizePt: v })} suffix="pt" />
                <ToggleField label={t('bold')} checked={settings.bold} onChange={(v) => setSettings({ ...settings, bold: v })} />
              </div>
          </div>
        </div>

          <ActionRow>
            <Button variant="secondary" onClick={saveDefaults}>{t('saveDefaults')}</Button>
            <Button variant="secondary" onClick={applyDefaults}>{t('applyDefaults')}</Button>
          </ActionRow>
        </Accordeon>
        <Accordeon heading={t('addCards')}>
        <div className="space-y-3">
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={onFileChange} disabled={addingFiles}
              className="w-full rounded bg-gray-800 px-2 py-2 text-gray-100 disabled:opacity-50 text-sm" />
            {addingFiles && (
              <div className="text-sm text-gray-400">
                {t('uploading')} {addingProgress !== null ? Math.round(addingProgress) + '%' : ''}
              </div>
            )}
            <UrlAddForm onAdd={addCardFromUrl} t={t} />
        </div>

          <h2 className="mt-6 text-lg font-semibold">{t('yourAssets')}</h2>
          <AssetBrowser onPick={(a) => addCardFromUrl(a.url, sanitizeLabel(a.name))} refreshToken={assetsRefresh} t={t} />
          <div className="mt-2">
            <UploadToLibrary onUpload={uploadToLibrary} uploading={uploading} t={t} />
          </div>
        </Accordeon>
        <h2 className="mt-6 text-lg font-semibold">{t('export')}</h2>
        <ActionRow>
          <Button onClick={exportPdf}>{t('downloadPdf')}</Button>
          <Button variant="secondary" onClick={() => window.print()}>{t('print')}</Button>
        </ActionRow>

        <h2 className="mt-6 text-lg font-semibold">{t('yourSheets')}</h2>
          <div className="space-y-2">
          {sheets.length === 0 && (
            <div className="text-sm text-gray-400">{t('noSavedSheets')}</div>
          )}
            {sheets.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded bg-gray-800 px-2 py-2 text-sm">
              <div className="truncate pr-2">
                <div className="font-medium">{s.title || t('untitled')}</div>
                <div className="text-xs text-gray-400">{s.cards?.length || 0} {t('cards')}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="secondary" onClick={() => {
                  (window as any).__CURRENT_SHEET_ID__ = s.id;
                  loadSheet(s.id);
                }}>{t('load')}</Button>
                <Button variant="secondary" onClick={async () => {
                  if (confirm(t('deleteSheetConfirm'))) {
                    const userId = session?.user?.id;
                    if (userId) {
                      await fetch(`/api/sheets/${s.id}`, { method: 'DELETE', headers: { 'x-user-id': userId } });
                      await refreshSheets();
                    }
                  }
                }}>{t('delete')}</Button>
                </div>
              </div>
            ))}
          </div>
      </aside>

      <section className="space-y-4 order-1 lg:order-2">
        <div className="flex items-center justify-between gap-x-2">
          <h2 className="text-lg font-semibold">{t('sheetPreview')}</h2>
          <div className="flex gap-x-1">
            <Button onClick={exportPdf} className="text-sm w-1/2 py-1 whitespace-pre">{t('downloadPdf')}</Button>
            <Button variant="secondary" onClick={() => window.print()} className="text-sm w-1/2 py-1">{t('print')}</Button>
          </div>
          <div className="text-sm text-gray-400">{cards.length} {t('cards')} • {totalCells} {t('cells')}</div>
        </div>
        <div className="overflow-auto rounded bg-gray-200 p-4">
          <Canvas cards={cards} settings={settings} t={t} />
        </div>

        <h3 className="mt-4 text-base font-semibold">{t('cardsHeader')}</h3>
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
                      className="rounded bg-gray-800 px-2 py-1 text-xs"
                      value={c.fontFamily ?? settings.fontFamily}
                      onChange={(e) => updateCardFont(c.id, { fontFamily: e.target.value })}
                    >
                      {COMMON_FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                <input
                  type="number"
                  className="w-20 rounded bg-gray-800 px-2 py-1 text-xs"
                      placeholder={t('size')}
                      value={c.fontSizePt ?? settings.fontSizePt}
                      onChange={(e) => updateCardFont(c.id, { fontSizePt: Number(e.target.value || settings.fontSizePt) })}
                />
                <label className="flex items-center gap-1 text-xs text-gray-300">
                  <input
                    type="checkbox"
                        checked={c.bold ?? settings.bold}
                    onChange={(e) => updateCardFont(c.id, { bold: e.target.checked })}
                  />
                      {t('bold')}
                </label>
                  </div>
              </div>
              </div>
              <Button variant="secondary" onClick={() => removeCard(c.id)}>{t('remove')}</Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
async function saveSheet(t: (key: keyof typeof import('@/lib/i18n').translations.en) => string, title?: string) {
  const state = (window as any).PECSEditorState;
  const userId = state?.session?.user?.id;
  if (!userId) return alert(t('pleaseSignIn'));
  const sheet = {
    title,
    settings: state?.getSettings?.() || {},
    cards: state?.getCards?.() || [],
  };
  const currentId = (window as any).__CURRENT_SHEET_ID__;
  const url = currentId ? `/api/sheets/${currentId}` : '/api/sheets';
  const method = currentId ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(sheet)
  });
  if (res.ok) {
    const data = await res.json();
    (window as any).__CURRENT_SHEET_ID__ = data.id;
    state?.saveSnapshot?.();
  } else {
    alert('Failed to save sheet');
  }
}

async function loadMostRecent() {
  const state = (window as any).PECSEditorState;
  const userId = state?.session?.user?.id;
  if (!userId) return;
  const res = await fetch('/api/sheets', { headers: { 'x-user-id': userId } });
  if (!res.ok) return;
  const data = await res.json();
  const sheets = Array.isArray(data.sheets) ? data.sheets : [];
  if (sheets.length === 0) return;
  const sheet = sheets[0];
  state?.loadFromSheet?.(sheet);
}

async function loadSheet(id: string) {
  const state = (window as any).PECSEditorState;
  const userId = state?.session?.user?.id;
  if (!userId) return;
  const res = await fetch('/api/sheets', { headers: { 'x-user-id': userId } });
  if (!res.ok) return;
  const data = await res.json();
  const sheets = Array.isArray(data.sheets) ? data.sheets : [];
  console.log('sheets', sheets);
  if (sheets.length === 0) return;
  const sheet = sheets.find((s: { id: string }) => s.id == id);
  if (!sheet) return;
  state?.loadFromSheet?.(sheet);
}

function UrlAddForm({ onAdd, t }: { onAdd: (url: string, label: string) => void; t: (key: keyof typeof import('@/lib/i18n').translations.en) => string }) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  return (
    <div className="flex gap-2 flex-wrap">
      <input className="flex-1 rounded bg-gray-800 px-2 py-1 text-gray-100 text-sm" placeholder={t('imageUrl')} value={url} onChange={(e) => setUrl(e.target.value)} />
      <input className="w-40 rounded bg-gray-800 px-2 py-1 text-gray-100 text-sm" placeholder={t('label')} value={label} onChange={(e) => setLabel(e.target.value)} />
      <Button onClick={() => url && onAdd(url, label || t('card'))} className="py-1 text-sm">{t('add')}</Button>
    </div>
  );
}

function UploadToLibrary({ onUpload, uploading, t }: { onUpload: (file: File) => Promise<void>; uploading: boolean; t: (key: keyof typeof import('@/lib/i18n').translations.en) => string }) {
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
      <span>{busy || uploading ? t('uploading') : t('upload')}</span>
    </label>
  );
}