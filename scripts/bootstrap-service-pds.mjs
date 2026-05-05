#!/usr/bin/env node
/**
 * Bootstraps the canonical account on the Layers service PDS.
 *
 * @remarks
 * Runs once after `docker compose up service-pds` is healthy. Creates
 * an account whose handle is the publishing identity for canonical
 * `pub.layers.*` records (permission sets, lens registry, ontology
 * seeds). The DID this account is assigned is the value that goes
 * into the `_lexicon.layers.pub` DNS TXT record.
 *
 * The script is idempotent: if the account already exists, it
 * reports the existing DID and exits cleanly.
 *
 * Usage:
 *
 *   PDS=https://lexicons.layers.pub \
 *   ADMIN_PASSWORD=$LAYERS_SERVICE_PDS_ADMIN_PASSWORD \
 *   HANDLE=lexicons.layers.pub \
 *   EMAIL=ops@layers.pub \
 *   PASSWORD=<account-password> \
 *   node layers/scripts/bootstrap-service-pds.mjs
 *
 * Output: prints the canonical DID and the DNS TXT line to add at
 * `_lexicon.layers.pub`.
 */

const PDS = process.env.PDS;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const HANDLE = process.env.HANDLE;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

for (const [k, v] of Object.entries({ PDS, ADMIN_PASSWORD, HANDLE, EMAIL, PASSWORD })) {
  if (!v) {
    console.error(`Missing required env: ${k}`);
    process.exit(1);
  }
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
  return { ok: res.ok, status: res.status, body: parsed };
}

async function main() {
  // Try signing in first — if the handle is already provisioned we
  // are done and can just report the DID.
  const signin = await postJson(`${PDS}/xrpc/com.atproto.server.createSession`, {
    identifier: HANDLE,
    password: PASSWORD,
  });
  if (signin.ok) {
    console.log(`already-provisioned`);
    console.log(`did:           ${signin.body.did}`);
    console.log(`handle:        ${signin.body.handle}`);
    console.log(`access_token:  ${signin.body.accessJwt.slice(0, 20)}…`);
    return signin.body.did;
  }

  // Mint an admin invite code so we can register the canonical handle.
  const adminAuth = {
    authorization: `Basic ${Buffer.from(`admin:${ADMIN_PASSWORD}`).toString('base64')}`,
  };
  const invite = await postJson(
    `${PDS}/xrpc/com.atproto.server.createInviteCode`,
    { useCount: 1 },
    adminAuth,
  );
  if (!invite.ok) {
    throw new Error(
      `createInviteCode failed: ${invite.status} ${JSON.stringify(invite.body)}`,
    );
  }

  const created = await postJson(`${PDS}/xrpc/com.atproto.server.createAccount`, {
    email: EMAIL,
    handle: HANDLE,
    password: PASSWORD,
    inviteCode: invite.body.code,
  });
  if (!created.ok) {
    throw new Error(
      `createAccount failed: ${created.status} ${JSON.stringify(created.body)}`,
    );
  }

  console.log(`provisioned`);
  console.log(`did:           ${created.body.did}`);
  console.log(`handle:        ${created.body.handle}`);
  console.log('');
  console.log(`add this DNS TXT record at _lexicon.layers.pub:`);
  console.log(`  did=${created.body.did}`);
  return created.body.did;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
