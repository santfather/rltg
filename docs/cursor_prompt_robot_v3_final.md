# Cursor Prompt — RobotWidget: финальный дизайн (реальный ASCII-арт)

> **Роль:** @generator + @ui-designer  
> **Читай перед началом:** `main_readme.md`, `game/src/components/RobotWidget.tsx`, `game/src/store/gameStore.ts`  
> **Этот промт заменяет** `cursor_prompt_robot_v2.md` — использовать только этот файл.

---

## Исходный ASCII-арт (оригинал, не менять)

```
         __
 _(\    |@@|
(__/\__ \--/ __
   \___|----|  |   __
       \ }{ /\ )_ / _\
       /\__/\ \__O (__
      (--/\--)    \__/
      _)(  )(_
     `---''---`
```

Источник: файл `ASCII_robot.txt`. Характеристики: 22 символа ширина, 9 строк, Pure ASCII.  
**Изменяется только**: первая строка (звёзды/`?`) и глаза в строке 2 (`@@` → `--`, `^^`, `xx`, `**`, `@-`, `-@`).  
Всё остальное — неизменно во всех кадрах.

---

## Задача 1 — Frames в `RobotWidget.tsx`

Все `\` в JS-строках экранируются как `\\`. Backtick `` ` `` и `'` — без изменений.

```typescript
// ─────────────────────────────────────────────────────────────
// IDLE — 2 кадра, интервал 900ms
// Кадр 0: глаза открыты @@
// Кадр 1: моргание — глаза --
// ─────────────────────────────────────────────────────────────
const FRAMES_IDLE: string[][] = [
  [
    "         __",
    " _(\\    |@@|",
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
  [
    "         __",
    " _(\\    |--|",          // моргание
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
];

// ─────────────────────────────────────────────────────────────
// THINKING — 3 кадра, интервал 220ms
// Глаза косят в разные стороны. Знак ? мигает над головой.
// ─────────────────────────────────────────────────────────────
const FRAMES_THINKING: string[][] = [
  [
    "  ?      __",             // ? слева
    " _(\\    |@-|",           // правый глаз закрыт
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
  [
    "         __  ?",           // ? справа
    " _(\\    |-@|",            // левый глаз закрыт
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
  [
    "  ?      __  ?",           // ? с обеих сторон
    " _(\\    |@@|",            // глаза вперёд
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
];

// ─────────────────────────────────────────────────────────────
// SUCCESS — 3 кадра, интервал 320ms
// Глаза ^^. Звёзды * над головой мигают.
// ─────────────────────────────────────────────────────────────
const FRAMES_SUCCESS: string[][] = [
  [
    "      *  __  *",           // 1 звезда с каждой стороны
    " _(\\    |^^|",
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
  [
    "   * *   __   * *",        // 2 звезды с каждой стороны
    " _(\\    |^^|",
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
  [
    "       * __  *",           // снова 1 (пульс)
    " _(\\    |^^|",
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
];

// ─────────────────────────────────────────────────────────────
// ERROR — 3 кадра, интервал 130ms
// Глаза xx. Всё тело трясётся: сдвиг на ±1 символ.
// CSS shake-анимация дополняет покадровый сдвиг.
// ─────────────────────────────────────────────────────────────
const FRAMES_ERROR: string[][] = [
  [
    "         __",              // центр
    " _(\\    |xx|",
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
  [
    "        __",               // сдвиг влево на 1
    "_(\\    |xx|",
    "(__/\\__ \\--/ __",
    "  \\___|----|  |   __",
    "      \\ }{ /\\ )_ / _\\",
    "      /\\__/\\ \\__O (__",
    "     (--/\\--)    \\__/",
    "     _)(  )(_",
    "    `---''---`",
  ],
  [
    "          __",             // сдвиг вправо на 1
    "  _(\\    |xx|",
    " (__/\\__ \\--/ __",
    "    \\___|----|  |   __",
    "        \\ }{ /\\ )_ / _\\",
    "        /\\__/\\ \\__O (__",
    "       (--/\\--)    \\__/",
    "       _)(  )(_",
    "      `---''---`",
  ],
];

// ─────────────────────────────────────────────────────────────
// WIN — 4 кадра, интервал 260ms
// Глаза **. Много звёзд. Кадр 2: "прыжок" — ноги исчезают.
// ─────────────────────────────────────────────────────────────
const FRAMES_WIN: string[][] = [
  [
    "  * *    __   * *",
    " _(\\    |**|",
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
  [
    " * * *   __   * * *",      // больше звёзд
    " _(\\    |**|",
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
  [
    " * * *   __   * * *",      // прыжок: ног нет
    " _(\\    |**|",
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "                   ",      // ноги исчезли
    "                   ",      // база исчезла
  ],
  [
    "  * *    __   * *",        // приземление
    " _(\\    |**|",
    "(__/\\__ \\--/ __",
    "   \\___|----|  |   __",
    "       \\ }{ /\\ )_ / _\\",
    "       /\\__/\\ \\__O (__",
    "      (--/\\--)    \\__/",
    "      _)(  )(_",
    "     `---''---`",
  ],
];
```

---

## Задача 2 — Маппинг и константы

```typescript
export type RobotState = 'idle' | 'thinking' | 'success' | 'error' | 'win';

const ROBOT_FRAMES: Record<RobotState, string[][]> = {
  idle:     FRAMES_IDLE,
  thinking: FRAMES_THINKING,
  success:  FRAMES_SUCCESS,
  error:    FRAMES_ERROR,
  win:      FRAMES_WIN,
};

const ROBOT_INTERVALS: Record<RobotState, number> = {
  idle:     900,
  thinking: 220,
  success:  320,
  error:    130,
  win:      260,
};

const ROBOT_STATUS: Record<RobotState, string> = {
  idle:     'R.U.X // ГОТОВ',
  thinking: 'ОБРАБОТКА...',
  success:  'КОМАНДА ПРИНЯТА',
  error:    'ОШИБКА ВВОДА',
  win:      'МИССИЯ ВЫПОЛНЕНА!',
};
```

---

## Задача 3 — CSS (`index.css`)

```css
/* ── RobotWidget ─────────────────────────── */

.robot-widget {
  display: flex;
  flex-direction: column;
  align-items: flex-start;   /* выравнивание по левому краю — арт несимметричный */
  padding: 8px 8px 6px;
  border-bottom: 1px solid var(--crt-dim);
  background: var(--bg-terminal);
  overflow: hidden;
}

.robot-header {
  font-family: var(--font-terminal);
  font-size: 11px;
  color: var(--crt-dim);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 4px;
  align-self: center;
}

.robot-ascii {
  font-family: 'VT323', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.2;
  min-height: 117px;         /* 9 строк × 13px = фиксируем высоту */
  margin: 0;
  white-space: pre;
  user-select: none;
  transition: color 0.15s ease, text-shadow 0.15s ease;
}

.robot-ascii--idle     { color: var(--crt-green); opacity: 0.7; }
.robot-ascii--thinking { color: var(--crt-amber); text-shadow: var(--glow-amber); }
.robot-ascii--success  { color: var(--crt-green); text-shadow: var(--glow-green); }
.robot-ascii--error    { color: var(--crt-red);   text-shadow: var(--glow-red); }
.robot-ascii--win      { color: var(--crt-amber); text-shadow: var(--glow-amber); }

/* Error: CSS-тряска дополняет покадровый сдвиг */
@keyframes rux-shake {
  0%,100% { transform: translateX(0); }
  33%     { transform: translateX(-2px); }
  66%     { transform: translateX(2px); }
}
.robot-ascii--error {
  animation: rux-shake 0.13s linear infinite;
}

/* Win: пульсация */
@keyframes rux-pulse {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.4; }
}
.robot-ascii--win {
  animation: rux-pulse 0.52s ease-in-out infinite;
}

/* Статус */
.robot-status {
  font-family: var(--font-terminal);
  font-size: 11px;
  margin-top: 5px;
  height: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  align-self: center;
}
.robot-status--idle     { color: #002200; }
.robot-status--thinking { color: var(--crt-amber); }
.robot-status--success  { color: var(--crt-green); }
.robot-status--error    { color: var(--crt-red); }
.robot-status--win      { color: var(--crt-amber); }
```

---

## Задача 4 — Хук анимации (внутри `RobotWidget.tsx`)

```typescript
const [frameIdx, setFrameIdx] = useState(0);
const robotState = useGameStore((s) => s.robotState);
const setRobotState = useGameStore((s) => s.setRobotState);

// Сброс кадра при смене состояния
useEffect(() => {
  setFrameIdx(0);
}, [robotState]);

// Цикл кадров
useEffect(() => {
  const frames = ROBOT_FRAMES[robotState];
  if (frames.length <= 1) return;
  const id = setInterval(
    () => setFrameIdx((i) => (i + 1) % frames.length),
    ROBOT_INTERVALS[robotState],
  );
  return () => clearInterval(id);
}, [robotState]);

// Автосброс success/error → idle через 2500ms
useEffect(() => {
  if (robotState !== 'success' && robotState !== 'error') return;
  const id = setTimeout(() => setRobotState('idle'), 2500);
  return () => clearTimeout(id);
}, [robotState, setRobotState]);
```

---

## Задача 5 — JSX

```tsx
const frames = ROBOT_FRAMES[robotState];
const currentFrame = frames[frameIdx] ?? frames[0];

return (
  <div className="robot-widget">
    <div className="robot-header">ДРОИД  R.U.X</div>
    <pre className={`robot-ascii robot-ascii--${robotState}`}>
      {currentFrame.join('\n')}
    </pre>
    <div className={`robot-status robot-status--${robotState}`}>
      {ROBOT_STATUS[robotState]}
    </div>
  </div>
);
```

---

## Задача 6 — `store/gameStore.ts`

Добавить (если ещё не добавлено):

```typescript
robotState: 'idle' as RobotState,
setRobotState: (robotState) => set({ robotState }),
```

Сбрасывать в `idle` при `initLevel`:

```typescript
initLevel: (loaded, context) =>
  set({
    // ...существующие поля...
    robotState: 'idle',   // ← добавить
  }),
```

---

## Задача 7 — `Terminal.tsx` (три точки вставки)

```typescript
const setRobotState = useGameStore((s) => s.setRobotState);

// ТОЧКА 1 — начало handleSubmit, перед executeCommand:
setRobotState('thinking');

// ТОЧКА 2 — сразу после executeCommand:
const hasError = result.lines.some((l) => l.kind === 'error');
setRobotState(hasError ? 'error' : 'success');

// ТОЧКА 3 — внутри if (won) { }, перед onWin():
setRobotState('win');
```

---

## Чеклист

- [ ] Все `\` в JS-строках экранированы как `\\`
- [ ] Все 5 состояний рендерятся без ошибок
- [ ] `min-height: 117px` на `.robot-ascii` — нет вертикальных прыжков
- [ ] `align-items: flex-start` — арт несимметричный, лево-выравнивание корректно
- [ ] CSS shake не конфликтует с покадровым сдвигом error-кадров
- [ ] `robotState` сбрасывается в `idle` при `initLevel`
- [ ] `npm run typecheck` — 0 ошибок
- [ ] `npm run lint` — 0 warnings

---

## Ожидаемый вид в терминале

```
┌────────────────────────┐
│      ДРОИД  R.U.X      │
│                        │
│          __            │
│  _(\    |@@|           │  ← idle: глаза открыты
│ (__/\__ \--/ __        │
│    \___|----|  |   __  │
│        \ }{ /\ )_ / _\ │
│        /\__/\ \__O (__ │
│       (--/\--)    \__/ │
│       _)(  )(_         │
│      `---''---`        │
│                        │
│     R.U.X // ГОТОВ     │
├────────────────────────┤
│   ЦЕЛИ МИССИИ          │
│   [✓] ls               │
│   [ ] chmod            │
└────────────────────────┘
```
