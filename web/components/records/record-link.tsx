'use client';

import Link from 'next/link';

import { resolveKindFromUri } from '@/lib/generated/record-registry';
import { cn } from '@/lib/utils';

interface RecordLinkProps {
  readonly uri: string;
  readonly label?: string;
  readonly className?: string;
}

/**
 * Resolves an AT-URI to its generic detail route using the panproto-generated
 * registry. Unknown kinds fall back to rendering the raw URI.
 */
export function RecordLink({ uri, label, className }: RecordLinkProps): React.JSX.Element {
  const kind = resolveKindFromUri(uri);
  const encoded = encodeURIComponent(uri);
  const href = kind ? `/${kind.slug}/${encoded}` : null;
  const text = label ?? uri;

  if (!href) {
    return <span className={cn('font-mono text-xs text-muted-foreground', className)}>{text}</span>;
  }

  return (
    <Link
      href={href}
      className={cn(
        'font-mono text-xs text-primary underline-offset-2 hover:underline',
        className,
      )}
      title={uri}
    >
      {text}
    </Link>
  );
}
