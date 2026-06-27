import type { Hint } from '../types/level.types';

/** Returns hint text for level 1–3 */
export const getHintText = (hints: Hint[], level: number): string => {
  const hint = hints.find((h) => h.level === level);
  return hint?.text ?? 'Hint not available.';
};

/** Formats available hint levels for display */
export const formatHintList = (hints: Hint[], used: number[]): string => {
  const levels = hints.map((h) => {
    const mark = used.includes(h.level) ? ' [used]' : '';
    return `  hint ${h.level}${mark}`;
  });
  return ['Available hints:', ...levels].join('\n');
};

/** Score penalty for using hint level 3 */
export const HINT_LEVEL_3_PENALTY = 10;
