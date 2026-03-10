/**
 * Annotation workspace page (server component).
 *
 * Catch-all route for expression AT-URIs. Renders the three-panel
 * workspace for browsing annotations on an expression.
 *
 * @remarks
 * URL format: /workspace/at://did:plc:abc/pub.layers.expression.expression/123
 * The AT-URI is reconstructed from the catch-all route segments via `decodeAtUri`.
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { createServerClient } from '@/lib/api/client';
import { decodeAtUri } from '@/lib/utils/format';

import WorkspaceLoading from './loading';
import { WorkspaceContent } from './workspace-content';

interface WorkspacePageProps {
  params: Promise<{ uri: string[] }>;
}

/**
 * Generates page metadata by fetching the expression title on the server.
 */
export async function generateMetadata({ params }: WorkspacePageProps): Promise<Metadata> {
  const { uri: segments } = await params;
  const uri = decodeAtUri(segments);

  if (!uri.startsWith('at://')) {
    return { title: 'Invalid URI' };
  }

  try {
    const serverApi = createServerClient({ revalidate: 60 });
    const { data } = await serverApi.GET('/xrpc/pub.layers.expression.getExpression', {
      params: { query: { uri } },
    });

    if (!data) {
      return { title: 'Expression Not Found' };
    }

    const text = data.value.text ?? '';
    const preview = text.length > 80 ? text.slice(0, 80) + '...' : text;

    return {
      title: `Workspace: ${preview || 'Expression'}`,
      description: preview ? `Annotation workspace for: ${preview}` : 'Annotation workspace.',
    };
  } catch {
    return { title: 'Workspace' };
  }
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { uri: segments } = await params;
  const uri = decodeAtUri(segments);

  if (!uri.startsWith('at://')) {
    notFound();
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <Suspense fallback={<WorkspaceLoading />}>
        <WorkspaceContent uri={uri} />
      </Suspense>
    </div>
  );
}
