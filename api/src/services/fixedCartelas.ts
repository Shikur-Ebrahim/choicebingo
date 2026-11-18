/**
 * Fixed Master Cartelas for Ethiopian Bingo (Cartela #1 to #500).
 * In Ethiopian Bingo halls, each cartela number (1 to 500) has an authentic,
 * permanently fixed 5x5 card layout that never varies between rounds or games.
 *
 * Rules:
 * - Col 0 (B): 5 unique numbers from 1 to 15
 * - Col 1 (I): 5 unique numbers from 16 to 30
 * - Col 2 (N): 4 unique numbers from 31 to 45, center [2][2] is 0 (FREE space)
 * - Col 3 (G): 5 unique numbers from 46 to 60
 * - Col 4 (O): 5 unique numbers from 61 to 75
 * - Strictly deterministic across all JS engines (Node.js, WebKit, V8, Safari, Android).
 */

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cartelaCache = new Map<number, number[][]>();

export function getFixedCartela(cartelaNumber: number): number[][] {
  const seat = Math.max(1, Math.floor(Number(cartelaNumber) || 1));
  const cached = cartelaCache.get(seat);
  if (cached) return cached;

  const rng = mulberry32(seat * 10007 + 7919);
  const card: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  const ranges: [number, number][] = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ];

  for (let c = 0; c < 5; c++) {
    const [lo, hi] = ranges[c];
    const pool: number[] = [];
    for (let n = lo; n <= hi; n++) pool.push(n);

    // Deterministic Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }

    for (let r = 0; r < 5; r++) {
      card[r][c] = pool[r];
    }
  }

  card[2][2] = 0; // FREE space at center
  cartelaCache.set(seat, card);
  return card;
}
