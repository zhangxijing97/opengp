// Legacy route regression: each of the six routes delegates to EventsService
// with its query parameters and returns the service value unwrapped (no
// {data, meta} envelope).

import { EventsController } from './events.controller';
import type { EventsService } from './events.service';

function makeController() {
  const service = {
    getEventsByDate: jest.fn().mockResolvedValue([{ id: 'today' }]),
    getUpcomingEvents: jest.fn().mockResolvedValue([{ id: 'upcoming' }]),
    getLiveEvents: jest.fn().mockResolvedValue([{ id: 'live' }]),
    getPastEvents: jest.fn().mockResolvedValue([{ id: 'past' }]),
    getEventById: jest.fn().mockResolvedValue({ id: 'openf1-1255' }),
    getSessionDetailById: jest.fn().mockResolvedValue({ classification: [] }),
  };
  const controller = new EventsController(service as unknown as EventsService);
  return { controller, service };
}

describe('EventsController (legacy routes)', () => {
  it('GET /events/today|upcoming|live|past pass date and series through', async () => {
    const { controller, service } = makeController();
    await expect(
      controller.getTodayEvents('2026-10-31', 'f1'),
    ).resolves.toEqual([{ id: 'today' }]);
    await expect(
      controller.getUpcomingEvents('2026-10-31', 'f1'),
    ).resolves.toEqual([{ id: 'upcoming' }]);
    await expect(
      controller.getLiveEvents(undefined, undefined),
    ).resolves.toEqual([{ id: 'live' }]);
    await expect(
      controller.getPastEvents('2026-10-31', undefined),
    ).resolves.toEqual([{ id: 'past' }]);
    expect(service.getEventsByDate).toHaveBeenCalledWith('2026-10-31', 'f1');
    expect(service.getUpcomingEvents).toHaveBeenCalledWith('2026-10-31', 'f1');
    expect(service.getLiveEvents).toHaveBeenCalledWith(undefined, undefined);
    expect(service.getPastEvents).toHaveBeenCalledWith('2026-10-31', undefined);
  });

  it('GET /events/:id and /sessions/:id/detail keep legacy IDs and unwrapped shapes', async () => {
    const { controller, service } = makeController();
    await expect(controller.getEventById('openf1-1255', 'f1')).resolves.toEqual(
      { id: 'openf1-1255' },
    );
    await expect(
      controller.getSessionDetail('openf1-session-9988', undefined),
    ).resolves.toEqual({ classification: [] });
    expect(service.getEventById).toHaveBeenCalledWith('openf1-1255', 'f1');
    expect(service.getSessionDetailById).toHaveBeenCalledWith(
      'openf1-session-9988',
      undefined,
    );
  });
});
