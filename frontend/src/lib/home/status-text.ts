import type { Availability, Lifecycle, LifecycleBasis, RoundStatus } from '../api-v1/types';

// Plain wording for statuses and result availability (HANDOFF.md section 3, "Result availability
// to UI"). No result is ever implied: when the data is not there, the text says so.

export function lifecycleLabel(status: Lifecycle): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'postponed':
      return 'Postponed';
    default:
      return 'Status unknown';
  }
}

export function roundStatusLabel(status: RoundStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'ongoing':
      return 'Under way';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Status unknown';
  }
}

/** Shown wherever a status was worked out from the clock. */
export function basisNote(basis: LifecycleBasis): string | null {
  return basis === 'time_inferred'
    ? 'Status is worked out from the schedule and the clock. It is not live timing.'
    : null;
}

export function resultNote(availability: Availability): string {
  switch (availability) {
    case 'available':
      return 'Results are available.';
    case 'partial':
      return 'Some results are available.';
    case 'not_published':
      return 'Results are not published yet.';
    case 'unsupported':
      return 'Results are not available for this session.';
    case 'not_applicable':
      return 'This session has no results.';
    case 'access_restricted':
      return 'The data provider restricts these results.';
    case 'upstream_error':
      return 'Results could not be loaded.';
    default:
      return 'Results are not available in OpenGP yet.';
  }
}
