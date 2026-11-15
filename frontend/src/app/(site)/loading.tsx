import { PageColumn } from '../../components/home/page-parts';
import { SkeletonRows } from '../../components/home/states';

export default function Loading() {
  return (
    <PageColumn>
      <h1 className="sr-only">Loading</h1>
      <SkeletonRows count={5} />
    </PageColumn>
  );
}
