import {
  addDays,
  daysBetween,
  isCalendarDate,
  isoWeekRange,
  isoWeekday,
  startOfIsoWeek,
} from './calendar-date';

describe('calendar-date', () => {
  it('accepts only real YYYY-MM-DD dates', () => {
    expect(isCalendarDate('2024-02-29')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('2026-1-01')).toBe(false);
    expect(isCalendarDate('2026-10-26T00:00:00Z')).toBe(false);
    expect(isCalendarDate('0999-01-01')).toBe(false);
    expect(isCalendarDate('2100-02-29')).toBe(false);
    expect(isCalendarDate('2000-02-29')).toBe(true);
  });

  it('does day arithmetic across month, leap day and year boundaries', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(daysBetween('2026-10-26', '2026-11-02')).toBe(7);
    expect(daysBetween('2024-02-01', '2024-03-01')).toBe(29);
  });

  it('computes ISO weekdays and Monday week starts', () => {
    expect(isoWeekday('2026-10-26')).toBe(1);
    expect(isoWeekday('2026-11-01')).toBe(7);
    expect(startOfIsoWeek('2026-11-01')).toBe('2026-10-26');
    expect(startOfIsoWeek('2026-10-26')).toBe('2026-10-26');
  });

  it('builds Last/This/Next week as Monday-to-next-Monday ranges', () => {
    expect(isoWeekRange('2026-10-31')).toEqual({
      from: '2026-10-26',
      to: '2026-11-02',
    });
    expect(isoWeekRange('2026-10-31', -1)).toEqual({
      from: '2026-10-19',
      to: '2026-10-26',
    });
    expect(isoWeekRange('2026-10-31', 1)).toEqual({
      from: '2026-11-02',
      to: '2026-11-09',
    });
  });

  it('handles weeks that span a year change', () => {
    expect(isoWeekRange('2027-01-01')).toEqual({
      from: '2026-12-28',
      to: '2027-01-04',
    });
    expect(isoWeekRange('2027-01-04', -1)).toEqual({
      from: '2026-12-28',
      to: '2027-01-04',
    });
  });
});
