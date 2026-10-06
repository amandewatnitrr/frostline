import { CROPS } from './crops.js';

const DAY_MS = 86_400_000;

/** A window that opens within this many days is reported as "soon". */
export const SOON_DAYS = 14;
/** A window that closes within this many days is flagged as closing. */
export const CLOSING_DAYS = 7;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_DAY = /^(\d{2})-(\d{2})$/;

const DEFAULT_VERBS = {
  'start-indoors': 'Start indoors',
  'direct-sow': 'Direct-sow',
  transplant: 'Transplant',
};

/** Parse "YYYY-MM-DD" to a UTC timestamp. Throws RangeError on anything else. */
export function parseIsoDate(value) {
  const match = typeof value === 'string' ? ISO_DATE.exec(value) : null;
  if (!match) throw new RangeError(`Invalid date "${value}". Use YYYY-MM-DD.`);
  const [year, month, day] = match.slice(1).map(Number);
  const time = Date.UTC(year, month - 1, day);
  const check = new Date(time);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid date "${value}". That day does not exist.`);
  }
  return time;
}

/** Parse "MM-DD" to { month, day }. Throws RangeError on anything else. */
export function parseMonthDay(value) {
  const match = typeof value === 'string' ? MONTH_DAY.exec(value) : null;
  if (!match) throw new RangeError(`Invalid frost date "${value}". Use MM-DD.`);
  const [month, day] = match.slice(1).map(Number);
  // 2000 is a leap year, so 02-29 is accepted.
  const check = new Date(Date.UTC(2000, month - 1, day));
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new RangeError(`Invalid frost date "${value}". That day does not exist.`);
  }
  return { month, day };
}

/** Format a UTC timestamp as "YYYY-MM-DD". */
export function formatIsoDate(time) {
  return new Date(time).toISOString().slice(0, 10);
}

/**
 * Find the window for one action that matters on `today`: the one that is open,
 * or failing that the one that opens soonest within SOON_DAYS. Anchors are
 * tried for the previous, current and next year so windows that straddle New
 * Year (and southern-hemisphere calendars) work.
 */
function findWindow(today, year, anchor, action) {
  let best = null;
  for (const y of [year - 1, year, year + 1]) {
    const anchorTime = Date.UTC(y, anchor.month - 1, anchor.day);
    const start = anchorTime + action.from * DAY_MS;
    const end = anchorTime + action.to * DAY_MS;

    let candidate = null;
    if (today >= start && today <= end) {
      candidate = { status: 'now', start, end };
    } else if (start > today && start - today <= SOON_DAYS * DAY_MS) {
      candidate = { status: 'soon', start, end };
    }

    if (candidate && (!best || (candidate.status === 'now' && best.status !== 'now'))) {
      best = candidate;
    }
  }
  return best;
}

function rank(item) {
  if (item.status === 'now') return item.closing ? 0 : 1;
  return 2;
}

/**
 * Work out what to plant around `date`.
 *
 * @param {object} input
 * @param {string} input.date       Today, "YYYY-MM-DD".
 * @param {string} input.lastFrost  Average last spring frost, "MM-DD".
 * @param {string} input.firstFrost Average first fall frost, "MM-DD".
 * @param {Array}  [input.crops]    Crop table; defaults to the built-in one.
 * @returns {Array} Tasks sorted closing-first, then open, then upcoming.
 */
export function plan({ date, lastFrost, firstFrost, crops = CROPS }) {
  const today = parseIsoDate(date);
  const anchors = {
    lastFrost: parseMonthDay(lastFrost),
    firstFrost: parseMonthDay(firstFrost),
  };
  const year = new Date(today).getUTCFullYear();

  const items = [];
  for (const crop of crops) {
    for (const action of crop.actions) {
      const hit = findWindow(today, year, anchors[action.anchor], action);
      if (!hit) continue;

      const daysLeft = Math.round((hit.end - today) / DAY_MS);
      items.push({
        cropId: crop.id,
        crop: crop.name,
        type: action.type,
        verb: action.verb ?? DEFAULT_VERBS[action.type],
        status: hit.status,
        closing: hit.status === 'now' && daysLeft <= CLOSING_DAYS,
        start: formatIsoDate(hit.start),
        end: formatIsoDate(hit.end),
        daysUntilStart: Math.max(0, Math.round((hit.start - today) / DAY_MS)),
        daysLeft,
        tip: crop.tip,
      });
    }
  }

  items.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.start.localeCompare(b.start) ||
      a.crop.localeCompare(b.crop),
  );
  return items;
}
