"use client";

import { PagedTilesView } from '@/components/ui/PagedTilesView';
import { useLocale } from '@/contexts/LocaleContext';
import { getTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AssetProperties } from './assetProperties';
import { Button, TextField } from '@/components/editor/Controls';
import { NewCategoryInput } from '@/components/NewCategoryInput';

type Asset = { id: string; name: string; url: string; category?: string };

export default function PersonalAssets() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [assetsFiltered, setAssetsFiltered] = useState<Asset[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bulkLoading, setBulkLoading] = useState(false);
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
          const params = new URLSearchParams();
          if (selectedCategory) params.set('category', selectedCategory);
          if (filter) params.set('q', filter);
          
          const res = await fetch(`/api/assets?${params}`, { 
            headers: { 'x-user-id': session.user.id as string } 
          });
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
    }, [session?.user?.id, status, selectedCategory, filter]);

    useEffect(() => {
        setAssetsFiltered(assets.filter(a => {
            const matchesText = filter === '' || a.name.toLowerCase().includes(filter.toLowerCase());
            
            // Handle category filtering
            let matchesCategory = true;
            if (selectedCategory === '') {
                // "All Categories" - show everything
                matchesCategory = true;
            } else if (selectedCategory === 'uncategorized') {
                // "Uncategorized" - show only assets without category
                matchesCategory = !a.category;
            } else {
                // Specific category - show only assets with that category
                matchesCategory = a.category === selectedCategory;
            }
            
            return matchesText && matchesCategory;
        }));
    }, [filter, assets, selectedCategory]);

    const handleAssetUpdate = (updatedAsset: Asset) => {
        setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    };

    const handleAssetDelete = (deletedId: string) => {
        setAssets(prev => prev.filter(a => a.id !== deletedId));
        setSelectedAssets(prev => {
            const newSet = new Set(prev);
            newSet.delete(deletedId);
            return newSet;
        });
    };

    const toggleAssetSelection = (assetId: string) => {
        setSelectedAssets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(assetId)) {
                newSet.delete(assetId);
            } else {
                newSet.add(assetId);
            }
            return newSet;
        });
    };

    const selectAll = () => {
        setSelectedAssets(new Set(assetsFiltered.map(a => a.id)));
    };

    const deselectAll = () => {
        setSelectedAssets(new Set());
    };

    const handleBulkCategory = async (category: string) => {
        if (!session?.user?.id || selectedAssets.size === 0) return;
        
        setBulkLoading(true);
        try {
            const response = await fetch('/api/assets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-user-id': session.user.id as string },
                body: JSON.stringify({ 
                    ids: Array.from(selectedAssets), 
                    category: category || null 
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                // Update local state
                setAssets(prev => prev.map(a => 
                    selectedAssets.has(a.id) ? { ...a, category } : a
                ));
                setSelectedAssets(new Set());
                alert(`${result.updated} assets updated successfully`);
            } else {
                const errorData = await response.json();
                alert(`Failed to update assets: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to update categories:', error);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!session?.user?.id || selectedAssets.size === 0) return;
        
        if (!confirm(t('confirmDelete'))) return;
        
        setBulkLoading(true);
        try {
            const response = await fetch('/api/assets', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'x-user-id': session.user.id as string },
                body: JSON.stringify({ ids: Array.from(selectedAssets) })
            });
            
            if (response.ok) {
                const result = await response.json();
                setAssets(prev => prev.filter(a => !selectedAssets.has(a.id)));
                setSelectedAssets(new Set());
                alert(`${result.deleted} assets deleted successfully`);
            } else {
                const errorData = await response.json();
                alert(`Failed to delete assets: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to delete assets:', error);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleNewCategory = async (newCategory: string) => {
        if (!newCategory.trim() || categories.includes(newCategory)) return;
        
        // Add the new category to the local list temporarily
        // It will persist when assets are assigned to it
        setCategories(prev => [...prev, newCategory]);
    };
  
    if (status === 'loading' || loading) return <div className="text-sm text-gray-400">{t('loadingAssets')}</div>;
    if (status === 'unauthenticated') return <div className="text-sm text-red-400">{t('pleaseSignIn')}</div>;
    if (error) return <div className="text-sm text-red-400">{error}</div>;
    if (!assets.length) return <div className="text-sm text-gray-400">{t('noAssets')}</div>;

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr] editor-grid">
            <aside className="space-y-4 rounded-lg bg-gray-900 p-4 order-2 lg:order-1">
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-300">{t('categories')}</h3>
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full rounded bg-gray-800 px-3 py-2 text-gray-100 text-sm"
                    >
                        <option value="">{t('allCategories')}</option>
                        <option value="uncategorized">{t('uncategorized')}</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <NewCategoryInput 
                        onAddCategory={handleNewCategory}
                        existingCategories={categories}
                        t={t}
                    />
                </div>
                
                {selectedAssets.size > 0 && (
                    <div className="space-y-2 p-3 bg-gray-800 rounded">
                        <div className="text-sm text-gray-300">
                            {selectedAssets.size} {t('selected')}
                        </div>
                        <div className="space-y-2">
                    <select 
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value) {
                                handleBulkCategory(value);
                            }
                            e.target.value = ''; // Reset the select
                        }}
                        className="w-full rounded bg-gray-700 px-2 py-1 text-gray-100 text-xs"
                        disabled={bulkLoading}
                    >
                        <option value="">{t('addToCategory')}</option>
                        <option value="uncategorized">{t('removeFromCategory')}</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <input
                        placeholder="Create new category..."
                        className="w-full rounded bg-gray-700 px-2 py-1 text-gray-100 text-xs"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const newCategory = e.currentTarget.value.trim();
                                if (newCategory) {
                                    handleBulkCategory(newCategory);
                                    e.currentTarget.value = '';
                                }
                            }
                        }}
                    />
                            <Button 
                                onClick={handleBulkDelete}
                                disabled={bulkLoading}
                                className="w-full bg-red-600 hover:bg-red-700 text-xs py-1"
                            >
                                {bulkLoading ? '...' : t('bulkDelete')}
                            </Button>
                        </div>
                    </div>
                )}
            </aside>
            
            <section className="space-y-4 order-1 lg:order-2">
                <div className="flex items-center justify-between gap-x-2">
                    <h2 className="text-lg font-semibold">{t('yourAssets')}</h2>
                    <div className="flex items-center gap-2">
                        <input 
                            className='text-black px-2 py-1 rounded text-sm' 
                            type='search' 
                            name='search' 
                            placeholder={t('filter')} 
                            value={filter} 
                            onChange={(e) => setFilter(e.target.value)} 
                        />
                        <div className="text-sm text-gray-400">
                            {assetsFiltered.length} / {assets.length} {t('pictures')}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={selectAll}
                        className="text-xs py-1 px-2"
                    >
                        {t('selectAll')}
                    </Button>
                    <Button 
                        onClick={deselectAll}
                        className="text-xs py-1 px-2 bg-gray-600 hover:bg-gray-700"
                    >
                        {t('deselectAll')}
                    </Button>
                    {selectedAssets.size > 0 && (
                        <span className="text-sm text-gray-400">
                            {selectedAssets.size} {t('selected')}
                        </span>
                    )}
                </div>
                
                <div className='text-red-100'>{error}</div>
                <PagedTilesView
                    allItems={assetsFiltered}
                    getKey={a=>a.id}
                    itemsPerPage={12}
                    className='personalAssetsGrid space-y-1'
                    renderItem={(a) => (
                        <div key={a.id} className="relative group">
                            <input 
                                type="checkbox"
                                checked={selectedAssets.has(a.id)}
                                onChange={() => toggleAssetSelection(a.id)}
                                className="absolute top-2 left-2 z-10 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <AssetProperties 
                                t={t} 
                                data={a} 
                                categories={categories}
                                onUpdate={handleAssetUpdate}
                                onDelete={handleAssetDelete}
                                trigger={
                                    <button className="group overflow-hidden rounded bg-gray-800 flex flex-col w-full">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={a.url} alt={a.name} className="h-24 w-24 object-contain transition group-hover:opacity-80" />
                                        <div className="truncate px-1 py-0.5 text-xs text-gray-300">{a.name}</div>
                                        {a.category && (
                                            <div className="text-xs text-blue-400 px-1 pb-0.5">{a.category}</div>
                                        )}
                                    </button>
                                }
                            />
                        </div>
                    )}
                />
            </section>
        </div>
    );
}