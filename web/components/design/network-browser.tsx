'use client';

/**
 * Network resource browser for discovering and forking published
 * resource collections from the ATProto network.
 *
 * @module
 */

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function NetworkBrowser(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Network Resources"
        description="Browse and fork published resource collections from other users"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Published Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Search for published resource collections on the ATProto network.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export { NetworkBrowser };
