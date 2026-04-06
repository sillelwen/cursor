import { NextRequest, NextResponse } from 'next/server';

// Temporary minimal session extractor: require x-user-id header; no global fallback
export async function getSessionFromRequest(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  return userId ? { user: { id: userId } } : null;
}

export function requireUserId(req: NextRequest): string {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    throw new Error('Unauthorized: missing x-user-id');
  }
  return userId;
}
