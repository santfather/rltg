import { useState } from 'react';
import type { SectionHotspot, SectionPlan as SectionPlanType } from '../types/level.types';
import { tokenize } from './sectionPlanTokenize';

interface Props {
  plan: SectionPlanType;
}

export default function SectionPlan({ plan }: Props) {
  const [activeHotspot, setActiveHotspot] = useState<SectionHotspot | null>(null);
  const tokens = tokenize(plan.ascii, plan.hotspots);

  return (
    <div className="section-plan">
      <div className="section-plan__header">ПЛАН ОТСЕКА</div>

      <div className="section-plan__map-wrapper">
        <pre className="section-plan__map">
          {tokens.map((token, i) =>
            token.hotspot ? (
              <span
                key={`${token.hotspot.id}-${i}`}
                className="section-plan__hotspot"
                onMouseEnter={() => setActiveHotspot(token.hotspot!)}
                onMouseLeave={() => setActiveHotspot(null)}
                data-id={token.hotspot.id}
              >
                {token.text}
              </span>
            ) : (
              <span key={`plain-${i}`}>{token.text}</span>
            ),
          )}
        </pre>

        {activeHotspot && (
          <div className="section-plan__tooltip" role="tooltip" aria-live="polite">
            {activeHotspot.detail && (
              <pre className="section-plan__detail">{activeHotspot.detail}</pre>
            )}
            <p className="section-plan__tooltip-text">{activeHotspot.tooltip}</p>
            {activeHotspot.nudge && (
              <p className="section-plan__nudge">&gt; {activeHotspot.nudge}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
