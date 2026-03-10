'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

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
          <input
            id="handle"
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="alice.bsky.social"
            autoComplete="username"
            autoFocus
            disabled={isLoading}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading ? 'Redirecting...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
