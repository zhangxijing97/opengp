import Link from 'next/link';
import { PageColumn, PageHeader, Panel, Prose, linkClass } from '../../../components/home/page-parts';
import { routes } from '../../../lib/home/routes';

export const metadata = { title: 'Sign in' };

// Accounts do not exist yet (HANDOFF.md section 3, "Following and sign-in": SIGN IN is a placeholder).
export default function SignInPage() {
  return (
    <PageColumn>
      <PageHeader title="Sign in" />
      <Panel>
        <Prose>
          <p>Accounts are not available yet, so there is nothing to sign in to.</p>
          <p>
            Your followed series and settings are saved in this browser. You can change them in{' '}
            <Link href={routes.settings} className={linkClass}>settings</Link>.
          </p>
        </Prose>
      </Panel>
    </PageColumn>
  );
}
