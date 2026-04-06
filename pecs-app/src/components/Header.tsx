"use client";

import { AuthButtons } from "@/components/auth/AuthButtons";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/contexts/LocaleContext";
import Link from "next/link";

export function Header() {
  const { locale, setLocale } = useLocale();

  return (
    <header className="border-b border-gray-800 bg-gray-900 p-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/"><h1 className="text-xl font-bold order-1">{locale === 'he' ? 'בונה כרטיסי PECS' : 'PECS Card Builder'}</h1></Link>
        <div className="flex items-center gap-4 order-2">
          <LanguageSelector onLocaleChange={setLocale} />
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}
