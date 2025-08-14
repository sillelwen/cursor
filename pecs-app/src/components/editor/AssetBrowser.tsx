"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/editor/Controls';

type Asset = { id: string; name: string; url: string };

export function AssetBrowser({ onPick, refreshToken }: { onPick: (asset: Asset) => void; refreshToken?: number }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      setError(null);
      try {
        if (status === 'unauthenticated') {
          setError('Please sign in first');
          return;
        }
        if (status !== 'authenticated' || !session?.user?.id) {
          return; // wait until session is ready
        }
        const res = await fetch('/api/assets', { headers: { 'x-user-id': session.user.id as string } });
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
  }, [session?.user?.id, status, refreshToken]);

  if (status === 'loading' || loading) return <div className="text-sm text-gray-400">Loading assets...</div>;
  if (status === 'unauthenticated') return <div className="text-sm text-red-400">Please sign in first</div>;
  if (error) return <div className="text-sm text-red-400">{error}</div>;
  if (!assets.length) return <div className="text-sm text-gray-400">No assets yet. Upload some images above!</div>;

  return (
    <div className="grid grid-cols-4 gap-2">
      {assets.map((a) => (
        <button key={a.id} className="group overflow-hidden rounded bg-gray-800" onClick={() => onPick(a)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.url} alt={a.name} className="h-20 w-full object-cover transition group-hover:opacity-80" />
          <div className="truncate px-1 py-0.5 text-xs text-gray-300">{a.name}</div>
        </button>
      ))}
    </div>
  );
}