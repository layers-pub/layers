import { redirect } from 'next/navigation';

/**
 * Permanent redirect from the legacy `/search` route to the new
 * `/discover` faceted-browse surface. The previous backend revamp
 * deleted the search-specific surface; cross-app discovery now lives
 * under `/discover`.
 */
export default function SearchPage(): never {
  redirect('/discover');
}
