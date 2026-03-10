import { NextResponse } from 'next/server';

export function GET(): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_OAUTH_BASE_URL || 'https://layers.pub';

  const metadata = {
    client_id: `${baseUrl}/client-metadata.json`,
    client_name: 'Layers',
    client_uri: baseUrl,
    redirect_uris: [`${baseUrl}/callback`],
    scope: 'atproto transition:generic',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    dpop_bound_access_tokens: true,
  };

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=60',
      'Content-Type': 'application/json',
    },
  });
}
