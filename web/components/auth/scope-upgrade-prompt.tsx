'use client';

/**
 * Prompt shown when a user action requires a higher Layers scope tier
 * than the one their current OAuth session was granted. Pairs with
 * `web/lib/auth/scope-profiles.ts`: surfacing the missing profile, a
 * one-line summary of what it grants, and a button that re-enters the
 * OAuth flow with that profile pre-selected.
 *
 * Usage:
 *
 * ```tsx
 * if (!hasProfile(session, 'annotator')) {
 *   return <ScopeUpgradePrompt required="annotator" reason="Creating an annotation" />;
 * }
 * ```
 */

import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  LAYERS_SCOPE_PROFILES,
  type LayersScopeProfile,
} from '@/lib/auth/scope-profiles';

export interface ScopeUpgradePromptProps {
  /** Profile the page action needs. */
  readonly required: LayersScopeProfile;
  /** Short verb-phrase summary of the user's action ("Creating an annotation"). */
  readonly reason: string;
  /**
   * Optional override for where to send the user. When omitted the
   * caller will be redirected to `/login?profile=<required>` which the
   * existing login page already understands.
   */
  readonly upgradeHref?: string;
}

export function ScopeUpgradePrompt({
  required,
  reason,
  upgradeHref,
}: ScopeUpgradePromptProps) {
  const definition = LAYERS_SCOPE_PROFILES[required];
  const href = upgradeHref ?? `/login?profile=${encodeURIComponent(required)}`;

  const onClick = useCallback(() => {
    window.location.href = href;
  }, [href]);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium">Additional permission required</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {reason} requires the <span className="font-medium">{definition.title}</span>{' '}
          permission profile.
        </p>
        <p className="text-sm">{definition.detail}</p>
        <Button onClick={onClick}>Re-authorize as {definition.title.toLowerCase()}</Button>
      </CardContent>
    </Card>
  );
}
