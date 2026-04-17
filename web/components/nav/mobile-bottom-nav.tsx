'use client';

/**
 * Fixed bottom navigation for mobile (<md).
 *
 * Surfaces the four most-used sections: Home, Browse (record kinds index),
 * Workspace, and Profile. Hidden at md+ where the site header handles
 * navigation.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Search, User } from 'lucide-react';

import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/kinds', label: 'Browse', icon: LayoutGrid },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/dashboard', label: 'Profile', icon: User },
] as const;

export function MobileBottomNav(): React.JSX.Element {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium',
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
