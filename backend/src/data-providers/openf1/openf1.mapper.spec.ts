// Legacy compatibility: the legacy adapter keeps issuing openf1-* IDs that
// existing deep links depend on. These shapes must not change in phase 1.

import { OpenF1Mapper } from './openf1.mapper';
import type { OpenF1Meeting, OpenF1Session } from './openf1.types';

const meeting: OpenF1Meeting = {
  meeting_key: 1255,
  meeting_name: 'Chinese Grand Prix',
  meeting_official_name: 'FORMULA 1 CHINESE GRAND PRIX 2025',
  location: 'Shanghai',
  country_name: 'China',
  circuit_short_name: 'Shanghai',
  year: 2025,
  date_start: '2025-03-21T03:30:00+00:00',
  date_end: '2025-03-23T09:00:00+00:00',
  is_cancelled: false,
};

const fp1: OpenF1Session = {
  session_key: 9988,
  session_type: 'Practice',
  session_name: 'Practice 1',
  date_start: '2025-03-21T03:30:00+00:00',
  date_end: '2025-03-21T04:30:00+00:00',
  meeting_key: 1255,
  circuit_short_name: 'Shanghai',
  country_name: 'China',
  location: 'Shanghai',
  year: 2025,
  is_cancelled: false,
};

describe('OpenF1Mapper (legacy)', () => {
  it('keeps legacy event/session ID formats and top-level fields', () => {
    const event = new OpenF1Mapper().mapMeetingAndSessionsToEvent(meeting, [
      fp1,
    ]);
    expect(event.id).toBe('openf1-1255');
    expect(event.sessions[0].id).toBe('openf1-session-9988');
    expect(event.sessions[0].eventId).toBe('openf1-1255');
    expect(Object.keys(event).sort()).toEqual([
      'country',
      'dateEnd',
      'dateStart',
      'eventName',
      'id',
      'location',
      'season',
      'series',
      'sessions',
      'venueName',
    ]);
    expect(Object.keys(event.sessions[0]).sort()).toEqual([
      'category',
      'endTime',
      'eventId',
      'id',
      'name',
      'startTime',
      'status',
    ]);
  });

  it('keeps legacy category mapping (sprint qualifying is categorized as sprint)', () => {
    const mapper = new OpenF1Mapper();
    expect(
      mapper.mapSessionTypeToCategory('Qualifying', 'Sprint Qualifying'),
    ).toBe('sprint');
    expect(mapper.mapSessionTypeToCategory('Practice', 'Practice 1')).toBe(
      'practice',
    );
    expect(mapper.mapSessionTypeToCategory('Race', 'Race')).toBe('race');
  });
});
