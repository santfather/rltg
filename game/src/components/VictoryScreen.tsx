import { useEffect, useState } from 'react';
import type { LearningObjective } from '../types/level.types';

interface VictoryScreenProps {
  objectives: LearningObjective[];
  oxygenBonus: number;
  scoreBonus: number;
  unlockLog?: string;
  onNextMission: () => void;
  isFinalLevel?: boolean;
}

/** Shown when level win condition is met */
export default function VictoryScreen({
  objectives,
  oxygenBonus,
  scoreBonus,
  unlockLog,
  onNextMission,
  isFinalLevel,
}: VictoryScreenProps) {
  const [typedLog, setTypedLog] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onNextMission();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNextMission]);

  useEffect(() => {
    if (!unlockLog) return;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedLog(unlockLog.slice(0, index));
      if (index >= unlockLog.length) {
        window.clearInterval(timer);
      }
    }, 30);
    return () => window.clearInterval(timer);
  }, [unlockLog]);

  return (
    <div className="victory-screen flex min-h-svh flex-col items-center justify-center bg-[var(--bg-deep)] font-[family-name:var(--font-terminal)] text-[var(--crt-green)]">
      <p className="text-xl" style={{ textShadow: 'var(--glow-green)' }}>
        ✓ СИСТЕМА ВОССТАНОВЛЕНА
      </p>
      <div className="mt-6 border border-[var(--crt-dim)] p-4 text-left">
        <p className="mb-2">Изученные команды:</p>
        {objectives.map((obj) => (
          <p key={obj.command}>
            {obj.command} — {obj.description}
          </p>
        ))}
      </div>
      <p className="mt-4">
        Кислород: +{oxygenBonus}% &nbsp; Очки: +{scoreBonus}
      </p>
      {unlockLog ? (
        <p className="mt-4 max-w-lg text-center text-[var(--crt-blue)]">{typedLog}</p>
      ) : null}
      <button type="button" className="mt-6 text-[var(--crt-amber)]" onClick={onNextMission}>
        {isFinalLevel ? '[ENTER] ЗАВЕРШИТЬ МИССИЮ' : '[ENTER] СЛЕДУЮЩАЯ МИССИЯ'}
      </button>
    </div>
  );
}
