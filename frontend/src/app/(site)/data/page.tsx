import { PageColumn, PageHeader, Panel, Prose, linkClass } from '../../../components/home/page-parts';

export const metadata = { title: 'About our data' };

// Facts from docs/data-providers.md and docs/f1-data-providers.md (reviewed 2026-10-29).
export default function DataPage() {
  return (
    <PageColumn>
      <PageHeader title="About our data">Where the numbers come from, and what to be careful with.</PageHeader>
      <div className="grid gap-4">
        <Panel title="Sources">
          <Prose>
            <p>
              Formula 1 schedules come from{' '}
              <a href="https://github.com/jolpica/jolpica-f1" className={linkClass} rel="noopener noreferrer">
                Jolpica-F1
              </a>
              . Session details such as planned end times and cancellations come from{' '}
              <a href="https://openf1.org" className={linkClass} rel="noopener noreferrer">
                OpenF1
              </a>
              . Neither is an official Formula 1 or FIA service.
            </p>
            <p>
              Jolpica-F1 data is published under CC BY-NC-SA 4.0, for non-commercial use, with attribution and
              share-alike. OpenF1 is meant for personal and non-commercial projects and also cites CC BY-NC-SA 4.0;
              OpenGP credits it too. Images, logos and broadcast material are not covered by these licences.
            </p>
          </Prose>
        </Panel>
        <Panel title="What to expect">
          <Prose>
            <p>
              Whether a session is scheduled, in progress or completed is worked out from the schedule and the
              clock. It is not live timing, and can lag the real session.
            </p>
            <p>
              A time that is not known is shown as TBC, never as midnight. Results and standings are not available
              yet; when they arrive, a result that has not been published will say so, and will not be shown as
              an empty list.
            </p>
            <p>Series other than Formula 1 are listed but have no schedule yet.</p>
          </Prose>
        </Panel>
      </div>
    </PageColumn>
  );
}
