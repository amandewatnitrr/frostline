import { test } from 'node:test';
import assert from 'node:assert/strict';

import { plan, parseIsoDate, parseMonthDay, formatIsoDate } from '../public/js/planner.js';

const base = { lastFrost: '04-30', firstFrost: '10-15' };

function find(tasks, cropId, type) {
  return tasks.find((t) => t.cropId === cropId && t.type === type);
}

test('parseIsoDate accepts real dates and rejects impossible ones', () => {
  assert.equal(formatIsoDate(parseIsoDate('2026-04-02')), '2026-04-02');
  assert.throws(() => parseIsoDate('2026-02-30'), RangeError);
  assert.throws(() => parseIsoDate('04/02/2026'), RangeError);
  assert.throws(() => parseIsoDate(undefined), RangeError);
});

test('parseMonthDay validates MM-DD', () => {
  assert.deepEqual(parseMonthDay('04-30'), { month: 4, day: 30 });
  assert.throws(() => parseMonthDay('13-01'), RangeError);
  assert.throws(() => parseMonthDay('4-30'), RangeError);
});

test('an open window is reported as "now" with the right bounds', () => {
  // Peas: direct-sow from 42 to 14 days before 04-30, i.e. 03-19 to 04-16.
  const peas = find(plan({ ...base, date: '2026-04-02' }), 'peas', 'direct-sow');
  assert.equal(peas.status, 'now');
  assert.equal(peas.start, '2026-03-19');
  assert.equal(peas.end, '2026-04-16');
  assert.equal(peas.daysLeft, 14);
  assert.equal(peas.closing, false);
});

test('a window ending within a week is flagged as closing, and sorts first', () => {
  // Basil indoors: 42 to 28 days before 04-30, i.e. 03-19 to 04-02 (inclusive).
  const tasks = plan({ ...base, date: '2026-04-02' });
  const basil = find(tasks, 'basil', 'start-indoors');
  assert.equal(basil.status, 'now');
  assert.equal(basil.daysLeft, 0);
  assert.equal(basil.closing, true);
  assert.equal(tasks[0].closing, true);
});

test('a window opening within two weeks is reported as "soon"', () => {
  // Tomato transplant opens 7 days after 04-30, i.e. 05-07: 5 days after 05-02.
  const tomato = find(plan({ ...base, date: '2026-05-02' }), 'tomato', 'transplant');
  assert.equal(tomato.status, 'soon');
  assert.equal(tomato.start, '2026-05-07');
  assert.equal(tomato.daysUntilStart, 5);
});

test('windows far from today are left out', () => {
  const tasks = plan({ ...base, date: '2026-01-10' });
  assert.equal(find(tasks, 'pumpkin', 'direct-sow'), undefined);
  assert.equal(find(tasks, 'cucumber', 'direct-sow'), undefined);
});

test('fall windows are anchored on the first frost', () => {
  // Garlic: 7 days before to 21 days after 10-15, i.e. 10-08 to 11-05.
  const garlic = find(plan({ ...base, date: '2026-10-10' }), 'garlic', 'direct-sow');
  assert.equal(garlic.status, 'now');
  assert.equal(garlic.verb, 'Plant cloves of');
  assert.equal(garlic.end, '2026-11-05');
});

test('windows that cross New Year are found', () => {
  // Frost on 01-10: a window starting 14 days before runs from 12-27 of the previous year.
  const crops = [
    {
      id: 'test',
      name: 'Test crop',
      tip: 'x',
      actions: [{ type: 'direct-sow', anchor: 'lastFrost', from: -14, to: 14 }],
    },
  ];
  const tasks = plan({ date: '2026-01-02', lastFrost: '01-10', firstFrost: '07-01', crops });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].status, 'now');
  assert.equal(tasks[0].start, '2025-12-27');

  const early = plan({ date: '2025-12-30', lastFrost: '01-10', firstFrost: '07-01', crops });
  assert.equal(early[0].status, 'now');
  assert.equal(early[0].end, '2026-01-24');
});

test('southern-hemisphere calendars work (first frost before last frost in the year)', () => {
  const tasks = plan({ date: '2026-08-20', lastFrost: '09-20', firstFrost: '05-10' });
  const peas = find(tasks, 'peas', 'direct-sow');
  assert.equal(peas.status, 'now');
});

test('bad input throws RangeError', () => {
  assert.throws(() => plan({ ...base, date: 'nope' }), RangeError);
  assert.throws(() => plan({ date: '2026-04-02', lastFrost: 'x', firstFrost: '10-15' }), RangeError);
});
