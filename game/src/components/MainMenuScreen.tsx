import { useCallback, useEffect, useState } from 'react';
import type { LevelId } from '../types/level.types';
import { LEVEL_ORDER, getFirstIncompleteLevel } from '../types/level.types';

interface MainMenuScreenProps {
  completedLevels: LevelId[];
  onStart: () => void;
  onContinue?: () => void;
}

const LOGO = `██████ ███████ ████████ ██████   ██████
██  ██ ██         ██    ██  ██  ██    ██
██████ █████      ██    ██████  ██    ██
██  ██ ██         ██    ██  ██  ██    ██
██  ██ ███████    ██    ██  ██   ██████`;

/** Start screen with progress and new/continue options */
export default function MainMenuScreen({
  completedLevels,
  onStart,
  onContinue,
}: MainMenuScreenProps) {
  const [bootLine, setBootLine] = useState(false);
  const hasSave = completedLevels.length > 0;
  const doneCount = completedLevels.length;
  const totalCount = LEVEL_ORDER.length;
  const progressPct = (doneCount / totalCount) * 100;
  const continueLevel = hasSave ? getFirstIncompleteLevel(completedLevels) : null;
  const continueNum = continueLevel?.replace('level_', '');

  const handleContinue = useCallback(() => {
    if (onContinue) onContinue();
  }, [onContinue]);

  useEffect(() => {
    const schedule = () => {
      const delay = 5000 + Math.random() * 3000;
      return window.setTimeout(() => {
        setBootLine(true);
        window.setTimeout(() => setBootLine(false), 1800);
        timerId = schedule();
      }, delay);
    };
    let timerId = schedule();
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'N') onStart();
      if ((e.key === 'c' || e.key === 'C') && hasSave && onContinue) handleContinue();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onStart, onContinue, hasSave, handleContinue]);

  return (
    <div className="main-menu">
      <pre className="main-menu__logo">{LOGO}</pre>
      <p className="main-menu__subtitle">LINUX TERMINAL SURVIVAL — NOSTROMO-8</p>

      {hasSave ? (
        <div className="main-menu__progress">
          <div className="main-menu__progress-bar">
            <div
              className="main-menu__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="main-menu__progress-label">
            {doneCount}/{totalCount}
          </span>
        </div>
      ) : null}

      {bootLine ? (
        <p className="main-menu__boot-flash">&gt; BOOT SEQUENCE INTERRUPTED...</p>
      ) : (
        <div className="main-menu__boot-spacer" />
      )}

      <button type="button" className="main-menu__option" onClick={onStart}>
        [N] НОВАЯ ИГРА
      </button>

      {hasSave && onContinue ? (
        <button type="button" className="main-menu__option" onClick={handleContinue}>
          [C] ПРОДОЛЖИТЬ (МИССИЯ {continueNum})
        </button>
      ) : null}

      <p className="main-menu__version">v0.9 // НОСТРОМО-8 // RETRO-UX v3.11</p>
    </div>
  );
}
