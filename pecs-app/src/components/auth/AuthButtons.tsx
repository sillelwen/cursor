"use client";
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

export function AuthButtons() {
  const { data: session, status } = useSession();
  if (status === 'loading') return null;
  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-300">{session.user.name || session.user.email}</span>
        <Button variant="secondary" onClick={() => signOut()}>Sign out</Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button onClick={() => signIn()}>Sign In</Button>
      <Button variant="secondary" onClick={() => window.location.href = '/auth/signup'}>Sign Up</Button>
    </div>
  );
}