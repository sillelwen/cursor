"use client";

import { HTMLAttributes, ReactElement, useRef } from "react";
import Popup from 'reactjs-popup';
import { TextField } from "@/components/editor/Controls";
import { PopupActions } from "reactjs-popup/dist/types";

type Asset = { id: string; name: string; url: string };

type assetPropertiesProps = HTMLAttributes<HTMLDivElement> & {
    trigger: ReactElement,
    data: Asset,
    t: (key: keyof typeof import('@/lib/i18n').translations.en) => string
};


export function AssetProperties({trigger, data, t, ...props }: assetPropertiesProps) {
    const popupRef = useRef<PopupActions | null>(null);
    const closePopup = () => {
        if (popupRef.current) {
          popupRef.current.close();
        }
      };

    return <Popup ref={popupRef} trigger={trigger} position="center center">
            <div className="bg-white max-w-md rounded grid">
                <img src={data.url}/>
                <div className="space-y-3">
                    <TextField label={t('label')} onChange={()=>{}} value={data.name} key={data.id}/>
                </div>
                <button className="bg-red-600 color-white rounded py-2 px-3" onClick={closePopup}>Close</button>
            </div>
    </Popup>;
  }