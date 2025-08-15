"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { getTranslation, getStoredLocale } from "@/lib/i18n";

export function AuthButtons() {
  const { data: session, status } = useSession();
  const locale = getStoredLocale();

  if (status === "loading") {
    return <div className="text-sm text-gray-400">Loading...</div>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-300">
          {session.user?.name || session.user?.email || "User"}
        </span>
        <button
          onClick={() => signOut()}
          className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
        >
          {getTranslation(locale, 'signOut')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
    >
      {getTranslation(locale, 'signIn')}
    </button>
  );
}