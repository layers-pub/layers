/**
 * Card component for displaying an expression in list views.
 *
 * @packageDocumentation
 */

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { encodeAtUri, formatRelativeTime, truncateText } from '@/lib/utils/format';

/**
 * Props for the ExpressionCard component.
 */
interface ExpressionCardProps {
  /** AT-URI of the expression record. */
  uri: string;
  /** Full text of the expression. */
  text: string;
  /** BCP-47 language code (e.g., "en", "de"). */
  language?: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/**
 * Renders a clickable card summarizing an expression.
 *
 * Displays a truncated text preview, an optional language badge, and a
 * relative timestamp. Links to the expression detail page.
 *
 * @example
 * ```tsx
 * <ExpressionCard
 *   uri="at://did:plc:abc/pub.layers.expression.expression/123"
 *   text="The cat sat on the mat."
 *   language="en"
 *   createdAt="2026-03-08T12:00:00Z"
 * />
 * ```
 */
function ExpressionCard({ uri, text, language, createdAt }: ExpressionCardProps) {
  const href = `/expressions/${encodeAtUri(uri)}`;

  return (
    <Link href={href} className="block transition-opacity hover:opacity-80">
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="min-w-0 truncate">{truncateText(text, 80)}</CardTitle>
            {language ? <Badge variant="secondary">{language}</Badge> : null}
          </div>
          <CardDescription>{formatRelativeTime(createdAt)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3 text-sm text-muted-foreground">{truncateText(text, 200)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export type { ExpressionCardProps };
export { ExpressionCard };
