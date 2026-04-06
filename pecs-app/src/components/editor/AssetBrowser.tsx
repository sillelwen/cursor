"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button, TextField } from '@/components/editor/Controls';
import { PagedTilesView } from '../ui/PagedTilesView';

type Asset = { id: string; name: string; url: string; category?: string };

export function AssetBrowser({ onPick, refreshToken, t }: { onPick: (asset: Asset) => void; refreshToken?: number; t: (key: keyof typeof import('@/lib/i18n').translations.en) => string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filter, setFilter] = useState('');
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
        const params = new URLSearchParams();
        if (selectedCategory) params.set('category', selectedCategory);
        if (filter) params.set('q', filter);
        
        const res = await fetch(`/api/assets?${params}`, { headers: { 'x-user-id': session.user.id as string } });
        if (res.ok) {
          const data = await res.json();
          setAssets(data.assets || []);
          setCategories(data.categories || []);
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
  }, [session?.user?.id, status, refreshToken, selectedCategory, filter]);

  if (status === 'loading' || loading) return <div className="text-sm text-gray-400">{t('loadingAssets')}</div>;
  if (status === 'unauthenticated') return <div className="text-sm text-red-400">{t('pleaseSignIn')}</div>;
  if (error) return <div className="text-sm text-red-400">{error}</div>;
  if (!assets.length) return <div className="text-sm text-gray-400">{t('noAssets')}</div>;
//<!-- className="grid grid-cols-4 gap-2"-->
  return (
    <div>
      <div className="space-y-2">
        <input 
          placeholder={t('filter')} 
          value={filter} 
          onChange={e=>setFilter(e.target.value)} 
          className="w-full rounded bg-gray-800 px-2 py-1 text-gray-100 text-sm" 
          type="search"
        />
        {categories.length > 0 && (
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded bg-gray-800 px-2 py-1 text-gray-100 text-sm"
          >
            <option value="">{t('allCategories')}</option>
            <option value="uncategorized">{t('uncategorized')}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>
      <PagedTilesView
        allItems={assets}
        getKey={a=>a.id}
        itemsPerPage={12}
        className='assetsGrid my-2'
        renderItem={(a) => (
          <button key={a.id} className="overflow-hidden rounded bg-gray-800 flex flex-col"
            onClick={() => onPick(a)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.url} alt={a.name} className="h-20 w-20 object-contain transition group-hover:opacity-80" />
            <div className="truncate w-20 px-1 py-0.5 text-xs text-gray-300" title={a.name}>{a.name}</div>
            {a.category && (
              <div className="text-xs text-blue-400 px-1">{a.category}</div>
            )}
          </button>
        )}
      />
    </div>
  );
}