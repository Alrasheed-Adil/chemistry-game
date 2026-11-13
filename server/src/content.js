/**
 * Game content: prompts, telepathy grids, team names, avatars.
 * Everything here is plain data so it's easy to extend — add prompts freely.
 */

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ------------------------------------------------------------------ */
/* Sync / Questions mode                                               */
/* Each player answers for themselves AND predicts their partner.      */
/* ------------------------------------------------------------------ */

export const SYNC_PROMPTS = [
  // Know me — personal questions
  { category: 'Know Me', text: "What's your ultimate comfort food?" },
  { category: 'Know Me', text: "What's your go-to karaoke song?" },
  { category: 'Know Me', text: 'Dream vacation destination?' },
  { category: 'Know Me', text: "What's your most-used emoji?" },
  { category: 'Know Me', text: 'Which celebrity would you want to have dinner with?' },
  { category: 'Know Me', text: "First thing you'd buy if you won the lottery?" },
  { category: 'Know Me', text: "What's your biggest pet peeve?" },
  { category: 'Know Me', text: 'What would your autobiography be titled?' },
  { category: 'Know Me', text: 'Perfect way to spend a lazy Sunday?' },
  { category: 'Know Me', text: "What's your most irrational fear?" },
  { category: 'Know Me', text: 'If you were an animal, which one would you be?' },
  { category: 'Know Me', text: 'The perfect pizza topping?' },
  { category: 'Know Me', text: 'A smell that instantly makes you happy?' },
  { category: 'Know Me', text: 'Which decade would you time-travel to?' },
  { category: 'Know Me', text: 'All-time favorite movie?' },
  { category: 'Know Me', text: 'Which superpower would you pick?' },
  { category: 'Know Me', text: "What's your coffee (or tea) order?" },
  { category: 'Know Me', text: 'What would you name a pet goldfish?' },
  { category: 'Know Me', text: 'Your most-played song this month?' },
  { category: 'Know Me', text: 'The chore you hate the most?' },
  { category: 'Know Me', text: "Dish you'd cook to impress someone?" },
  { category: 'Know Me', text: 'Your favorite season?' },

  // Same wavelength — word association, "name a…"
  { category: 'Same Wavelength', text: "Name something you'd find in a messy garage" },
  { category: 'Same Wavelength', text: "Name a fruit that's seriously underrated" },
  { category: 'Same Wavelength', text: "Name something that's always sticky" },
  { category: 'Same Wavelength', text: 'Name a famous cartoon character' },
  { category: 'Same Wavelength', text: 'Name something people bring to the beach' },
  { category: 'Same Wavelength', text: "Name something you'd find in a grandma's purse" },
  { category: 'Same Wavelength', text: 'Name a classic excuse for being late' },
  { category: 'Same Wavelength', text: 'Name something that comes in pairs' },
  { category: 'Same Wavelength', text: 'Name a board game everyone knows' },
  { category: 'Same Wavelength', text: 'Name a vegetable kids refuse to eat' },
  { category: 'Same Wavelength', text: 'Name a famous landmark' },
  { category: 'Same Wavelength', text: 'Name something that makes a loud noise' },
  { category: 'Same Wavelength', text: 'Name an animal with a long neck… or tail' },
  { category: 'Same Wavelength', text: 'Name a word that rhymes with "cat"' },

  // Fill in the blank
  { category: 'Fill the Blank', text: 'The best thing about rainy days is ___' },
  { category: 'Fill the Blank', text: 'A perfect first date involves ___' },
  { category: 'Fill the Blank', text: "If I could only eat one food forever, it'd be ___" },
  { category: 'Fill the Blank', text: 'The most overrated holiday is ___' },
  { category: 'Fill the Blank', text: 'Every kitchen needs a ___' },
  { category: 'Fill the Blank', text: 'The world would be better with more ___' },
  { category: 'Fill the Blank', text: "A road trip isn't complete without ___" },
  { category: 'Fill the Blank', text: 'My villain origin story starts with ___' },
  { category: 'Fill the Blank', text: 'The weirdest pizza topping that actually works: ___' },
  { category: 'Fill the Blank', text: "Never trust someone who doesn't like ___" },
];

/** Picks an unused sync prompt (tracks indices in `used`, resets when exhausted). */
export function drawSyncPrompt(used) {
  if (used.size >= SYNC_PROMPTS.length) used.clear();
  const available = SYNC_PROMPTS.map((_, i) => i).filter((i) => !used.has(i));
  const index = pick(available);
  used.add(index);
  return { ...SYNC_PROMPTS[index] };
}

/* ------------------------------------------------------------------ */
/* Telepathy grid mode                                                 */
/* ------------------------------------------------------------------ */

const GENERIC_TELEPATHY_PROMPTS = [
  'Pick the one your partner will pick',
  'Pick the first one that catches your eye',
  'Pick the odd one out',
  'Pick your favorite',
  'Pick the one that best represents your team',
];

const emojiSet = (name, items, prompts) => ({
  name,
  kind: 'emoji',
  prompts,
  make: () => shuffle(items).slice(0, 9).map((e) => ({ display: e })),
});

const TELEPATHY_SETS = [
  emojiSet(
    'Snack Attack',
    ['🍕', '🍣', '🌮', '🍔', '🍩', '🍜', '🥐', '🍓', '🧀', '🍫', '🥑', '🍿', '🍪', '🥨', '🍉', '🌯'],
    ["Pick the snack you'd split at 2am", 'Pick what your partner is craving right now'],
  ),
  emojiSet(
    'Wild Kingdom',
    ['🦊', '🐼', '🐙', '🦄', '🐢', '🦁', '🐧', '🦥', '🐝', '🦩', '🐳', '🦔', '🐸', '🦉', '🐨', '🦖'],
    ['Pick your spirit animal as a duo', 'Pick the animal your partner would adopt'],
  ),
  emojiSet(
    'Wanderlust',
    ['🏝️', '🏔️', '🏙️', '🏜️', '🏕️', '🗼', '🏰', '🌋', '🎡', '⛩️', '🗽', '🛶', '🚂', '🛸', '🎢', '🌌'],
    ['Pick your next trip together', 'Pick where you would hide from the world'],
  ),
  emojiSet(
    'Vibe Check',
    ['🌈', '⚡', '❄️', '🔥', '🌙', '☀️', '🌊', '🌪️', '🍂', '🌸', '⭐', '☁️', '🌵', '🍄', '🫧', '💎'],
    ["Pick today's mood", 'Pick the vibe of your friendship'],
  ),
  emojiSet(
    'Pocket Stuff',
    ['🎸', '📚', '🎮', '🧸', '☕', '🎧', '📷', '🕯️', '🪴', '🎲', '🧩', '🛹', '🔭', '🎨', '🪁', '🧶'],
    ['Pick the gift your partner would love', 'Pick what you would save from a fire'],
  ),
  emojiSet(
    'Face Off',
    ['😂', '😍', '😎', '🤔', '😴', '🥳', '😱', '🤯', '😇', '🤠', '😈', '🥺', '🙃', '🤓', '😤', '🫠'],
    ['Pick your partner on a Monday morning', 'Pick your face right now'],
  ),
  {
    name: 'Palette',
    kind: 'color',
    prompts: ['Pick the color of your relationship', "Pick the color that matches today's mood"],
    make: () =>
      shuffle([
        { label: 'Coral', color: '#ff6b5b' },
        { label: 'Sunflower', color: '#ffcc33' },
        { label: 'Mint', color: '#4ade80' },
        { label: 'Ocean', color: '#38bdf8' },
        { label: 'Indigo', color: '#6366f1' },
        { label: 'Grape', color: '#a855f7' },
        { label: 'Bubblegum', color: '#f472b6' },
        { label: 'Tangerine', color: '#fb923c' },
        { label: 'Teal', color: '#14b8a6' },
        { label: 'Ruby', color: '#e11d48' },
        { label: 'Lime', color: '#a3e635' },
        { label: 'Snow', color: '#f1f5f9' },
        { label: 'Midnight', color: '#1e293b' },
        { label: 'Lavender', color: '#c4b5fd' },
      ])
        .slice(0, 9)
        .map((c) => ({ display: '', ...c })),
  },
  {
    name: 'Shapeshifter',
    kind: 'shape',
    prompts: ['Pick the shape that feels the most "you"', 'Pick the shape your partner would doodle'],
    make: () => {
      const glyphs = ['●', '▲', '■', '◆', '★', '⬟', '♥', '✚', '⬢', '☾', '✦', '◐'];
      const colors = ['#ff6b5b', '#818cf8', '#c084fc', '#38bdf8', '#fbbf24', '#f472b6', '#34d399'];
      return shuffle(glyphs)
        .slice(0, 9)
        .map((g) => ({ display: g, color: pick(colors) }));
    },
  },
  {
    name: 'Lucky Numbers',
    kind: 'number',
    prompts: ['Pick the luckiest number', 'Pick the number your partner would bet on'],
    make: () => {
      const nums = new Set();
      while (nums.size < 9) nums.add(1 + Math.floor(Math.random() * 99));
      return [...nums].map((n) => ({ display: String(n) }));
    },
  },
  {
    name: 'Word Play',
    kind: 'word',
    prompts: ['Pick the coziest-sounding word', 'Pick the word that sounds like your partner'],
    make: () =>
      shuffle([
        'Ocean', 'Thunder', 'Velvet', 'Cactus', 'Lantern', 'Marble', 'Honey', 'Comet',
        'Whisper', 'Maple', 'Echo', 'Ember', 'Pickle', 'Galaxy', 'Pebble', 'Waffle',
      ])
        .slice(0, 9)
        .map((w) => ({ display: w })),
  },
];

/** Builds a fresh 3×3 telepathy grid, avoiding recently-used sets. */
export function buildTelepathyGrid(used) {
  if (used.size >= TELEPATHY_SETS.length) used.clear();
  const available = TELEPATHY_SETS.map((_, i) => i).filter((i) => !used.has(i));
  const index = pick(available);
  used.add(index);
  const set = TELEPATHY_SETS[index];
  const prompt = Math.random() < 0.65 ? pick(set.prompts) : pick(GENERIC_TELEPATHY_PROMPTS);
  return {
    prompt: { category: set.name, text: prompt },
    grid: { kind: set.kind, cols: 3, items: set.make() },
  };
}

/* ------------------------------------------------------------------ */
/* Lobby flavor                                                        */
/* ------------------------------------------------------------------ */

export const TEAM_NAMES = [
  'Cosmic Pickles', 'Velvet Thunder', 'Mind Melders', 'Spicy Noodles', 'Night Owls',
  'Twin Flames', 'Lucky Ducks', 'Brain Waves', 'Sugar Rush', 'Moon Walkers',
  'Wild Cards', 'Pocket Rockets', 'Dream Team', 'Lava Lamps', 'Neon Ninjas', 'Disco Dumplings',
];

export const TEAM_COLORS = [
  '#ff6b5b', // coral
  '#818cf8', // indigo
  '#c084fc', // electric purple
  '#2dd4bf', // teal
  '#fbbf24', // amber
  '#f472b6', // pink
  '#38bdf8', // sky
  '#a3e635', // lime
];

export const AVATARS = [
  '🦊', '🐼', '🐙', '🦄', '🐢', '🦁', '🐧', '🦥', '🐝', '🦩', '🐳', '🦔',
  '🐸', '🦉', '🐨', '🦖', '🐯', '🐰', '🦋', '🐶', '🐱', '🐻', '🦦', '🐲',
];
