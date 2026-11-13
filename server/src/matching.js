/**
 * Fuzzy answer matching for Sync mode.
 *
 * Works for English and Arabic (and mixed groups — though an Arabic answer
 * vs. an English prediction will just fall to the host to judge).
 *
 * judge(prediction, answer) returns:
 *   'match' — clearly the same answer (auto-awarded, host can still revoke)
 *   'close' — plausibly the same (e.g. "Basketball court" vs "Hoop court");
 *             scores 0 until the host approves it
 *   'miss'  — different answers
 */

const FILLER = new Set([
  'a', 'an', 'the', 'my', 'your', 'some', 'probably', 'definitely',
  'اكيد', 'يمكن', 'ربما', 'غالبا',
]);
const STOP = new Set([
  'and', 'of', 'with', 'in', 'on', 'for', 'to', 'or', 'at', 'it', 'is',
  'في', 'من', 'على', 'الى', 'او', 'مع', 'عن',
]);

const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

/**
 * Arabic spelling normalisation: hamza/madda on alef (handled by NFKD + mark
 * stripping), taa marbuta → haa, alef maqsura → yaa, waw/yaa hamza seats,
 * tatweel, Eastern-Arabic digits, and the definite article "ال".
 */
function normalizeArabic(text) {
  return text
    .replace(ARABIC_DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10))
    .replace(/\u0640/g, '') // tatweel \u0640
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

function stripArabicArticle(word) {
  if (word.length > 3 && /^(ال|وال|بال|فال|كال|لل)/.test(word)) {
    return word.replace(/^(و|ب|ف|ك)?ال/, '').replace(/^لل/, '');
  }
  return word;
}

function singular(word) {
  if (/[\u0600-\u06FF]/.test(word)) return stripArabicArticle(word);
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ch|sh|x|z|ss)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function normalize(text) {
  const raw = normalizeArabic(String(text ?? '').trim().toLowerCase());
  const words = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036F\u064B-\u065F\u0670]/g, '') // strip accents + Arabic diacritics
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // strip punctuation / emoji
    .split(/\s+/)
    .filter(Boolean);
  const meaningful = words.filter((w) => !FILLER.has(w));
  const tokens = (meaningful.length ? meaningful : words).map(singular);
  // Emoji-only answers normalize to nothing — fall back to the raw text.
  return tokens.length ? tokens.join(' ') : raw.replace(/\s+/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[b.length];
}

export function judge(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 'miss';
  if (na === nb || na.replace(/\s/g, '') === nb.replace(/\s/g, '')) return 'match';

  const distance = levenshtein(na, nb);
  const similarity = 1 - distance / Math.max(na.length, nb.length);
  // Tiny typo: "pizzza" vs "pizza", "chocolat" vs "chocolate"
  if (similarity >= 0.88 || (distance === 1 && Math.min(na.length, nb.length) >= 4)) return 'match';
  if (similarity >= 0.6) return 'close';

  // Shared meaningful word → let the host decide ("hoop court" vs "basketball court").
  const ta = new Set(na.split(' ').filter((w) => w.length >= 3 && !STOP.has(w)));
  const tb = nb.split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
  if (tb.some((w) => ta.has(w))) return 'close';

  // One contains the other ("ice cream" vs "mint ice cream").
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) return 'close';

  return 'miss';
}
