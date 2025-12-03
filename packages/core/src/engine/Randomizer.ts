/**
 * Seeded PRNG using Mulberry32 for reproducible chaos sequences.
 */
export class Randomizer {
  private state: number;
  readonly seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 2 ** 32);
    this.state = this.seed;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  shouldTrigger(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  intInRange(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  reset(): void {
    this.state = this.seed;
  }
}
