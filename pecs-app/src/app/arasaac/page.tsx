"use client";

import { ColorField, SelectField, ToggleField } from '@/components/editor/Controls';
import { Accordeon } from '@/components/ui/Accordeon';
import { Button } from '@/components/ui/Button';
import { PagedTilesView } from '@/components/ui/PagedTilesView';
import { useLocale } from '@/contexts/LocaleContext';
import { getTranslation } from '@/lib/i18n';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

type Keyword = {
    idKeyword: number,
    keyword: string,
    plural: string,
    idLocution: string,
    meaning: string,
    type: number,
    lse: number
};
type SearchResult = {
    _id: number,
    keywords: [Keyword],
    schematic: boolean,
    sex: boolean,
    violence: boolean,
    created: Date,
    lastUpdated: Date,
    downloads: number,
    categories: [string],
    synsets: [string],
    tags: [string],
    desc: string
};
type Error = {
    message: string,
    err: string
};
type PictureSettings = {
    plural: boolean,
    color: boolean,
    backgroundColor: string|null,
    action: string,
    resolution: number,
    skin: string,
    hair: string,
    url: boolean,
    download: boolean,
    identifier: string,
    identifierPosition: string
};
function defaultSettings(): PictureSettings {
    return {
        plural: false,
        color: true,
        backgroundColor: '',
        action: '',
        resolution: 500,
        skin: '',
        hair: '',
        url: false,
        download: false,
        identifier: '',
        identifierPosition: ''
  }
}

const ARASAAC_BASE_ADDRESS = 'https://api.arasaac.org/v1/';
const ARASAAC_SEARCH = 'pictograms/{language}/search/{pattern}';
const ARASAAC_PICTURE = 'pictograms/{_id}';

export default function ArasaacBrowser() {
    const [settings, setSettings] = useState<PictureSettings>(defaultSettings());
    const [pattern, setPattern] = useState<string>('');
    const [pictures, setPictures] = useState<SearchResult[]>([]);
    const [error, setError] = useState<Error | null>();
    const { locale } = useLocale();
    const t = (key: keyof typeof import('@/lib/i18n').translations.en) => getTranslation(locale || 'en', key);
    const [searchLang, setSearchLang] = useState<string>(locale || 'en');
    console.log(searchLang);

    const getSettings = ()=>{
        let res = '';
        for (const [key, value] of Object.entries(settings)) {
            let val = value;
            if(key === 'backgroundColor') {
                //val = value ? value.toString().replace('#', '') : 'none';
                val = 'none';
            }
            if (val!=='' && val !== null) {
                res = (res ? (res + '&') : '?') + `${key}=${val.toString()}`;
            }
        }
        return res;
    }

    const searchOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            doSearch();
        }
    };

    const doSearch = () => {
        setError(null); setPictures([]);
        fetch(ARASAAC_BASE_ADDRESS + ARASAAC_SEARCH.replace('{language}', searchLang || 'en').replace('{pattern}', pattern)).
            then((response) => {
                if (response.ok)
                    response.json().then(data => setPictures(data));
                else
                    response.json().then(data => setError(data));
            }).
            catch((ex) => {
                setError({ message: ex.message, err: ex.code });
            });
    }

    const addAssetFromUrl = (url: string, label: string, backgroundColor: string|null) => {
        const tempId = uuidv4();
        (async () => {
          try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;
            const res = await fetch('/api/upload/from-url', { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
              body: JSON.stringify({ url, name: label,  backgroundColor})
            });
            console.log(await res.json());
            if (res.ok) {
              //const data = await res.json();
              alert(t('assetUpploaded'))
            } else {
                alert(t('uploadFailed'));
            }
          } catch {
                alert(t('uploadError'));
          }
        })();
      };

    return (

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr] editor-grid">
            <aside className="space-y-4 rounded-lg bg-gray-900 p-4 order-2 lg:order-1">
                <Accordeon heading={t('settings')}>
                    <div className="space-y-3">
                        <ToggleField className='grid py-1' label={t('plural')} checked={settings.plural} onChange={(v) => setSettings({ ...settings, plural: v })} />
                        <ToggleField className='grid py-1' label={t('color')} checked={settings.color} onChange={(v) => setSettings({ ...settings, color: v })} />
                        <ColorField value={settings.backgroundColor} onChange={(v) => setSettings({...settings, backgroundColor: v})} label={t('backgroundColor')}/>
                        <SelectField label={t('skinTone')}
                            options={[
                                {value: '', label: '-'},
                                {value: 'white', label: t('skinWhite')},
                                {value: 'black', label: t('skinBlack')},
                                {value: 'assian', label: t('skinAssian')},
                                {value: 'mulatto', label: t('skinMulatto')},
                                {value: 'aztec', label: t('skinAztec')}
                            ]}
                            value={settings.skin}
                            onChange={(v)=>setSettings({...settings, skin: v??null})}
                        />
                        <SelectField label={t('hairColor')}
                            options={[
                                {value: '', label: '-'},
                                {value: 'blonde', label: t('hairBlonde')},
                                {value: 'brown', label: t('hairBrown')},
                                {value: 'gray', label: t('hairGray')},
                                {value: 'darkGray', label: t('hairDarkGray')},
                                {value: 'red', label: t('hairRed')},
                                {value: 'black', label: t('hairBlack')}
                            ]}
                            value={settings.hair}
                            onChange={(v)=>setSettings({...settings, hair: v??null})}
                        />
                    </div>
                </Accordeon>
            </aside>
            <section className="space-y-1 order-1 lg:order-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">ARASAAC</h2>
                    <div className="text-sm text-gray-400">{pictures.length} {t('pictures')}</div>
                </div>
                
                <div className="flex items-start justify-start gap-x-2">
                    <SelectField
                        label=''
                        options={[
                            {value: 'en', label: t('english')},
                            {value: 'he', label: t('hebrew')},
                            {value: 'ru', label: t('russian')},
                        ]}
                        value={searchLang}
                        onChange={(v) => setSearchLang(v)}
                    />
                    <input className='text-black px-1' type='search' name='search' value={pattern} onChange={(e) => setPattern(e.target.value)} onKeyDown={searchOnEnter} />
                    <Button className="py-1 text-sm" onClick={doSearch}>{t('search')}</Button>
                </div>
                <div className='text-red-100'>{error?.message}</div>
                <PagedTilesView
                    allItems={pictures}
                    getKey={p=>p._id}
                    itemsPerPage={12}
                    className='arasaacGrid'
                    renderItem={(p) => (
                        <button key={p._id} className="group overflow-hidden rounded bg-gray-800 flex flex-col"
                            onClick={() => {
                                if(confirm(t('addAssetQuestion'))===true)
                                    addAssetFromUrl(ARASAAC_BASE_ADDRESS + ARASAAC_PICTURE.replace('{_id}', p._id.toString()) + getSettings(), p.keywords[0]?.keyword, settings.backgroundColor);
                                }}
                            >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img style={{backgroundColor: settings.backgroundColor??'transparent'}} src={ARASAAC_BASE_ADDRESS + ARASAAC_PICTURE.replace('{_id}', p._id.toString()) + getSettings()} alt={p.desc} className="h-100 w-100 object-contain transition group-hover:opacity-80" />
                            <div className="truncate px-1 py-0.5 text-s text-gray-300" title={p.keywords.map(k=>k.keyword).join(', ')}>{p.keywords[0]?.keyword}</div>
                        </button>
                    )}
                />
            </section>
        </div>
    );
}