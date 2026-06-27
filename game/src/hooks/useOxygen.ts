import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const TICK_MS = 30_000;
const DECREASE = 1;

/** Global oxygen timer: -1% every 30s (disabled in training mode, pause, or non-play phases) */
export const useOxygen = () => {
  const oxygen = useGameStore((s) => s.oxygen);
  const oxygenEnabled = useGameStore((s) => s.oxygenEnabled);
  const trainingMode = useGameStore((s) => s.trainingMode);
  const isPaused = useGameStore((s) => s.isPaused);
  const phase = useGameStore((s) => s.phase);
  const setOxygen = useGameStore((s) => s.setOxygen);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!oxygenEnabled || trainingMode || isPaused || phase !== 'playing') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const { oxygen: current, isPaused: paused } = useGameStore.getState();
      if (paused) return;
      setOxygen(current - DECREASE);
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [oxygenEnabled, trainingMode, isPaused, phase, setOxygen]);

  return { oxygen, oxygenEnabled, trainingMode, isPaused };
};
