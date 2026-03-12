'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { HandleInput } from '@/components/auth/handle-input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    router.replace('/');
    return null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = handle.trim();
    if (!trimmed) {
      setError('Please enter your ATProto handle.');
      return;
    }

    if (!trimmed.includes('.') && !trimmed.startsWith('did:')) {
      setError('Enter a valid handle (e.g., alice.bsky.social) or DID.');
      return;
    }

    setIsLoading(true);
    try {
      await login(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-3xl font-bold tracking-tight">Sign in to Layers</h1>
      <p className="mt-2 text-muted-foreground">
        Enter your ATProto handle to authenticate via your PDS.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="handle" className="block text-sm font-medium">
            Handle
          </label>
          <HandleInput
            value={handle}
            onChange={setHandle}
            placeholder="alice.bsky.social"
            disabled={isLoading}
            className="mt-1"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting...
            </>
          ) : (
            'Sign in'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Your data remains in your Personal Data Server. Layers only indexes public records.
        </p>
      </form>
    </div>
  );
}
