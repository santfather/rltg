import type { SectionHotspot } from '../types/level.types';

export interface SectionPlanToken {
  text: string;
  hotspot?: SectionHotspot;
}

/** Split ASCII plan into plain and hotspot segments for rendering */
export function tokenize(ascii: string, hotspots: SectionHotspot[]): SectionPlanToken[] {
  const result: SectionPlanToken[] = [];
  const sorted = [...hotspots].sort((a, b) => b.label.length - a.label.length);
  let remaining = ascii;

  while (remaining.length > 0) {
    let matched = false;

    for (const hs of sorted) {
      if (remaining.startsWith(hs.label)) {
        result.push({ text: hs.label, hotspot: hs });
        remaining = remaining.slice(hs.label.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      const last = result[result.length - 1];
      if (last && !last.hotspot) {
        last.text += remaining[0];
      } else {
        result.push({ text: remaining[0] });
      }
      remaining = remaining.slice(1);
    }
  }

  return result;
}
