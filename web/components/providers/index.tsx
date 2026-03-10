'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';

function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export { Providers };
export { QueryProvider } from './query-provider';
export { ThemeProvider } from './theme-provider';
