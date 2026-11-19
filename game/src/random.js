// Crescent Bay — deterministic randomness helpers.
// Every random choice in the city generator flows through these so the same
// seed string always rebuilds the identical city.

// FNV-1a 32-bit hash: turns any seed string into a stable uint32.
export function hashStringSeed(str) {
  let hash = 0x811c9dc5;
  const text = String(str);
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Mulberry32: small, fast, deterministic PRNG. Returns rng() -> [0, 1).
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Float in [min, max).
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

// Integer in [min, max] inclusive.
export function randInt(rng, min, max) {
  return Math.floor(randRange(rng, min, max + 1));
}

// Random element of a non-empty array.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
