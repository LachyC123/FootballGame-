import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../src/domain/rng';

describe('SeededRng', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = new SeededRng(1234);
    const b = new SeededRng(1234);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('int stays inside inclusive bounds', () => {
    const rng = new SeededRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('next stays in [0, 1)', () => {
    const rng = new SeededRng(999);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('pick throws on an empty array', () => {
    expect(() => new SeededRng(1).pick([])).toThrow();
  });
});
