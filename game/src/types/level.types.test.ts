import { describe, it, expect } from 'vitest';
import { getFirstIncompleteLevel, LEVEL_ORDER } from '../types/level.types';

describe('getFirstIncompleteLevel', () => {
  it('returns first level when nothing completed', () => {
    expect(getFirstIncompleteLevel([])).toBe('level_00');
  });

  it('returns first incomplete level', () => {
    expect(getFirstIncompleteLevel(['level_00', 'level_01'])).toBe('level_02');
  });

  it('returns level_00 when all completed', () => {
    expect(getFirstIncompleteLevel([...LEVEL_ORDER])).toBe('level_00');
  });
});
