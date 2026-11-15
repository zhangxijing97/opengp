import { notFound } from 'next/navigation';
import { PageColumn, PageHeader, Panel } from '../../../../components/home/page-parts';
import { LEGAL_PAGES, LEGAL_SLUGS, isLegalSlug } from './legal-content';

// Only the five footer pages exist; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: isLegalSlug(slug) ? LEGAL_PAGES[slug].title : 'Not found' };
}

export default async function LegalPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();
  const page = LEGAL_PAGES[slug];
  return (
    <PageColumn>
      <PageHeader title={page.title} />
      <div className="grid gap-4">
        {page.draft ? (
          <p className="text-row-meta rounded-control border border-border-default bg-brand-amber-light p-3 text-text-amber">
            Draft for review. This text describes how the app works; a lawyer has not reviewed it.
          </p>
        ) : null}
        <Panel>
          <div className="text-footer-body grid gap-4">{page.body}</div>
        </Panel>
      </div>
    </PageColumn>
  );
}
