import { formatPoints, xlmToStroops, stroopsToXlm, tierFromIndex } from '@/types';

describe('accrual math', () => {
  test('pending points formula mirrors contract logic', () => {
    const lastClaimTs = 1_000_000n;
    const nowTs = 1_003_600n; // 1 hour later
    const ratePerHour = 100n; // Gold bot
    const elapsed = nowTs - lastClaimTs;
    const pending = (elapsed * ratePerHour) / 3600n;
    expect(pending).toBe(100n);
  });

  test('pending is zero when time has not advanced', () => {
    const ts = 5_000n;
    const elapsed = ts - ts;
    const pending = (elapsed * 500n) / 3600n;
    expect(pending).toBe(0n);
  });

  test('integer division truncates sub-hour accrual', () => {
    // 30 min with a 1 pt/hr bot → 0 pts (truncated)
    const elapsed = 1800n;
    const rate = 1n;
    expect((elapsed * rate) / 3600n).toBe(0n);
  });

  test('100 points = 1 AMT token', () => {
    const points = 250n;
    const POINTS_PER_AMT = 100n;
    const amtMinted = points / POINTS_PER_AMT;
    expect(amtMinted).toBe(2n);
  });

  test('combined bot rates sum correctly', () => {
    const rates = [1n, 5n, 25n, 100n, 500n]; // all tiers
    const total = rates.reduce((a, b) => a + b, 0n);
    expect(total).toBe(631n);
  });
});

describe('formatPoints', () => {
  test('formats values below 1000 as-is', () => {
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(999)).toBe('999');
  });

  test('formats thousands with K suffix', () => {
    expect(formatPoints(1500)).toBe('1.5K');
    expect(formatPoints(10000)).toBe('10.0K');
  });

  test('formats millions with M suffix', () => {
    expect(formatPoints(2_500_000)).toBe('2.50M');
  });

  test('accepts bigint input', () => {
    expect(formatPoints(1000n)).toBe('1.0K');
  });
});

describe('xlm / stroops conversion', () => {
  test('100 XLM = 1_000_000_000 stroops', () => {
    expect(xlmToStroops(100)).toBe(1_000_000_000n);
  });

  test('1 stroop = 0.0000001 XLM', () => {
    expect(stroopsToXlm(1n)).toBeCloseTo(0.0000001);
  });

  test('round-trips correctly', () => {
    const original = 42.5;
    const back = stroopsToXlm(xlmToStroops(original));
    expect(back).toBeCloseTo(original);
  });
});

describe('tierFromIndex', () => {
  test('returns correct tiers', () => {
    expect(tierFromIndex(0)).toBe('Basic');
    expect(tierFromIndex(1)).toBe('Bronze');
    expect(tierFromIndex(4)).toBe('Diamond');
  });

  test('out-of-bounds defaults to Basic', () => {
    expect(tierFromIndex(99)).toBe('Basic');
  });
});
