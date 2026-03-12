'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

import { initializeOAuth } from '@/lib/auth/oauth-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    async function processCallback() {
      try {
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          setError(errorDescription || errorParam);
          setIsProcessing(false);
          return;
        }

        const result = await initializeOAuth();

        if (result) {
          router.push('/');
        } else {
          const code = searchParams.get('code');
          if (code) {
            setError('Failed to complete authentication. Please try again.');
            setIsProcessing(false);
          } else {
            router.push('/');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setIsProcessing(false);
      }
    }

    processCallback();
  }, [searchParams, router]);

  if (isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push('/')}>
              Go Home
            </Button>
            <Button onClick={() => router.push('/login')}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="mt-4 text-muted-foreground">Authenticating...</p>
          </div>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
