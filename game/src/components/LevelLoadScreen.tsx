import { useEffect } from 'react';

interface LevelLoadScreenProps {
  missionId: string;
  missionTitle: string;
  asciiArt?: string;
  onLoadComplete: () => void;
}

/** Boot sequence screen between levels */
export default function LevelLoadScreen({
  missionId,
  missionTitle,
  asciiArt,
  onLoadComplete,
}: LevelLoadScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onLoadComplete, 2500);
    return () => window.clearTimeout(timer);
  }, [onLoadComplete]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[var(--bg-deep)] font-[family-name:var(--font-terminal)] text-[var(--crt-green)]">
      <p>RETRO-UX v3.11 // BOOT SEQUENCE</p>
      {asciiArt ? (
        <pre className="level-load-art mt-4 text-left text-[var(--crt-green)]">{asciiArt}</pre>
      ) : null}
      <p className="mt-4">&gt; Connecting to terminal... [OK]</p>
      <div className="progress-bar mt-6 h-4 w-64 border border-[var(--crt-dim)]">
        <div className="progress-bar-fill h-full w-full bg-[var(--crt-green)]" />
      </div>
      <p className="mt-6 text-[var(--crt-amber)]">
        MISSION {missionId}: {missionTitle}
      </p>
      <button type="button" className="mt-4 text-[var(--crt-dim)]" onClick={onLoadComplete}>
        skip
      </button>
    </div>
  );
}
