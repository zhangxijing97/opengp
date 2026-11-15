import { PageColumn, PageHeader } from '../../../components/home/page-parts';
import { SettingsForm } from './SettingsForm';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <PageColumn>
      <PageHeader title="Settings">Saved in this browser. There are no accounts yet.</PageHeader>
      <SettingsForm />
    </PageColumn>
  );
}
