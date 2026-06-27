import { useEffect, useRef, useState } from 'react';
import { getAllLearningCommands } from '../levels/index';
import type { LevelId } from '../types/level.types';
import { LEVEL_ORDER } from '../types/level.types';

interface FinaleScreenProps {
  totalScore: number;
  completedLevels: LevelId[];
  finalOxygen: number;
  onRestart: () => void;
}

const SOS_TEXT = 'SOS ПРИНЯТ — HYPERION-3 на курсе';

/** Epilogue shown after completing the final level */
export default function FinaleScreen({
  totalScore,
  completedLevels,
  finalOxygen,
  onRestart,
}: FinaleScreenProps) {
  const [visible, setVisible] = useState(false);
  const [typedSos, setTypedSos] = useState('');
  const [displayScore, setDisplayScore] = useState(0);
  const rafRef = useRef<number | null>(null);

  const missionsDone = completedLevels.length;
  const totalMissions = LEVEL_ORDER.length;
  const commands = getAllLearningCommands();

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedSos(SOS_TEXT.slice(0, index));
      if (index >= SOS_TEXT.length) window.clearInterval(timer);
    }, 40);
    return () => window.clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const duration = 2000;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const step = Math.round(progress * totalScore / 50) * 50;
      setDisplayScore(Math.min(step, totalScore));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayScore(totalScore);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, totalScore]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onRestart();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onRestart]);

  useEffect(() => {
    document.documentElement.style.setProperty('--scanline-opacity', '0.06');
    return () => {
      document.documentElement.style.setProperty('--scanline-opacity', '0.03');
    };
  }, []);

  return (
    <div
      className="finale-screen"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease-in' }}
    >
      <p className="finale-header">░░░ NOSTROMO-8 // MISSION COMPLETE ░░░</p>

      <p className="finale-sos">{typedSos}</p>

      <div className="finale-report">
        <p className="finale-report__title">ИТОГОВЫЙ ОТЧЁТ</p>
        <p className="finale-report__line finale-report__line--done">
          Миссий выполнено: {missionsDone} / {totalMissions}
        </p>
        <p className="finale-report__line">
          Финальный счёт:{' '}
          <span className="finale-score-counter">{String(displayScore).padStart(4, '0')} pts</span>
        </p>
        <p className="finale-report__line">O₂ при финале: {Math.round(finalOxygen)}%</p>
      </div>

      <p className="finale-commands-label">ОСВОЕННЫЕ КОМАНДЫ ({commands.length}):</p>
      <p className="finale-commands">{commands.join('  ')}</p>

      <button type="button" className="finale-enter-prompt" onClick={onRestart}>
        [ENTER] НАЧАТЬ СНОВА
      </button>
    </div>
  );
}
