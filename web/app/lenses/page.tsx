'use client';

/**
 * Browse the generated lens registry.
 *
 * Lists every panproto lens declared in
 * `layers/lexicons/lenses/manifest.json`, fed via the generated
 * `web/lib/lenses/generated/registry.ts` artefact. Tapping a lens
 * opens a Vaul-backed bottom drawer (or desktop dialog) showing the
 * verbatim DSL source.
 */

import { useState } from 'react';

import { lensRegistry, lensSourcePrefixes } from '@/lib/lenses/generated/registry';
import type { LensRegistryEntry } from '@/lib/lenses/generated/registry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MobileDrawer,
  MobileDrawerContent,
  MobileDrawerHeader,
  MobileDrawerTitle,
  MobileDrawerTrigger,
} from '@/components/ui/mobile-drawer';

export default function LensesPage(): React.JSX.Element {
  const prefixes = lensSourcePrefixes();
  const [active, setActive] = useState<string>('all');
  const filtered: readonly LensRegistryEntry[] =
    active === 'all'
      ? lensRegistry
      : lensRegistry.filter((l) => l.sourceNsid.startsWith(active + '.'));
  return (
    <main className="container mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Registered lenses</h1>
        <p className="text-sm text-muted-foreground">
          {lensRegistry.length} hand-authored panproto lenses connect upstream
          NSIDs to <code className="font-mono">pub.layers.*</code> shapes.
        </p>
      </header>
      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="overflow-x-auto h-auto flex flex-wrap justify-start gap-1 md:gap-2 bg-transparent p-0">
          <TabsTrigger
            value="all"
            className="tap-target rounded-full border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            All
          </TabsTrigger>
          {prefixes.map((p) => (
            <TabsTrigger
              key={p}
              value={p}
              className="tap-target rounded-full border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {p}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={active} className="mt-4">
          <ul className="grid gap-3 md:grid-cols-2">
            {filtered.map((lens) => (
              <li key={lens.name}>
                <LensCard lens={lens} />
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function LensCard({ lens }: { lens: LensRegistryEntry }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <MobileDrawer open={open} onOpenChange={setOpen}>
      <MobileDrawerTrigger className="block w-full text-left">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{lens.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="outline" className="font-mono">
                {lens.sourceNsid}
              </Badge>
              <span aria-hidden>→</span>
              <Badge className="font-mono">{lens.targetNsid}</Badge>
            </div>
            <p className="line-clamp-3 text-muted-foreground">
              {lens.description || 'No description'}
            </p>
          </CardContent>
        </Card>
      </MobileDrawerTrigger>
      <MobileDrawerContent className="md:max-w-2xl">
        <MobileDrawerHeader>
          <MobileDrawerTitle>{lens.id}</MobileDrawerTitle>
        </MobileDrawerHeader>
        <div className="px-4 pb-6">
          <p className="text-xs text-muted-foreground">
            Lens URI: <span className="font-mono break-all">{lens.lensUri}</span>
          </p>
          <pre className="mt-3 max-h-[60dvh] overflow-auto rounded bg-muted/40 p-3 text-[11px] leading-snug">
            {lens.dslSource}
          </pre>
        </div>
      </MobileDrawerContent>
    </MobileDrawer>
  );
}
