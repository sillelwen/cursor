"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/editor/Controls';

type Asset = { id: string; name: string; url: string; category?: string | null };

export function AssetBrowser({ onPick }: { onPick: (asset: Asset) => void }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manage, setManage] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/assets', { headers: { 'x-user-id': localStorage.getItem('userId') || 'demo-user' } });
        if (res.ok) {
          const data = await res.json();
          setAssets(data.assets || []);
        } else {
          setError(`Failed to load assets: ${res.status}`);
        }
      } catch (err) {
        setError(`Error loading assets: ${err}`);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  if (loading) return <div className="text-sm text-gray-400">Loading assets...</div>;
  if (error) return <div className="text-sm text-red-400">{error}</div>;
  if (!assets.length) return <div className="text-sm text-gray-400">No assets yet. Upload some images above!</div>;

  const updateAsset = async (id: string, data: Partial<Pick<Asset, 'name' | 'category'>>) => {
    const res = await fetch(`/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': localStorage.getItem('userId') || 'demo-user' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { asset } = await res.json();
      setAssets((prev) => prev.map((x) => (x.id === id ? asset : x)));
    }
  };

  const deleteAsset = async (id: string) => {
    const res = await fetch(`/api/assets/${id}`, { method: 'DELETE', headers: { 'x-user-id': localStorage.getItem('userId') || 'demo-user' } });
    if (res.ok) setAssets((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">Click to add to sheet</div>
        <Button variant="secondary" onClick={() => setManage((m) => !m)}>{manage ? 'Done' : 'Manage'}</Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {assets.map((a) => (
          <div key={a.id} className="overflow-hidden rounded bg-gray-800">
            <button className="group block w-full" onClick={() => onPick(a)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} className="h-20 w-full object-cover transition group-hover:opacity-80" />
            </button>
            <div className="px-1 py-1">
              {!manage ? (
                <div className="truncate text-xs text-gray-300">{a.name}{a.category ? ` · ${a.category}` : ''}</div>
              ) : (
                <div className="space-y-1">
                  <input
                    className="w-full rounded bg-gray-900 px-1 py-0.5 text-xs"
                    value={a.name}
                    onChange={(e) => updateAsset(a.id, { name: e.target.value })}
                  />
                  <div className="flex items-center gap-1">
                    <input
                      className="flex-1 rounded bg-gray-900 px-1 py-0.5 text-xs"
                      placeholder="Category"
                      value={a.category ?? ''}
                      onChange={(e) => updateAsset(a.id, { category: e.target.value || null })}
                    />
                    <Button variant="secondary" onClick={() => deleteAsset(a.id)}>Delete</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}