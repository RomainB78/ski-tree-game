/**
 * Deterministic PRNG implementation based on Mulberry32 algorithm.
 * Excellent for procedural generation requiring seed repeatability.
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generates a deterministic float between 0 (inclusive) and 1 (exclusive)
   */
  public next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a float within [min, max)
   */
  public floatBetween(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates an integer within [min, max]
   */
  public intBetween(min: number, max: number): number {
    return Math.floor(this.floatBetween(min, max + 1));
  }

  /**
   * Selects a random item from the provided array
   */
  public pick<T>(array: T[]): T {
    if (array.length === 0) return undefined as any;
    const index = this.intBetween(0, array.length - 1);
    return array[index];
  }
}

/**
 * Generates a deterministic seed string from a given string (e.g. "2026-07-03")
 */
export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Returns a seed representing the current date in YYYY-MM-DD format
 */
export function getDailySeedString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
