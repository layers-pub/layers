'use client';

/**
 * Fixed bottom navigation for mobile (<md).
 *
 * Surfaces the five most-used sections: Home, Discover (the new
 * faceted browse), Lens (cross-app interop), Workspace, and Profile.
 * Hidden at md+ where the site header handles navigation. The nav
 * hides on scroll-down and reveals on scroll-up to mirror the
 * Bluesky/Skylight pattern, and respects the
 * `safe-area-inset-bottom` on iOS.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home, Sparkles, SquarePen, User } from 'lucide-react';

import { useScrollDirection } from '@/lib/hooks/use-scroll-direction.js';
import { cn } from '@/lib/utils.js';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/lens', label: 'Lens', icon: Sparkles },
  { href: '/workspace', label: 'Workspace', icon: SquarePen },
  { href: '/dashboard', label: 'You', icon: User },
] as const;

export function MobileBottomNav(): React.JSX.Element {
  const pathname = usePathname();
  const direction = useScrollDirection();
  const hidden = direction === 'down';
  return (
    <nav
      aria-label="Primary"
      data-hidden={hidden ? 'true' : 'false'}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden',
        'pb-[env(safe-area-inset-bottom)] transition-transform duration-200',
        'data-[hidden=true]:translate-y-full',
      )}
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] min-w-[44px] flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium touch-manipulation',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}
