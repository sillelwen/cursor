"use client";

import { useMemo } from 'react';

export type TextPosition = 'above' | 'below';

export type CardData = {
  id: string;
  label: string;
  imageUrl?: string;
  objectUrl?: string;
  assetId?: string;
  crop?: { x: number; y: number; scale: number };
  fontFamily?: string;
  fontSizePt?: number;
  bold?: boolean;
  uploadingAsset?: boolean;
};

export type SheetSettings = {
  columns: number;
  rows: number;
  pageWidthMm: number;
  pageHeightMm: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  gapMm: number;
  cardWidthMm: number;
  cardHeightMm: number;
  textPosition: TextPosition;
  fontFamily: string;
  fontSizePt: number;
  bold: boolean;
};

function mmToPx(mm: number, dpi = 96) {
  return Math.round((mm / 25.4) * dpi);
}

export function Canvas({
  cards,
  settings,
  t,
}: {
  cards: CardData[];
  settings: SheetSettings;
  t: (key: keyof typeof import('@/lib/i18n').translations.en) => string;
}) {
  const {
    columns,
    rows,
    pageWidthMm,
    pageHeightMm,
    marginTopMm,
    marginRightMm,
    marginBottomMm,
    marginLeftMm,
    gapMm,
    cardWidthMm,
    cardHeightMm,
    textPosition,
    fontFamily,
    fontSizePt,
    bold,
  } = settings;
  const pageStyle = useMemo(() => ({
    width: mmToPx(pageWidthMm),
    height: mmToPx(pageHeightMm),
    padding: `${mmToPx(marginTopMm)}px ${mmToPx(marginRightMm)}px ${mmToPx(marginBottomMm)}px ${mmToPx(marginLeftMm)}px`,
    background: 'white',
    color: 'black',
  }), [pageWidthMm, pageHeightMm, marginTopMm, marginRightMm, marginBottomMm, marginLeftMm]);

  const cardStylePx = useMemo(() => ({
    width: mmToPx(cardWidthMm),
    height: mmToPx(cardHeightMm),
    gap: mmToPx(gapMm),
  }), [cardWidthMm, cardHeightMm, gapMm]);

  const textClassBase = `${bold ? 'font-bold' : ''}`;

  const totalCells = columns * rows;
  const displayCards = useMemo(() => {
    if (cards.length >= totalCells) return cards.slice(0, totalCells);
    const fillers: CardData[] = Array.from({ length: totalCells - cards.length }, (_, i) => ({
      id: `empty-${i}`,
      label: '',
      imageUrl: undefined,
      objectUrl: undefined,
      crop: undefined,
    }));
    return [...cards, ...fillers];
  }, [cards, totalCells]);

  return (
    <div className="shadow-xl" style={pageStyle} id="print-area">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${cardStylePx.width}px)`,
          gridTemplateRows: `repeat(${rows}, ${cardStylePx.height}px)`,
          gap: cardStylePx.gap,
        }}
      >
        {displayCards.map((card) => (
          <div key={card.id} className="border border-gray-300 p-1 flex flex-col">
            {textPosition === 'above' && (
              <div
                className={`text-center ${card.bold ?? bold ? 'font-bold' : ''}`}
                style={{ fontFamily: card.fontFamily || fontFamily, fontSize: `${card.fontSizePt ?? fontSizePt}pt` }}
              >
                {card.label}
              </div>
            )}
            <div className="relative flex-1 bg-white overflow-hidden">
              {card.imageUrl || card.objectUrl ? (
                <>
                  <div
                    className="absolute inset-0 screen-img"
                    style={{
                      backgroundImage: `url(${card.objectUrl || card.imageUrl!})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      backgroundSize: 'contain',
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.objectUrl || card.imageUrl!}
                    alt={card.label || 'card image'}
                    className="absolute inset-0 h-full w-full object-contain print-img"
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                  {t('noImage')}
                </div>
              )}
            </div>
            {textPosition === 'below' && (
              <div
                className={`text-center ${card.bold ?? bold ? 'font-bold' : ''}`}
                style={{ fontFamily: card.fontFamily || fontFamily, fontSize: `${card.fontSizePt ?? fontSizePt}pt` }}
              >
                {card.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}