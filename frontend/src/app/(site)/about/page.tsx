import Link from 'next/link';
import { PageColumn, PageHeader, Panel, Prose, linkClass } from '../../../components/home/page-parts';
import { routes } from '../../../lib/home/routes';

export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <PageColumn>
      <PageHeader title="About OpenGP" />
      <Panel>
        <Prose>
          <p>
            OpenGP is a place to follow motorsport: what is on this week, when it starts in your time, and how
            it ended. It starts with schedules and sessions across racing series, and grows towards results,
            standings and finding racing to go to.
          </p>
          <p>
            The service is in early development. Formula 1 schedules and sessions work today. Results,
            standings and other series come later, and some pages are still plain.
          </p>
          <p>
            “Open” means racing that anyone can join, host or watch. The data comes from open sources; see{' '}
            <Link href={routes.data} className={linkClass}>About our data</Link>.
          </p>
        </Prose>
      </Panel>
    </PageColumn>
  );
}
