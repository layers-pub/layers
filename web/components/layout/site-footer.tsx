/**
 * Site-wide footer with links and copyright.
 *
 * @module
 */

import Link from 'next/link';

function SiteFooter(): React.JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          &copy; {year} Layers. Built on{' '}
          <Link
            href="https://atproto.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            AT Protocol
          </Link>
          .
        </p>
        <nav className="flex items-center gap-4">
          <Link
            href="https://github.com/layers-pub/layers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            GitHub
          </Link>
          <Link
            href="/docs"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Docs
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export { SiteFooter };
