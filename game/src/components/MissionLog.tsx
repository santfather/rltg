import type { LearningObjective, SectionPlan as SectionPlanType } from '../types/level.types';
import RobotWidget from './RobotWidget';
import SectionPlan from './SectionPlan';

interface MissionLogProps {
  objectives: LearningObjective[];
  completedCommands: string[];
  sectionPlan?: SectionPlanType;
}

/** Right sidebar: section plan + robot widget + mission objectives */
export default function MissionLog({ objectives, completedCommands, sectionPlan }: MissionLogProps) {
  return (
    <aside className="mission-sidebar">
      {sectionPlan && <SectionPlan plan={sectionPlan} />}
      <RobotWidget />
      <div className="mission-objectives">
        <h2 className="mission-objectives__title">ЦЕЛИ МИССИИ</h2>
        <ul className="mission-objectives__list">
          {objectives.map((obj) => {
            const done = completedCommands.includes(obj.command);
            return (
              <li
                key={obj.command}
                className={`mission-obj ${done ? 'mission-obj--done' : 'mission-obj--pending'}`}
              >
                <span>{done ? '[✓]' : '[ ]'}</span>
                <span>{obj.command}</span>
              </li>
            );
          })}
        </ul>
        <hr className="mission-divider" />
        <p className="mission-hint-tip">ПОДСКАЗКИ: hint 1 / 2 / 3</p>
      </div>
    </aside>
  );
}
