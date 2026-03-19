'use client';

/**
 * Site-wide fixed top navigation bar.
 *
 * Navigation is organized into two dropdown categories (Explore, Create)
 * plus a standalone Search link and authenticated-only Dashboard/Admin.
 *
 * @module
 */

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  LogOut,
  LayoutDashboard,
  Shield,
  BookOpen,
  Network,
  FlaskConical,
  Search,
  Pencil,
  FileUp,
  FolderPlus,
  ChevronDown,
} from 'lucide-react';

import { useAuth, useCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

// =============================================================================
// NAV STRUCTURE
// =============================================================================

const EXPLORE_LINKS = [
  { href: '/corpora', label: 'Corpora', icon: BookOpen, description: 'Browse annotated corpora' },
  {
    href: '/ontologies',
    label: 'Ontologies',
    icon: Network,
    description: 'Type systems and vocabularies',
  },
  {
    href: '/experiments',
    label: 'Experiments',
    icon: FlaskConical,
    description: 'Judgment tasks and results',
  },
] as const;

const CREATE_LINKS = [
  {
    href: '/design',
    label: 'Design Studio',
    icon: Pencil,
    description: 'Build lexicons, templates, and experiments',
  },
  {
    href: '/import',
    label: 'Import Data',
    icon: FileUp,
    description: 'CoNLL-U, BRAT, ELAN, TEI, TextGrid',
  },
  {
    href: '/corpora/new',
    label: 'New Corpus',
    icon: FolderPlus,
    description: 'Create an empty corpus',
  },
] as const;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extracts initials from a display name, handle, or DID for the avatar fallback.
 */
function getInitials(identifier: string): string {
  if (identifier.startsWith('did:')) {
    return identifier.slice(4, 6).toUpperCase();
  }
  const parts = identifier.split('.');
  return (parts[0] ?? identifier).slice(0, 2).toUpperCase();
}

/**
 * Returns true if the current path starts with the given href.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

// =============================================================================
// DESKTOP NAV
// =============================================================================

function NavDropdown({
  label,
  links,
  pathname,
}: {
  label: string;
  links: ReadonlyArray<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }>;
  pathname: string;
}): React.JSX.Element {
  const active = links.some((l) => isActive(pathname, l.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className={cn(
              'flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          />
        }
      >
        {label}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {links.map((link) => (
            <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
              <link.icon className="mr-2.5 size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col">
                <span className={cn('text-sm', isActive(pathname, link.href) && 'font-medium')}>
                  {link.label}
                </span>
                <span className="text-xs text-muted-foreground">{link.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      <NavDropdown label="Explore" links={EXPLORE_LINKS} pathname={pathname} />
      <NavDropdown label="Create" links={CREATE_LINKS} pathname={pathname} />
      <Link
        href="/search"
        className={cn(
          'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive(pathname, '/search')
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Search className="size-3.5" />
        Search
      </Link>
    </nav>
  );
}

// =============================================================================
// MOBILE NAV
// =============================================================================

function MobileNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="size-5" />
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
        <nav className="mt-6 flex flex-col gap-1">
          {/* Explore section */}
          <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Explore
          </p>
          {EXPLORE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive(pathname, link.href)
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}

          {/* Create section */}
          <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Create
          </p>
          {CREATE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive(pathname, link.href)
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}

          {/* Search */}
          <div className="my-2 h-px bg-border" />
          <Link
            href="/search"
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive(pathname, '/search')
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Search className="size-4" />
            Search
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// AUTH SECTION
// =============================================================================

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

// =============================================================================
// HEADER
// =============================================================================

function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        <MobileNav />
        <Link href="/" className="mr-6 flex items-center gap-2">
          <Image src="/layers-logo.svg" alt="Layers" width={24} height={24} className="rounded" />
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
