/**
 * Main layout wrapper combining header, content area, and footer.
 *
 * @module
 */

import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';

function MainLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <SiteFooter />
    </>
  );
}

export { MainLayout };
