// Planting windows are expressed in days relative to an anchor:
//   lastFrost  = average last spring frost
//   firstFrost = average first fall frost
// `from` and `to` are inclusive day offsets from the anchor (negative = before).
// They are rules of thumb for temperate climates, not agronomy gospel.

export const CROPS = [
  {
    id: 'peas',
    name: 'Peas',
    tip: 'Sow as soon as the soil can be worked. Pre-soaking seeds overnight speeds germination.',
    actions: [{ type: 'direct-sow', anchor: 'lastFrost', from: -42, to: -14 }],
  },
  {
    id: 'spinach',
    name: 'Spinach',
    tip: 'Bolts in heat, so favor the cool ends of the season.',
    actions: [
      { type: 'direct-sow', anchor: 'lastFrost', from: -42, to: -14 },
      { type: 'direct-sow', anchor: 'firstFrost', from: -56, to: -35 },
    ],
  },
  {
    id: 'lettuce',
    name: 'Lettuce',
    tip: 'Sow a short row every two weeks for a steady harvest.',
    actions: [
      { type: 'direct-sow', anchor: 'lastFrost', from: -28, to: 14 },
      { type: 'direct-sow', anchor: 'firstFrost', from: -56, to: -28 },
    ],
  },
  {
    id: 'radish',
    name: 'Radishes',
    tip: 'Ready in about a month. Good first crop for impatient gardeners.',
    actions: [
      { type: 'direct-sow', anchor: 'lastFrost', from: -35, to: 14 },
      { type: 'direct-sow', anchor: 'firstFrost', from: -42, to: -21 },
    ],
  },
  {
    id: 'kale',
    name: 'Kale',
    tip: 'Frost makes it sweeter. Harden seedlings off for a week before planting out.',
    actions: [
      { type: 'start-indoors', anchor: 'lastFrost', from: -63, to: -42 },
      { type: 'transplant', anchor: 'lastFrost', from: -21, to: 0 },
      { type: 'direct-sow', anchor: 'firstFrost', from: -90, to: -70 },
    ],
  },
  {
    id: 'broccoli',
    name: 'Broccoli',
    tip: 'Needs steady moisture. Plant out while nights are still cool.',
    actions: [
      { type: 'start-indoors', anchor: 'lastFrost', from: -63, to: -49 },
      { type: 'transplant', anchor: 'lastFrost', from: -21, to: 0 },
    ],
  },
  {
    id: 'carrots',
    name: 'Carrots',
    tip: 'Keep the seedbed damp until they sprout. That can take two or three weeks.',
    actions: [
      { type: 'direct-sow', anchor: 'lastFrost', from: -21, to: 14 },
      { type: 'direct-sow', anchor: 'firstFrost', from: -84, to: -70 },
    ],
  },
  {
    id: 'beets',
    name: 'Beets',
    tip: 'Each seed is really a cluster, so thin seedlings to one every few inches.',
    actions: [
      { type: 'direct-sow', anchor: 'lastFrost', from: -28, to: 7 },
      { type: 'direct-sow', anchor: 'firstFrost', from: -70, to: -56 },
    ],
  },
  {
    id: 'garlic',
    name: 'Garlic',
    tip: 'Plant cloves pointy side up, a few inches deep, and mulch well.',
    actions: [{ type: 'direct-sow', verb: 'Plant cloves of', anchor: 'firstFrost', from: -7, to: 21 }],
  },
  {
    id: 'tomato',
    name: 'Tomatoes',
    tip: 'Bury the stem deep when transplanting. It grows extra roots.',
    actions: [
      { type: 'start-indoors', anchor: 'lastFrost', from: -63, to: -42 },
      { type: 'transplant', anchor: 'lastFrost', from: 7, to: 21 },
    ],
  },
  {
    id: 'pepper',
    name: 'Peppers',
    tip: 'Slow starters that want warm soil. Do not rush them outside.',
    actions: [
      { type: 'start-indoors', anchor: 'lastFrost', from: -70, to: -56 },
      { type: 'transplant', anchor: 'lastFrost', from: 14, to: 28 },
    ],
  },
  {
    id: 'basil',
    name: 'Basil',
    tip: 'Dies at the first hint of frost. Wait for warm nights.',
    actions: [
      { type: 'start-indoors', anchor: 'lastFrost', from: -42, to: -28 },
      { type: 'transplant', anchor: 'lastFrost', from: 7, to: 21 },
    ],
  },
  {
    id: 'cucumber',
    name: 'Cucumbers',
    tip: 'Give them something to climb. A trellis saves space and straightens the fruit.',
    actions: [{ type: 'direct-sow', anchor: 'lastFrost', from: 7, to: 28 }],
  },
  {
    id: 'zucchini',
    name: 'Zucchini',
    tip: 'Two plants feed a family. Three feed a neighborhood.',
    actions: [{ type: 'direct-sow', anchor: 'lastFrost', from: 7, to: 28 }],
  },
  {
    id: 'beans',
    name: 'Bush beans',
    tip: 'Sow into warm soil, then sow again every few weeks for a longer harvest.',
    actions: [{ type: 'direct-sow', anchor: 'lastFrost', from: 7, to: 35 }],
  },
  {
    id: 'pumpkin',
    name: 'Pumpkins',
    tip: 'Plenty of room and a long season. Count back from your first frost.',
    actions: [{ type: 'direct-sow', anchor: 'lastFrost', from: 7, to: 21 }],
  },
];
