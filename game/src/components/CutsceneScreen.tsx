import { useCallback, useEffect, useRef, useState } from 'react';

interface CutsceneScreenProps {
  imageUrl?: string;
  lines: string[];
  typingSpeed?: number;
  onComplete: () => void;
  location: string;
}

interface NarrativeTypewriterProps {
  lines: string[];
  typingSpeed: number;
  onFinished: () => void;
}

function NarrativeTypewriter({ lines, typingSpeed, onFinished }: NarrativeTypewriterProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let lineIndex = 0;
    let charIndex = 0;

    const schedule = (fn: () => void, delay: number): void => {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) fn();
        }, delay),
      );
    };

    const tick = (): void => {
      if (cancelled) return;

      if (lineIndex >= lines.length) {
        schedule(onFinished, 0);
        return;
      }

      const line = lines[lineIndex];
      if (charIndex >= line.length) {
        const finishedLine = line;
        schedule(() => {
          setVisibleLines((prev) => [...prev, finishedLine]);
          setCurrentLine('');
          lineIndex += 1;
          charIndex = 0;
          schedule(tick, 200);
        }, 0);
        return;
      }

      const nextChar = line[charIndex];
      charIndex += 1;
      schedule(() => {
        setCurrentLine((prev) => prev + nextChar);
        schedule(tick, typingSpeed);
      }, typingSpeed);
    };

    schedule(tick, typingSpeed);

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
    };
  }, [lines, typingSpeed, onFinished]);

  return (
    <>
      {visibleLines.map((line, index) => (
        <p key={`${index}-${line.slice(0, 12)}`} className="text-[var(--crt-green)]">
          &gt; {line}
        </p>
      ))}
      {currentLine ? (
        <p className="text-[var(--crt-green)]">
          &gt; {currentLine}
          <span className="cutscene-cursor">▌</span>
        </p>
      ) : null}
    </>
  );
}

/** Pre-mission cutscene with typewriter narrative */
export default function CutsceneScreen({
  imageUrl,
  lines,
  typingSpeed = 30,
  location,
  onComplete,
}: CutsceneScreenProps) {
  const skipRef = useRef(onComplete);

  useEffect(() => {
    skipRef.current = onComplete;
  }, [onComplete]);

  const skip = useCallback(() => {
    skipRef.current();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') skip();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [skip]);

  return (
    <div
      className="flex min-h-svh flex-col bg-[var(--bg-deep)] font-[family-name:var(--font-terminal)]"
      role="button"
      tabIndex={0}
      onClick={skip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') skip();
      }}
    >
      <header className="border-b border-[var(--crt-dim)] p-2 text-center text-[var(--crt-green)]">
        RETRO-UX v3.11 — {location}
      </header>
      <div className="flex flex-1 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="cutscene-image m-4" />
        ) : null}
        <div className="flex-1 overflow-y-auto p-4 text-left">
          <NarrativeTypewriter
            key={lines.join('\n')}
            lines={lines}
            typingSpeed={typingSpeed}
            onFinished={() => {}}
          />
        </div>
      </div>
      <footer className="border-t border-[var(--crt-dim)] p-2 text-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            skip();
          }}
          className="text-[var(--crt-amber)]"
        >
          [ПРОПУСТИТЬ — КЛИК ИЛИ ENTER]
        </button>
      </footer>
    </div>
  );
}
