import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { AuthButtons } from '@/components/auth/AuthButtons';

export const metadata: Metadata = {
  title: 'PECS Builder',
  description: 'Build printable PECS card sheets',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SessionProvider>
          <div className="mx-auto max-w-7xl p-4">
            <header className="mb-6 flex items-center justify-between">
              <h1 className="text-xl font-semibold">PECS Builder</h1>
              <AuthButtons />
            </header>
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}