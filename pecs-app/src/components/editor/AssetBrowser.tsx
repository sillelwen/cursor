"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/editor/Controls';

type Asset = { id: string; name: string; url: string };

export function AssetBrowser({ onPick, refreshToken, t }: { onPick: (asset: Asset) => void; refreshToken?: number; t: (key: keyof typeof import('@/lib/i18n').translations.en) => string }) {
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
          setError(t('pleaseSignIn'));
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
          setError(`${t('failedToLoadAssets')} ${res.status}`);
        }
      } catch (err) {
        setError(`${t('errorLoadingAssets')}: ${err}`);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, [session?.user?.id, status, refreshToken]);

  if (status === 'loading' || loading) return <div className="text-sm text-gray-400">{t('loadingAssets')}</div>;
  if (status === 'unauthenticated') return <div className="text-sm text-red-400">{t('pleaseSignIn')}</div>;
  if (error) return <div className="text-sm text-red-400">{error}</div>;
  if (!assets.length) return <div className="text-sm text-gray-400">{t('noAssets')}</div>;

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