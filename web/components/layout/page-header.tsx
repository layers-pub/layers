/**
 * Reusable page header for listing and detail pages.
 *
 * @module
 */

interface PageHeaderProps {
  /** Page title. */
  title: string;
  /** Optional subtitle or description. */
  description?: string;
  /** Optional action element (e.g., a create button). */
  action?: React.ReactNode;
}

function PageHeader({ title, description, action }: PageHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 pb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export type { PageHeaderProps };
export { PageHeader };
