import { describe, expect, it } from 'vitest';
import {
  calculateReadinessRawScore,
  getReadinessCategory,
  normaliseReadinessScore
} from '@/lib/readiness/scoring';

describe('readiness scoring helpers', () => {
  it('sums the selected option score values for a complete seven-answer set', () => {
    expect(calculateReadinessRawScore([4, 3, 2, 4, 1, 3, 2])).toBe(19);
    expect(calculateReadinessRawScore([4, 4, 4, 4, 4, 4, 4])).toBe(28);
    expect(calculateReadinessRawScore([1, 1, 1, 1, 1, 1, 1])).toBe(7);
  });

  it('normalises the raw score range from 7 to 28 onto a 0 to 100 scale', () => {
    expect(normaliseReadinessScore(7)).toBe(0);
    expect(normaliseReadinessScore(28)).toBe(100);
  });

  it('keeps boundary values in the expected readiness bands', () => {
    expect(getReadinessCategory(0)).toBe('early_stage');
    expect(getReadinessCategory(24)).toBe('early_stage');
    expect(getReadinessCategory(25)).toBe('foundational');
    expect(getReadinessCategory(49)).toBe('foundational');
    expect(getReadinessCategory(50)).toBe('ready_to_pilot');
    expect(getReadinessCategory(74)).toBe('ready_to_pilot');
    expect(getReadinessCategory(75)).toBe('ready_to_scale');
    expect(getReadinessCategory(100)).toBe('ready_to_scale');
  });

  it('rejects incomplete answer sets instead of silently scoring them', () => {
    expect(() => calculateReadinessRawScore([1, 2, 3, 4, 5, 6])).toThrow(
      /complete seven answers|seven-answer set|not enough answers/i
    );
  });
});
