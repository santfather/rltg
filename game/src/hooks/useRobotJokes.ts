import { useEffect, useRef, useState } from 'react';
import { ROBOT_JOKES, type RobotJoke } from '../data/robot_jokes';
import { useGameStore } from '../store/gameStore';

interface UseRobotJokesResult {
  currentJoke: RobotJoke | null;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Idle speech-bubble jokes with shuffle and timed display */
export function useRobotJokes(): UseRobotJokesResult {
  const robotState = useGameStore((s) => s.robotState);
  const levelSession = useGameStore((s) => s.levelSession);
  const [currentJoke, setCurrentJoke] = useState<RobotJoke | null>(null);
  const [cycleTick, setCycleTick] = useState(0);
  const jokeIndexRef = useRef<number[]>([]);
  const initialGraceRef = useRef(true);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = (): void => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    showTimerRef.current = null;
    hideTimerRef.current = null;
  };

  useEffect(() => {
    initialGraceRef.current = true;
    jokeIndexRef.current = [];
    const resetId = window.setTimeout(() => {
      setCurrentJoke(null);
      setCycleTick((t) => t + 1);
    }, 0);
    return () => window.clearTimeout(resetId);
  }, [levelSession]);

  useEffect(() => {
    clearTimers();

    if (robotState !== 'idle') {
      return;
    }

    if (jokeIndexRef.current.length === 0) {
      jokeIndexRef.current = shuffleArray(
        Array.from({ length: ROBOT_JOKES.length }, (_, i) => i),
      );
    }

    const delay = initialGraceRef.current ? 5000 : randomBetween(18000, 22000);

    showTimerRef.current = setTimeout(() => {
      initialGraceRef.current = false;

      if (jokeIndexRef.current.length === 0) {
        jokeIndexRef.current = shuffleArray(
          Array.from({ length: ROBOT_JOKES.length }, (_, i) => i),
        );
      }

      const idx = jokeIndexRef.current.pop();
      if (idx === undefined) return;

      setCurrentJoke(ROBOT_JOKES[idx]);

      hideTimerRef.current = setTimeout(() => {
        setCurrentJoke(null);
        setCycleTick((t) => t + 1);
      }, 5000);
    }, delay);

    return clearTimers;
  }, [robotState, cycleTick]);

  return { currentJoke };
}
