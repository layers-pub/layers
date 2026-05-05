# Setting up ATProto OAuth Permission Sets

Notes from getting `include:<nsid>` permission sets to work end-to-end with bsky.social as the authorization server. Most of the failure modes here are silent — you get a generic "Could not resolve Lexicon for NSID" or, worse, an empty consent screen — so the path of least pain is to know all the moving parts up front.

## What a permission set is

An OAuth scope of the form `include:<nsid>` tells the auth server to fetch a published Lexicon record at that NSID, expand it into individual `repo:`/`rpc:`/`blob:` permissions, and present them in the consent UI as a single named bundle. The Lexicon record's `defs.main.type` is `permission-set`. Bluesky's own example: `chat.bsky.authFullChatClient`.

The benefit over per-collection scopes: one human-readable consent prompt ("Full Access to MyApp"), and the permission contents can be edited by republishing the lexicon record, without re-prompting existing users.

## The five things that have to all be true

For `include:<nsid>` to work, every one of these must hold. The OAuth flow fails (often silently) if any single one is missing.

### 1. The permission set's NSID must be exactly three segments

This is non-obvious and was the single most expensive lesson learned.

`@atproto/oauth-scopes/IncludeScope.isAllowedPermission` enforces that every `lxm` and `collection` listed inside a permission set must start with the **group prefix** of the permission set's own NSID — defined as everything up to and including the last dot.

| Permission-set NSID | Group prefix | What it can authorize |
|---|---|---|
| `chat.bsky.authFullChatClient` | `chat.bsky.` | the entire `chat.bsky.*` namespace |
| `pub.chive.auth.fullAccess` | `pub.chive.auth.` | only `pub.chive.auth.*` (which doesn't host real APIs) |
| `pub.chive.fullAccess` | `pub.chive.` | the entire `pub.chive.*` namespace ✓ |

If the permission set is too deeply nested (4+ segments), every `lxm` and `collection` it lists silently fails the `isAllowedPermission` check, the permissions array yields nothing, and **the consent UI happily renders an empty bucket list under your title**. There is no error.

**Rule: name your permission sets at the same depth as your namespace's third segment.** For `pub.layers.*` lexicons, name permission sets `pub.layers.basicReader`, `pub.layers.fullAccess`, etc. Not `pub.layers.scopes.*` or `pub.layers.auth.*`.

### 2. The lexicon record must live on a real signing PDS

`@atproto/lex-resolver.fetch` doesn't just GET the record over HTTP — it calls `com.atproto.sync.getRecord` (note: `sync`, not `repo`), gets back a CAR containing a signed Merkle commit, and verifies the signature against the `atproto` `verificationMethod` in the DID document.

This means a "fake PDS" that serves lexicon records via a static `com.atproto.repo.getRecord` endpoint, with no signing key in its DID doc, **cannot host permission sets** — even if the records themselves are perfectly valid. The resolver fails at the proof verification step with `Failed to verify Lexicon record proof`, and the OAuth provider surfaces it as `Could not resolve Lexicon for NSID`.

**The fix is to publish lexicons on a real `did:plc` account on a real PDS** (PDS distribution e.g. `bsky.social`, your own self-hosted PDS, etc.). The DID document must include the `atproto` `verificationMethod` and `atproto_pds` service endpoint. `did:web` works in principle, but most apps stand up `did:web` for their service identity without provisioning a signing key or implementing the full repo + sync APIs.

A one-shot publish script:

```js
// publish-permission-sets.mjs
import { readFileSync } from 'node:fs';

const PDS = 'https://your-pds.example.com';
const session = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ identifier: 'lexicons.example.com', password: PASSWORD }),
}).then((r) => r.json());

for (const file of ['basicReader.json', 'fullAccess.json']) {
  const lex = JSON.parse(readFileSync(`./lexicons/pub/myapp/${file}`, 'utf8'));
  await fetch(`${PDS}/xrpc/com.atproto.repo.putRecord`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.accessJwt}` },
    body: JSON.stringify({
      repo: session.did,
      collection: 'com.atproto.lexicon.schema',
      rkey: lex.id,                  // e.g. pub.myapp.fullAccess
      record: { ...lex, $type: 'com.atproto.lexicon.schema' },
      validate: false,
    }),
  });
}
```

### 3. DNS TXT record at `_lexicon.<authority>` (and only one)

For NSID `pub.myapp.fullAccess`:

- `name = 'fullAccess'`, `authority = 'myapp.pub'` (segments minus the last, reversed)
- Resolver looks up TXT at `_lexicon.myapp.pub`
- Expected value: `did=did:plc:...` (single record)

Two pitfalls:

- **NSID resolution is exact, not walking.** It does NOT walk parent zones. For `pub.myapp.foo.bar` the resolver looks up `_lexicon.foo.myapp.pub`, period. So if you publish `pub.myapp.fullAccess` and `pub.myapp.foo.something`, you need separate TXT records at `_lexicon.myapp.pub` and `_lexicon.foo.myapp.pub`.
- **Multiple TXT records cause `Multiple DIDs found in DNS TXT records`.** When migrating from one DID to another, delete the old record before adding the new — don't run them in parallel. The chive.pub SOA negative-cache TTL is 300s; budget that.

### 4. The lexicon record's structure must match what the consent UI expects

Bsky's UI renders a permission only if the shape matches. Things that look "valid" but don't render:

| Wrong | Right |
|---|---|
| `"lxm": "pub.x.foo"` (string) | `"lxm": ["pub.x.foo", "pub.x.bar"]` (array) |
| `"collection": "pub.x.foo"` | `"collection": ["pub.x.foo"]` |
| Missing `action` on a repo permission | `"action": ["create", "update", "delete"]` |
| Missing `inheritAud` on rpc | `"inheritAud": true` (lets the audience flow from the `include:?aud=` query) |
| Top-level `description` | Top-level `title` + `detail` |
| Top-level `includes: [...]` | **Inline** all transitively-included permissions; `includes` is not part of the meta-schema and is silently dropped |
| Top-level `revision: N` | Drop it |

Reference shape (modeled on `chat.bsky.authFullChatClient`):

```json
{
  "lexicon": 1,
  "id": "pub.myapp.fullAccess",
  "defs": {
    "main": {
      "type": "permission-set",
      "title": "Full Access to MyApp",
      "detail": "All MyApp operations including XYZ.",
      "permissions": [
        {
          "type": "permission",
          "resource": "repo",
          "action": ["create", "update", "delete"],
          "collection": [
            "pub.myapp.foo.record",
            "pub.myapp.bar.record"
          ]
        },
        {
          "type": "permission",
          "resource": "rpc",
          "inheritAud": true,
          "lxm": [
            "pub.myapp.foo.getThing",
            "pub.myapp.foo.searchThings",
            "pub.myapp.bar.listOther"
          ]
        },
        {
          "type": "permission",
          "resource": "blob",
          "accept": ["application/*", "image/*"]
        }
      ]
    }
  }
}
```

### 5. Every NSID inside `permissions[].lxm` and `permissions[].collection` must reference a lexicon that actually exists

If you list a phantom NSID (typo, or an internal collection you write to but never wrote a lexicon JSON for), the namespace-prefix check still passes, but bsky.social's resolver will fail to locate the referenced lexicon when it tries to render the consent UI per-permission, and (depending on bsky.social internals) may silently drop the entire permission bucket.

**Validate before publishing.** A small script that walks `lexicons/**.json`, builds a set of all real NSIDs, and reports any phantom references in your permission sets is worth the 30 lines of code.

```js
// find-missing.mjs (sketch)
const existing = new Set(/* all lex.id from lexicons/**.json */);
for (const setFile of permissionSetFiles) {
  const lex = JSON.parse(readFileSync(setFile, 'utf8'));
  for (const p of lex.defs.main.permissions ?? []) {
    for (const id of [].concat(p.lxm ?? [], p.collection ?? [])) {
      if (!existing.has(id)) console.log(`PHANTOM ${setFile} -> ${id}`);
    }
  }
}
```

## Verifying end-to-end without involving bsky.social

`@atproto/lex-resolver` is the same library bsky's OAuth provider uses. Local verification:

```js
import { LexResolver } from '@atproto/lex-resolver';
const r = new LexResolver({});
const result = await r.get('pub.myapp.fullAccess', { noCache: true });
console.log(result.lexicon.defs.main.type); // 'permission-set'
```

If this throws, bsky will too. If it succeeds, the resolution chain is correct and any remaining issue is in the lexicon record's *content* (rule 4 or 5 above).

## Useful debugging surface

When the consent screen shows your title + detail but no permissions:
- Almost always rule 1 (4-segment NSID) or rule 5 (phantom NSID).
- Title/detail render even if the permission list is empty, so don't take their appearance as a sign of success.

When you get `Could not resolve Lexicon for NSID`:
- Verify rule 2: `await new LexResolver({}).get(nsid)` locally.
- Verify rule 3: `dig +short TXT _lexicon.<authority>` — check it returns exactly one `did=...` line.
- Verify the DID's PDS implements `com.atproto.sync.getRecord` and the DID doc has `verificationMethod[0].id = '<did>#atproto'`.

When you get `OAuth "invalid_scope"`:
- The bsky.social server rejected the scope before opening a consent screen — usually rule 3 (DNS) or the lexicon failing the loose meta-schema check. Test with `LexResolver.get` first; if that succeeds, the scope itself is well-formed.

## DNS hygiene at migration time

Migrating an `_lexicon.<authority>` from `did:web:foo` to `did:plc:bar`:

1. Add the new TXT record.
2. **Delete the old TXT record** (don't leave both — the resolver throws "Multiple DIDs found in DNS TXT records").
3. Wait at least the parent SOA negative-cache TTL (`dig SOA <zone>` — fifth field). Bluesky's resolvers do cache.
4. Confirm with `dig +short TXT _lexicon.<authority> @8.8.8.8 @1.1.1.1`.

## Source references

When in doubt, read these instead of guessing:

- `@atproto/oauth-scopes`, `dist/scopes/include-scope.js` — `buildPermissions`, `isAllowedPermission`, `isParentAuthorityOf`. The namespace-prefix rule lives here.
- `@atproto/lex-resolver`, `dist/lex-resolver.js` — `resolveLexiconAuthority`, `fetchLexiconUri`. DNS lookup, DID resolution, signed proof verification.
- `@atproto/oauth-provider-ui`, `dist/messages-*.js` — every consent-page string. If you can't find the human-readable label you're hoping to see, it doesn't exist and you're being filtered out elsewhere.
- `@atproto/lexicon`, `src/types.ts` — `lexPermissionSet`, `lexPermission`. The Zod schema is loose (single string vs array both type-check), but bsky's UI is strict; mirror Bluesky's published examples.

## Layers-specific note

When the time comes to publish `include:` scopes for the Layers protocol, the same five rules apply. Plan ahead:

- Pick three-segment names: `pub.layers.basicReader`, `pub.layers.fullAccess`, etc.
- Plan to host them on a real PDS (the layers governance PDS or a dedicated `lexicons.layers.pub` account), not a static `did:web`-served endpoint.
- One TXT record per second-level segment under `layers.pub` (e.g. `_lexicon.layers.pub`, `_lexicon.foo.layers.pub`, etc.) pointing at the publishing DID.
- Inline all permissions per set — no `includes`. Use arrays. Title + detail.
- Run the phantom-NSID validator in CI so a typo in a permission set fails the build instead of silently rendering an empty consent screen.
