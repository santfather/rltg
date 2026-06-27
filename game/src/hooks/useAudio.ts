import { useEffect } from 'react';
import { audioSystem } from '../engine/AudioSystem';
import { useGameStore } from '../store/gameStore';

/** Audio init on gesture + oxygen alarm lifecycle */
export function useAudio(): void {
  const oxygen = useGameStore((s) => s.oxygen);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    const handler = () => audioSystem.init();
    window.addEventListener('keydown', handler, { once: true });
    window.addEventListener('click', handler, { once: true });
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('click', handler);
    };
  }, []);

  useEffect(() => {
    if (phase === 'playing' && oxygen < 20) {
      audioSystem.startOxygenAlarm();
    } else {
      audioSystem.stopOxygenAlarm();
    }
    return () => audioSystem.stopOxygenAlarm();
  }, [oxygen, phase]);
}
