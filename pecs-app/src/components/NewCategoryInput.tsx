"use client";

import { useState } from 'react';
import { Button, TextField } from '@/components/editor/Controls';

interface NewCategoryInputProps {
  onAddCategory: (category: string) => void;
  existingCategories: string[];
  t: (key: keyof typeof import('@/lib/i18n').translations.en) => string;
}

export function NewCategoryInput({ onAddCategory, existingCategories, t }: NewCategoryInputProps) {
  const [newCategory, setNewCategory] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAdd = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !existingCategories.includes(trimmed)) {
      onAddCategory(trimmed);
      setNewCategory('');
      setShowInput(false);
    }
  };

  if (!showInput) {
    return (
      <div className="text-center">
        <Button 
          onClick={() => setShowInput(true)}
          className="text-xs py-1 px-2 bg-green-600 hover:bg-green-700"
        >
          + {t('newCategory')}
        </Button>
        <div className="text-xs text-gray-400 mt-1">
          Categories will appear here once you assign assets to them
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        value={newCategory}
        onChange={(e) => setNewCategory(e.target.value)}
        placeholder={t('newCategory')}
        className="flex-1 rounded bg-gray-800 px-2 py-1 text-gray-100 text-sm"
      />
      <Button 
        onClick={handleAdd}
        disabled={!newCategory.trim() || existingCategories.includes(newCategory.trim())}
        className="text-xs py-1 px-2"
      >
        {t('add')}
      </Button>
      <Button 
        onClick={() => {
          setShowInput(false);
          setNewCategory('');
        }}
        className="text-xs py-1 px-2 bg-gray-600 hover:bg-gray-700"
      >
        {t('cancel')}
      </Button>
    </div>
  );
}
