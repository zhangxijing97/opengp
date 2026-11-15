import Link from 'next/link';
import { PageColumn, linkClass } from '../../components/home/page-parts';
import { EmptyState } from '../../components/home/states';
import { routes } from '../../lib/home/routes';

export default function NextNotFound() {
  return (
    <PageColumn>
      <EmptyState title="Page not found" level={1}>
        <p>
          That address does not exist.{' '}
          <Link href={routes.home} className={linkClass}>Go to the schedule</Link> or{' '}
          <Link href={routes.search} className={linkClass}>search</Link>.
        </p>
      </EmptyState>
    </PageColumn>
  );
}
