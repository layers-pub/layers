import type { Metadata } from 'next';
import Link from 'next/link';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { recordKindList } from '@/lib/generated/record-registry';

export const metadata: Metadata = {
  title: 'Record kinds · Layers',
  description: 'Every pub.layers.* record type indexed by the appview.',
};

export default function KindsIndexPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Record kinds</h1>
        <p className="text-sm text-muted-foreground">
          All {recordKindList.length} record types indexed by Layers, generated from the lexicons
          via panproto.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recordKindList.map((kind) => (
          <li key={kind.slug}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <Link href={`/${kind.slug}`} className="text-base font-semibold hover:underline">
                  {kind.title}
                </Link>
                <p className="font-mono text-[11px] text-muted-foreground">{kind.nsid}</p>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {kind.description
                  ? truncate(kind.description, 180)
                  : `${kind.fields.length} fields.`}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
