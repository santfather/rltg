import { useEffect, useState } from 'react';
import OxygenBar from './OxygenBar';
import { audioSystem } from '../engine/AudioSystem';

interface TopBarProps {
  oxygen: number;
  missionId: string;
  score: number;
  trainingMode?: boolean;
  isPaused?: boolean;
  onRestart: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleMap: () => void;
}

/** HUD top bar: oxygen, mission, score, game controls */
export default function TopBar({
  oxygen,
  missionId,
  score,
  trainingMode,
  isPaused,
  onRestart,
  onPause,
  onStop,
  onToggleMap,
}: TopBarProps) {
  const [muted, setMuted] = useState(audioSystem.isMuted);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        setMuted(audioSystem.toggleMute());
      }
      if (e.key === 'm' || e.key === 'M') {
        onToggleMap();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggleMap]);

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        {trainingMode ? (
          <span className="text-[var(--crt-blue)]">TRAINING MODE — O₂: ∞</span>
        ) : (
          <OxygenBar oxygen={oxygen} />
        )}
        {isPaused && <span className="top-bar-paused">⏸ ПАУЗА</span>}
      </div>

      <span className="top-bar-mission">МИССИЯ {missionId}</span>

      <div className="top-bar-right">
        <span className="top-bar-score">SCORE: {String(score).padStart(4, '0')}</span>
        <div className="top-bar-controls">
          <button
            type="button"
            className="top-bar-btn"
            onClick={onToggleMap}
            title="Ship map"
            aria-label="Карта корабля"
          >
            [M] КАРТА
          </button>
          <button
            type="button"
            className="top-bar-btn"
            onClick={() => setMuted(audioSystem.toggleMute())}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            title={muted ? '[S] вкл звук' : '[S] откл звук'}
          >
            {muted ? '[MUTE]' : '[SND]'}
          </button>
          <button
            type="button"
            className="top-bar-btn"
            onClick={onRestart}
            title="Restart level"
            aria-label="Перезапустить уровень"
          >
            ↺ RESTART
          </button>
          <button
            type="button"
            className="top-bar-btn"
            onClick={onPause}
            title="Pause / Resume"
            aria-label="Пауза игры"
          >
            {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
          </button>
          <button
            type="button"
            className="top-bar-btn top-bar-btn--stop"
            onClick={onStop}
            title="Stop — back to menu"
            aria-label="Остановить игру"
          >
            ■ STOP
          </button>
        </div>
      </div>
    </header>
  );
}
