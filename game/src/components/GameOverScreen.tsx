import { useEffect } from 'react';

interface GameOverScreenProps {
  lastCommand: string;
  score: number;
  onRestart: () => void;
}

/** Shown when oxygen reaches zero */
export default function GameOverScreen({ lastCommand, score, onRestart }: GameOverScreenProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'r' || event.key === 'R') onRestart();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onRestart]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[var(--bg-deep)] font-[family-name:var(--font-terminal)]">
      <pre className="text-[var(--crt-red)]">GAME OVER</pre>
      <p className="mt-4 text-[var(--crt-red)]">СИСТЕМА ЖИЗНЕОБЕСПЕЧЕНИЯ ОТКАЗАЛА</p>
      <p className="mt-2 text-[var(--crt-amber)]">Последняя команда: {lastCommand}</p>
      <p>Очки: {String(score).padStart(4, '0')}</p>
      <button type="button" onClick={onRestart} className="mt-6 text-[var(--crt-green)]">
        [R] НАЧАТЬ ЗАНОВО
      </button>
    </div>
  );
}
