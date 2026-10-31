// Documents legacy EventsService routing. The aggregate path still drops a
// failing provider (pre-existing behaviour kept for compatibility); the new
// /api/v1 code paths do not do this.

import type { RacingDataProviderRegistry } from '../data-providers/racing-data-provider.registry';
import { EventsService } from './events.service';
import type { Event } from './types';

function provider(seriesIds: string[], events: Event[] | Error) {
  const result = () =>
    events instanceof Error ? Promise.reject(events) : Promise.resolve(events);
  return {
    supportedSeriesIds: seriesIds,
    getEventsByDate: jest.fn(result),
    getUpcomingEvents: jest.fn(result),
    getLiveEvents: jest.fn(result),
    getPastEvents: jest.fn(result),
    getEventById: jest.fn(),
    getSessionDetailById: jest.fn().mockResolvedValue(null),
  };
}

const event = (id: string) => ({ id }) as unknown as Event;

describe('EventsService (legacy)', () => {
  it('routes a series request to the registry provider for that series', async () => {
    const f1 = provider(['f1'], [event('openf1-1255')]);
    const registry = {
      getProvider: jest.fn().mockReturnValue(f1),
      getAllProviders: jest.fn(),
    };
    const service = new EventsService(
      registry as unknown as RacingDataProviderRegistry,
    );
    await expect(service.getEventsByDate('2026-10-31', 'f1')).resolves.toEqual([
      event('openf1-1255'),
    ]);
    expect(registry.getProvider).toHaveBeenCalledWith('f1');
    expect(f1.getEventsByDate).toHaveBeenCalledWith({
      date: '2026-10-31',
      seriesId: 'f1',
    });
  });

  it('aggregates all providers per supported series when no series is given', async () => {
    const f1 = provider(['f1'], [event('a')]);
    const other = provider(['motogp', 'indycar'], [event('b')]);
    const registry = {
      getProvider: jest.fn(),
      getAllProviders: jest.fn().mockReturnValue([f1, other]),
    };
    const service = new EventsService(
      registry as unknown as RacingDataProviderRegistry,
    );
    const events = await service.getUpcomingEvents('2026-10-31');
    expect(events.map((item) => item.id)).toEqual(['a', 'b', 'b']);
    expect(other.getUpcomingEvents).toHaveBeenCalledTimes(2);
  });

  it('keeps the pre-existing legacy behaviour of omitting a failing provider', async () => {
    const ok = provider(['f1'], [event('a')]);
    const failing = provider(['motogp'], new Error('down'));
    const registry = {
      getProvider: jest.fn(),
      getAllProviders: jest.fn().mockReturnValue([ok, failing]),
    };
    const service = new EventsService(
      registry as unknown as RacingDataProviderRegistry,
    );
    await expect(service.getEventsByDate('2026-10-31')).resolves.toEqual([
      event('a'),
    ]);
  });

  it('defaults detail lookups to f1 for legacy deep links', async () => {
    const f1 = provider(['f1'], []);
    const registry = {
      getProvider: jest.fn().mockReturnValue(f1),
      getAllProviders: jest.fn(),
    };
    const service = new EventsService(
      registry as unknown as RacingDataProviderRegistry,
    );
    await service.getSessionDetailById('openf1-session-9988');
    expect(registry.getProvider).toHaveBeenCalledWith('f1');
    expect(f1.getSessionDetailById).toHaveBeenCalledWith({
      id: 'openf1-session-9988',
      seriesId: 'f1',
    });
  });
});
