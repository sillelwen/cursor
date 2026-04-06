"use client";

import { HTMLAttributes, ReactElement, useRef, useState } from "react";
import Popup from 'reactjs-popup';
import { TextField, Button } from "@/components/editor/Controls";
import { PopupActions } from "reactjs-popup/dist/types";
import { useSession } from 'next-auth/react';

type Asset = { id: string; name: string; url: string; category?: string };

type assetPropertiesProps = HTMLAttributes<HTMLDivElement> & {
    trigger: ReactElement,
    data: Asset,
    t: (key: keyof typeof import('@/lib/i18n').translations.en) => string,
    onUpdate?: (asset: Asset) => void,
    onDelete?: (id: string) => void,
    categories?: string[]
};

export function AssetProperties({trigger, data, t, onUpdate, onDelete, categories = [], ...props }: assetPropertiesProps) {
    const popupRef = useRef<PopupActions | null>(null);
    const [name, setName] = useState(data.name);
    const [category, setCategory] = useState(data.category || '');
    const [loading, setLoading] = useState(false);
    const { data: session } = useSession();

    const closePopup = () => {
        if (popupRef.current) {
          popupRef.current.close();
        }
    };

    const handleSave = async () => {
        if (!session?.user?.id) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/assets/${data.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-user-id': session.user.id as string },
                body: JSON.stringify({ name, category: category || null })
            });
            
            if (response.ok) {
                const result = await response.json();
                onUpdate?.(result.asset);
                closePopup();
            } else {
                const errorData = await response.json();
                alert(`Failed to update asset: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to update asset:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!session?.user?.id || !confirm(t('confirmDeleteSingle'))) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/assets/${data.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'x-user-id': session.user.id as string }
            });
            
            if (response.ok) {
                onDelete?.(data.id);
                closePopup();
            } else {
                const errorData = await response.json();
                alert(`Failed to delete asset: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to delete asset:', error);
        } finally {
            setLoading(false);
        }
    };

    return <Popup ref={popupRef} trigger={trigger} position="center center">
            <div className="bg-white max-w-md rounded p-4 space-y-4">
                <img src={data.url} alt={data.name} className="w-full h-48 object-contain rounded"/>
                <div className="space-y-3">
                    <TextField 
                        label={t('label')} 
                        onChange={setName} 
                        value={name} 
                        key={data.id}
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('category')}
                        </label>
                        <select 
                            value={category} 
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                        >
                            <option value="">{t('uncategorized')}</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="flex-1"
                    >
                        {loading ? '...' : t('saveSheet')}
                    </Button>
                    <Button 
                        onClick={handleDelete} 
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 flex-1"
                    >
                        {loading ? '...' : t('delete')}
                    </Button>
                    <Button 
                        onClick={closePopup} 
                        disabled={loading}
                        className="bg-gray-600 hover:bg-gray-700"
                    >
                        {t('cancel')}
                    </Button>
                </div>
            </div>
    </Popup>;
}