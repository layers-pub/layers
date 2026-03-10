'use client';

/**
 * Admin sidebar navigation with collapsible sections and active route highlighting.
 *
 * @module
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  ListTodo,
  Plug,
  Radio,
  Search,
  Server,
  Users,
  Upload,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// =============================================================================
// NAV CONFIGURATION
// =============================================================================

interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
}

const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: 'System',
    items: [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard },
      { label: 'Health', href: '/admin/health', icon: HeartPulse },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Content', href: '/admin/content', icon: FileText },
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Imports', href: '/admin/imports', icon: Upload },
    ],
  },
  {
    title: 'Infrastructure',
    items: [
      { label: 'Firehose', href: '/admin/firehose', icon: Radio },
      { label: 'Plugins', href: '/admin/plugins', icon: Plug },
      { label: 'Queues', href: '/admin/queues', icon: ListTodo },
      { label: 'Reconciliation', href: '/admin/reconciliation', icon: Database },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Search Analytics', href: '/admin/search-analytics', icon: Search },
      { label: 'Graph Stats', href: '/admin/graph', icon: GitBranch },
      { label: 'Runtime', href: '/admin/runtime', icon: Server },
    ],
  },
] as const;

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================

interface AdminSidebarProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps): React.JSX.Element {
  const pathname = usePathname();

  /**
   * Checks whether a nav item is active. Exact match for /admin,
   * prefix match for all other routes.
   */
  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          'flex h-full flex-col border-r bg-muted/30 transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-3">
          {!collapsed && <span className="text-sm font-semibold tracking-tight">Admin</span>}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggle}
            className={cn(collapsed && 'mx-auto')}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {NAV_SECTIONS.map((section, sectionIndex) => (
              <div key={section.title}>
                {sectionIndex > 0 && <Separator className="my-2" />}

                {!collapsed && (
                  <span className="mb-1 block px-2 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </span>
                )}

                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger
                          render={
                            <Link
                              href={item.href}
                              className={cn(
                                'flex h-8 w-full items-center justify-center rounded-md transition-colors',
                                active
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                              )}
                            />
                          }
                        >
                          <Icon className="h-4 w-4" />
                          <span className="sr-only">{item.label}</span>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors',
                        active
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </TooltipProvider>
  );
}

export type { AdminSidebarProps };
export { AdminSidebar };
