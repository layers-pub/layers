'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleCallback } from '@/lib/auth/oauth-client';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      try {
        await handleCallback();
        router.replace('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OAuth callback failed');
      }
    }
    processCallback();
  }, [router]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-destructive">Authentication Error</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <p className="text-muted-foreground">Completing authentication...</p>
    </div>
  );
}
