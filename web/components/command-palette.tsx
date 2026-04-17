'use client';

/**
 * Global command palette.
 *
 * Opens on Ctrl/Cmd+K. Lists every record kind from the panproto-generated
 * registry, each with a Browse and New action, so coverage scales automatically
 * as new record types are added to the lexicons.
 */

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { recordKindList } from '@/lib/generated/record-registry';

export function CommandPalette(): React.JSX.Element | null {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" shouldFilter className="w-full">
          <Command.Input
            autoFocus
            placeholder="Search records, kinds, actions…"
            className={cn(
              'w-full border-0 border-b bg-transparent px-4 py-3 text-sm outline-none',
              'placeholder:text-muted-foreground',
            )}
          />
          <Command.List className="max-h-96 overflow-auto p-2">
            <Command.Empty className="p-4 text-sm text-muted-foreground">
              No matches.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-xs">
              <PaletteItem onSelect={() => go('/')}>Home</PaletteItem>
              <PaletteItem onSelect={() => go('/kinds')}>All record kinds</PaletteItem>
              <PaletteItem onSelect={() => go('/workspace')}>Workspace</PaletteItem>
              <PaletteItem onSelect={() => go('/dashboard')}>Dashboard</PaletteItem>
              <PaletteItem onSelect={() => go('/search')}>Search</PaletteItem>
            </Command.Group>

            <Command.Group heading="Record kinds" className="text-xs">
              {recordKindList.map((kind) => (
                <PaletteItem
                  key={`browse:${kind.slug}`}
                  keywords={[kind.nsid, kind.title, 'browse']}
                  onSelect={() => go(`/${kind.slug}`)}
                >
                  <span>Browse {kind.title}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {kind.nsid}
                  </span>
                </PaletteItem>
              ))}
            </Command.Group>

            <Command.Group heading="Create" className="text-xs">
              {recordKindList.map((kind) => (
                <PaletteItem
                  key={`new:${kind.slug}`}
                  keywords={[kind.nsid, 'new', 'create']}
                  onSelect={() => go(`/${kind.slug}/new`)}
                >
                  New {kind.title}
                </PaletteItem>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function PaletteItem({
  onSelect,
  keywords,
  children,
}: {
  onSelect: () => void;
  keywords?: readonly string[];
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Command.Item
      onSelect={onSelect}
      keywords={keywords ? [...keywords] : undefined}
      className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm aria-selected:bg-muted"
    >
      {children}
    </Command.Item>
  );
}
