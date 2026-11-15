// A small seeded random generator (mulberry32). The meadow is grown from a
// seed so a day is the same garden every time it is replayed, and so the
// screenshot scenes render identically on any machine.

export function createRng(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max], both ends included.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // True with probability p.
    chance(p) {
      return next() < p;
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
  };
}

// The seed a normal day is grown from when the page names none.
export const DEFAULT_SEED = 20261115;
