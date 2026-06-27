import { useEffect, useState } from 'react';
import { useRobotJokes } from '../hooks/useRobotJokes';
import type { RobotJoke } from '../data/robot_jokes';
import { useGameStore, type RobotState } from '../store/gameStore';

const FRAMES_IDLE: string[][] = [
  [
    '         __',
    ' _(\\    |@@|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
  [
    '         __',
    ' _(\\    |--|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
];

const FRAMES_THINKING: string[][] = [
  [
    '  ?      __',
    ' _(\\    |@-|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
  [
    '         __  ?',
    ' _(\\    |-@|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
  [
    '  ?      __  ?',
    ' _(\\    |@@|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
];

const FRAMES_SUCCESS: string[][] = [
  [
    '      *  __  *',
    ' _(\\    |^^|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
  [
    '   * *   __   * *',
    ' _(\\    |^^|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
  [
    '       * __  *',
    ' _(\\    |^^|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
];

const FRAMES_ERROR: string[][] = [
  [
    '         __',
    ' _(\\    |xx|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
  [
    '        __',
    '_(\\    |xx|',
    '(__/\\__ \\--/ __',
    '  \\___|----|  |   __',
    '      \\ }{ /\\ )_ / _\\',
    '      /\\__/\\ \\__O (__',
    '     (--/\\--)    \\__/',
    '     _)(  )(_',
    "    `---''---`",
  ],
  [
    '          __',
    '  _(\\    |xx|',
    ' (__/\\__ \\--/ __',
    '    \\___|----|  |   __',
    '        \\ }{ /\\ )_ / _\\',
    '        /\\__/\\ \\__O (__',
    '       (--/\\--)    \\__/',
    '       _)(  )(_',
    "      `---''---`",
  ],
];

const FRAMES_WIN: string[][] = [
  [
    '  * *    __   * *',
    ' _(\\    |**|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
  [
    ' * * *   __   * * *',
    ' _(\\    |**|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
  [
    ' * * *   __   * * *',
    ' _(\\    |**|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '                   ',
    '                   ',
  ],
  [
    '  * *    __   * *',
    ' _(\\    |**|',
    '(__/\\__ \\--/ __',
    '   \\___|----|  |   __',
    '       \\ }{ /\\ )_ / _\\',
    '       /\\__/\\ \\__O (__',
    '      (--/\\--)    \\__/',
    '      _)(  )(_',
    "     `---''---`",
  ],
];

const ROBOT_FRAMES: Record<RobotState, string[][]> = {
  idle: FRAMES_IDLE,
  thinking: FRAMES_THINKING,
  success: FRAMES_SUCCESS,
  error: FRAMES_ERROR,
  win: FRAMES_WIN,
};

const ROBOT_INTERVALS: Record<RobotState, number> = {
  idle: 900,
  thinking: 220,
  success: 320,
  error: 130,
  win: 260,
};

const ROBOT_STATUS: Record<RobotState, string> = {
  idle: 'R.U.X // ГОТОВ',
  thinking: 'ОБРАБОТКА...',
  success: 'КОМАНДА ПРИНЯТА',
  error: 'ОШИБКА ВВОДА',
  win: 'МИССИЯ ВЫПОЛНЕНА!',
};

function formatBubble(joke: RobotJoke): string {
  const lines = Array.isArray(joke) ? joke : joke.split('\n');
  const maxLen = Math.max(...lines.map((l) => l.length));
  const width = Math.max(maxLen, 10);

  const top = ` .${'-'.repeat(width + 2)}.`;
  const bottom =
    ` '${'-'.repeat(Math.floor(width / 2))}` +
    `v${'-'.repeat(width - Math.floor(width / 2))}'`;
  const body = lines.map((l) => ` | ${l.padEnd(width)} |`).join('\n');

  return [top, body, bottom].join('\n');
}

function RobotAscii({ state }: { state: RobotState }) {
  const [frameIdx, setFrameIdx] = useState(0);
  const frames = ROBOT_FRAMES[state];
  const currentFrame = frames[frameIdx] ?? frames[0];

  useEffect(() => {
    if (frames.length <= 1) return;
    const id = setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, ROBOT_INTERVALS[state]);
    return () => clearInterval(id);
  }, [state, frames.length]);

  return (
    <pre className={`robot-ascii robot-ascii--${state}`}>
      {currentFrame.join('\n')}
    </pre>
  );
}

/** Animated ASCII robot companion in the sidebar */
export default function RobotWidget() {
  const robotState = useGameStore((s) => s.robotState);
  const setRobotState = useGameStore((s) => s.setRobotState);
  const { currentJoke } = useRobotJokes();

  useEffect(() => {
    if (robotState !== 'success' && robotState !== 'error') return;
    const id = setTimeout(() => setRobotState('idle'), 2500);
    return () => clearTimeout(id);
  }, [robotState, setRobotState]);

  const showBubble = robotState === 'idle' && currentJoke !== null;

  return (
    <div className="robot-widget">
      <div className="robot-header">ДРОИД  R.U.X</div>
      {showBubble ? (
        <pre className="robot-bubble" aria-live="polite" aria-label="Шуточка робота">
          {formatBubble(currentJoke)}
        </pre>
      ) : null}
      <RobotAscii key={robotState} state={robotState} />
      <div className={`robot-status robot-status--${robotState}`}>
        {ROBOT_STATUS[robotState]}
      </div>
    </div>
  );
}
