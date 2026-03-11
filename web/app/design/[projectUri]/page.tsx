/**
 * Project root page; redirects to the lexicons tab.
 *
 * @packageDocumentation
 */

import { redirect } from 'next/navigation';

interface ProjectPageProps {
  params: Promise<{ projectUri: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectUri } = await params;
  redirect(`/design/${projectUri}/lexicons`);
}
