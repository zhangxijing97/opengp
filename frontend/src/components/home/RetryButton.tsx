'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from './Button';

// Asks the server for the page again, keeping what is on screen until the new answer arrives.
export function RetryButton({ label = 'Try again' }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? 'Trying again…' : label}
    </Button>
  );
}
