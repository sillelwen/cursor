"use client";

import { PagedTilesView } from '@/components/ui/PagedTilesView';
import { useLocale } from '@/contexts/LocaleContext';
import { getTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AssetProperties } from './assetProperties';


type Asset = { id: string; name: string; url: string };

export default function PersonalAssets() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [assetsFiltered, setAssetsFiltered] = useState<Asset[]>([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { data: session, status } = useSession();
    const { locale } = useLocale();
  
  
    const t = (key: keyof typeof import('@/lib/i18n').translations.en) => getTranslation(locale || 'en', key);
  
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
    }, [session?.user?.id, status]);

    useEffect(() => {
        setAssetsFiltered(assets.filter(a=>a.name.includes(filter)));
    }, [filter,assets])
  
    if (status === 'loading' || loading) return <div className="text-sm text-gray-400">{t('loadingAssets')}</div>;
    if (status === 'unauthenticated') return <div className="text-sm text-red-400">{t('pleaseSignIn')}</div>;
    if (error) return <div className="text-sm text-red-400">{error}</div>;
    if (!assets.length) return <div className="text-sm text-gray-400">{t('noAssets')}</div>;

    return (

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr] editor-grid">
            <aside className="space-y-4 rounded-lg bg-gray-900 p-4 order-2 lg:order-1">
            </aside>
            <section className="space-y-1 order-1 lg:order-2">
                <div className="flex items-center justify-between gap-x-2">
                    <h2 className="text-lg font-semibold whitespace-pre">{t('yourAssets')}</h2>
                    <input className='text-black px-1 rounded w-full' type='search' name='search' placeholder={t('filter')} value={filter} onChange={(e) => setFilter(e.target.value)} />
                    <div className="text-sm text-gray-400 whitespace-pre">{assetsFiltered.length} / {assets.length} {t('pictures')}</div>
                </div>
                
                <div className='text-red-100'>{error}</div>
                <PagedTilesView
                    allItems={assetsFiltered}
                    getKey={a=>a.id}
                    itemsPerPage={12}
                    className='personalAssetsGrid space-y-1'
                    renderItem={(a) => (<AssetProperties t={t} data={a} trigger={
                        <button key={a.id} className="group overflow-hidden rounded bg-gray-800 flex flex-col">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.url} alt={a.name} className="h-100 w-100 object-contain transition group-hover:opacity-80" />
                            <div className="truncate px-1 py-0.5 text-s text-gray-300">{a.name}</div>
                        </button>
                    }/>
                    )}
                />
            </section>
        </div>
    );
}