import { useEffect } from 'react';

interface LevelErrorScreenProps {
  levelId: string;
  error: string;
  onReset: () => void;
}

const ERROR_ASCII = `  ██████╗  ██████╗  ██╗      ██╗  ██╗
  ██╔══██╗██╔═══██╗ ██║      ██║  ██║
  ██████╔╝██║   ██║ ██║      ██║  ██║
  ██╔═══╝ ██║   ██║ ██║      ██║  ██║
  ██║     ╚██████╔╝ ███████╗ ╚█████╔╝
  ╚═╝      ╚═════╝  ╚══════╝  ╚════╝ `;

/** Shown when a level fails to load instead of throwing */
export default function LevelErrorScreen({ levelId, error, onReset }: LevelErrorScreenProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') onReset();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onReset]);

  return (
    <div className="level-error-screen">
      <pre className="level-error-screen__ascii">{ERROR_ASCII}</pre>
      <p className="level-error-screen__title">ПОВРЕЖДЕНИЕ ДАННЫХ УРОВНЯ</p>
      <p className="level-error-screen__detail">
        {`Сектор: ${levelId}\nОшибка: ${error}`}
      </p>
      <button type="button" className="level-error-screen__hint" onClick={onReset}>
        [R] — вернуться к началу
      </button>
    </div>
  );
}
