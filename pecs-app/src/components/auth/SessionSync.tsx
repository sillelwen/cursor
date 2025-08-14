"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function SessionSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      try {
        localStorage.setItem('userId', session.user.id as string);
      } catch {}
    } else if (status === 'unauthenticated') {
      try {
        localStorage.removeItem('userId');
      } catch {}
    }
  }, [session?.user?.id, status]);

  return null;
}


