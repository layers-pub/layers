#!/usr/bin/env node
/**
 * Publishes the six `pub.layers.auth*` permission-set lexicons to a
 * signing PDS so bsky.social's OAuth consent screen can resolve
 * `include:pub.layers.<tier>` scopes. See
 * `layers/notes/atproto-permission-sets.md` for the five rules every
 * publish must satisfy.
 *
 * Usage:
 *
 *   PDS=https://your-pds.example.com \
 *   IDENTIFIER=lexicons.layers.pub \
 *   PASSWORD=app-password \
 *   node layers/scripts/publish-permission-sets.mjs
 *
 * After publishing:
 *
 *   1. Add a single TXT record at `_lexicon.layers.pub` of the form
 *      `did=<the publishing DID>`. The session response from
 *      createSession contains the DID.
 *   2. Wait at least the parent SOA negative-cache TTL.
 *   3. Verify with `dig +short TXT _lexicon.layers.pub @8.8.8.8`.
 *   4. Verify resolution with
 *        `node -e "import('@atproto/lex-resolver').then(({LexResolver}) =>
 *           new LexResolver({}).get('pub.layers.authReadOnly', {noCache:true})
 *             .then(r => console.log(r.lexicon.defs.main.type)))"`
 *      (expects `permission-set`).
 *   5. Switch the OAuth login default in
 *      `layers/web/lib/auth/oauth-client.ts` from `'login-only'` to a
 *      tier that actually grants useful scope (`'read-only'` is the
 *      sane minimum for browsing).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LEX_DIR = join(__dirname, '..', 'lexicons', 'pub', 'layers');

const PDS = process.env.PDS ?? 'https://lexicons.layers.pub';
const IDENTIFIER = process.env.IDENTIFIER ?? 'lexicons.layers.pub';
const PASSWORD = process.env.PASSWORD;

if (!PASSWORD) {
  console.error('Missing required env PASSWORD (account password for ' + IDENTIFIER + ')');
  process.exit(1);
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    throw new Error(`${url} → ${res.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
  }
  return parsed;
}

async function main() {
  const session = await postJson(`${PDS}/xrpc/com.atproto.server.createSession`, {
    identifier: IDENTIFIER,
    password: PASSWORD,
  });
  console.log(`signed in as ${session.handle} (${session.did})`);

  const auth = { authorization: `Bearer ${session.accessJwt}` };
  const files = readdirSync(LEX_DIR).filter((f) => f.startsWith('auth') && f.endsWith('.json'));

  for (const file of files) {
    const lex = JSON.parse(readFileSync(join(LEX_DIR, file), 'utf8'));
    if (!lex.id || !lex.defs?.main) {
      console.warn(`skip ${file}: not a lexicon`);
      continue;
    }
    const result = await postJson(`${PDS}/xrpc/com.atproto.repo.putRecord`, {
      repo: session.did,
      collection: 'com.atproto.lexicon.schema',
      rkey: lex.id,
      record: { ...lex, $type: 'com.atproto.lexicon.schema' },
      validate: false,
    }, auth);
    console.log(`  put ${lex.id} → ${result.uri}`);
  }
  console.log(`\npublished ${files.length} permission sets.`);
  console.log(`\nNow add a DNS TXT at  _lexicon.layers.pub  with value  did=${session.did}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
