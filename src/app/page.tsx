import React, { Suspense } from 'react';
import { getServerRoom } from '@/lib/server-store';
import { PokerClientApp } from '@/components/PokerClientApp';
import { Loader2 } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ pin?: string; userId?: string }>;
}

export default async function PokerGamePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const pin = params?.pin || null;
  const userId = params?.userId || null;

  let initialRoom = null;
  if (pin) {
    initialRoom = getServerRoom(pin) || null;
  }

  return (
    <Suspense
      fallback={
        <div
          className="app-container"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}
        >
          <Loader2 size={40} color="#10b981" className="animate-spin" />
        </div>
      }
    >
      <PokerClientApp
        initialPin={pin}
        initialUserId={userId}
        initialRoom={initialRoom}
      />
    </Suspense>
  );
}
