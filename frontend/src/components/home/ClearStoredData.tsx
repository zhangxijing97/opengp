'use client';

import { useState } from 'react';
import { followingStore } from '../../lib/client-state/following';
import { settingsStore } from '../../lib/client-state/settings';
import { Button } from './Button';

// Removes the two things OpenGP stores in the browser. Two steps, so it cannot happen by accident.
export function ClearStoredData() {
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  return (
    <div>
      {confirming ? (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              settingsStore.clear();
              followingStore.clear();
              setConfirming(false);
              setCleared(true);
            }}
          >
            CLEAR NOW
          </Button>
          <button type="button" onClick={() => setConfirming(false)} className="text-footer-body underline underline-offset-2">
            Cancel
          </button>
        </div>
      ) : (
        <Button
          onClick={() => {
            setCleared(false);
            setConfirming(true);
          }}
        >
          CLEAR DATA
        </Button>
      )}
      <p role="status" className="text-caption mt-2 text-text-secondary">
        {cleared ? 'Stored data cleared.' : ''}
      </p>
    </div>
  );
}
