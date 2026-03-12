'use client';

/**
 * Site-wide fixed top navigation bar.
 *
 * @module
 */

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, LayoutDashboard, UserCircle, Shield } from 'lucide-react';

import { useAuth, useCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const NAV_LINKS = [
  { href: '/expressions', label: 'Expressions' },
  { href: '/corpora', label: 'Corpora' },
  { href: '/ontologies', label: 'Ontologies' },
  { href: '/experiments', label: 'Experiments' },
  { href: '/design', label: 'Design' },
  { href: '/search', label: 'Search' },
] as const;

/**
 * Extracts initials from a handle or DID for the avatar fallback.
 */
function getInitials(identifier: string): string {
  if (identifier.startsWith('did:')) {
    return identifier.slice(4, 6).toUpperCase();
  }
  const parts = identifier.split('.');
  return (parts[0] ?? identifier).slice(0, 2).toUpperCase();
}

function DesktopNav(): React.JSX.Element {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground',
            'transition-colors hover:text-foreground',
          )}
        >
          {link.label}
        </Link>
      ))}
      {isAuthenticated ? (
        <>
          <Link
            href="/dashboard"
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground',
              'transition-colors hover:text-foreground',
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/admin"
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground',
              'transition-colors hover:text-foreground',
            )}
          >
            Admin
          </Link>
        </>
      ) : null}
    </nav>
  );
}

function MobileNav(): React.JSX.Element {
  const { isAuthenticated } = useAuth();

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>
            <Link href="/" className="text-lg font-bold">
              Layers
            </Link>
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground',
                'transition-colors hover:bg-accent hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground',
                  'transition-colors hover:bg-accent hover:text-foreground',
                )}
              >
                Dashboard
              </Link>
              <Link
                href="/admin"
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground',
                  'transition-colors hover:bg-accent hover:text-foreground',
                )}
              >
                Admin
              </Link>
            </>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function AuthSection(): React.JSX.Element {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const user = useCurrentUser();

  if (isLoading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Button variant="outline" size="sm" render={<Link href="/login" />}>
        Sign In
      </Button>
    );
  }

  const initials = user.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : getInitials(user.handle || user.did);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="relative h-9 w-9 rounded-full" />}
      >
        <Avatar className="h-9 w-9">
          {user.avatar && <AvatarImage src={user.avatar} alt={user.handle} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="h-8 w-8">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.handle} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5">
            {user.displayName && (
              <p className="text-sm font-medium leading-none">{user.displayName}</p>
            )}
            <p className="truncate text-xs text-muted-foreground">@{user.handle}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard" />}>
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <Shield className="mr-2 h-4 w-4" />
            Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        <MobileNav />
        <Link href="/" className="mr-6 flex items-center gap-2">
          <Image src="/layers-logo.svg" alt="Layers" width={24} height={24} className="dark:invert" />
          <span className="text-lg font-bold">Layers</span>
        </Link>
        <DesktopNav />
        <div className="ml-auto flex items-center gap-2">
          <AuthSection />
        </div>
      </div>
    </header>
  );
}

export { SiteHeader };
