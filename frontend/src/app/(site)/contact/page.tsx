import { PageColumn, PageHeader, Panel, Prose, linkClass } from '../../../components/home/page-parts';

export const metadata = { title: 'Contact' };

// The contact address is configuration, not code: set NEXT_PUBLIC_CONTACT_EMAIL. Until then the
// page says so instead of inventing an address. TODO(owner)
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const { topic } = await searchParams;
  const isData = (Array.isArray(topic) ? topic[0] : topic) === 'data';
  const subject = encodeURIComponent(isData ? 'OpenGP data issue' : 'OpenGP');

  return (
    <PageColumn>
      <PageHeader title={isData ? 'Report a data issue' : 'Contact'} />
      <Panel>
        <Prose>
          {isData ? (
            <p>
              Found a wrong time, a missing session or a mixed-up name? Tell us which series and event it is, the
              session, what you saw, and what you expected. A link to the page helps.
            </p>
          ) : (
            <p>Questions, ideas or problems with OpenGP are welcome.</p>
          )}
          {email ? (
            <p>
              <a href={`mailto:${email}?subject=${subject}`} className={linkClass}>
                {email}
              </a>
            </p>
          ) : (
            <p className="text-text-secondary">Contact details are not set up yet.</p>
          )}
        </Prose>
      </Panel>
    </PageColumn>
  );
}
