/**
 * Reusable empty state display for listing pages.
 *
 * @module
 */

import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** Optional Lucide icon component to display above the title. */
  icon?: LucideIcon;
  /** Title text describing the empty state. */
  title: string;
  /** Optional description with more context. */
  description?: string;
  /** Optional action element (e.g., a create button). */
  action?: React.ReactNode;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon ? (
        <div className="mb-4 rounded-full bg-muted p-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export type { EmptyStateProps };
export { EmptyState };
