import { NextResponse } from 'next/server';
import { loadSearchIndex } from '../../../lib/home/search-index';

// The index behind the type-ahead in the nav. Dynamic on purpose: it asks the backend, which
// must not happen at build time. A complete index is cached for five minutes by the browser and
// the CDN; an incomplete one (a warning is set) is not cached at all.
export const dynamic = 'force-dynamic';

export async function GET() {
  const index = await loadSearchIndex();
  return NextResponse.json(index, {
    headers: {
      'Cache-Control': index.warning ? 'no-store' : 'public, max-age=300, s-maxage=300',
    },
  });
}
