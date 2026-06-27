import { describe, it, expect } from 'vitest';
import { tokenize } from './sectionPlanTokenize';
import type { SectionHotspot } from '../types/level.types';

const hotspots: SectionHotspot[] = [
  { id: 'readme', label: '[README]', tooltip: 'readme hint' },
  { id: 'door', label: '[DOOR >>>]', tooltip: 'door hint' },
];

describe('tokenize', () => {
  it('wraps hotspot labels in tokens', () => {
    const ascii = '|[README] [DOOR >>>]|';
    const tokens = tokenize(ascii, hotspots);

    expect(tokens).toEqual([
      { text: '|' },
      { text: '[README]', hotspot: hotspots[0] },
      { text: ' ' },
      { text: '[DOOR >>>]', hotspot: hotspots[1] },
      { text: '|' },
    ]);
  });

  it('prefers longer labels when sorting', () => {
    const hs: SectionHotspot[] = [
      { id: 'a', label: '[AB]', tooltip: 'a' },
      { id: 'b', label: '[ABC]', tooltip: 'b' },
    ];
    const tokens = tokenize('[ABC]', hs);
    expect(tokens).toEqual([{ text: '[ABC]', hotspot: hs[1] }]);
  });

  it('preserves newlines in plain tokens', () => {
    const tokens = tokenize('line1\nline2', []);
    expect(tokens).toEqual([{ text: 'line1\nline2' }]);
  });
});
