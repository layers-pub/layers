'use client';

/**
 * Scope picker component for the login page.
 *
 * Lets the user select a Layers permission profile before the OAuth redirect.
 * Each profile corresponds to a `dev.idiolect`-style `include:`
 * reference that bundles the right set of granular permissions. See
 * `web/lib/auth/scope-profiles.ts` for the profile catalog.
 */

import { useId, useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  LAYERS_SCOPE_PROFILES,
  type LayersScopeProfile,
} from '@/lib/auth/scope-profiles';

const PROFILE_ORDER: readonly LayersScopeProfile[] = [
  'login-only',
  'read-only',
  'annotator',
  'corpus-manager',
  'ontology-editor',
  'experimenter',
  'full',
];

interface ScopePickerProps {
  readonly value: LayersScopeProfile;
  readonly onChange: (next: LayersScopeProfile) => void;
}

export function ScopePicker({ value, onChange }: ScopePickerProps): React.JSX.Element {
  const groupId = useId();
  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium">What should the app be able to do?</p>
        <p className="text-xs text-muted-foreground">
          Pick the narrowest profile you need. You can upgrade later without losing your session.
        </p>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as LayersScopeProfile)}
          aria-label="Permission profile"
        >
          {PROFILE_ORDER.map((profile) => {
            const def = LAYERS_SCOPE_PROFILES[profile];
            const itemId = `${groupId}-${profile}`;
            return (
              <div key={profile} className="flex items-start gap-3 py-2">
                <RadioGroupItem id={itemId} value={profile} />
                <Label htmlFor={itemId} className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{def.title}</span>
                  <span className="text-xs text-muted-foreground">{def.detail}</span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export function DefaultProfileState(): {
  profile: LayersScopeProfile;
  setProfile: (p: LayersScopeProfile) => void;
} {
  const [profile, setProfile] = useState<LayersScopeProfile>('login-only');
  return { profile, setProfile };
}
