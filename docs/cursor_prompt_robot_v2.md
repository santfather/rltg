# Cursor Prompt — Антропоморфный ASCII-робот R.U.X (v2)

> **Роль:** @generator + @ui-designer  
> **Читай перед началом:** `main_readme.md`, `game/src/App.tsx`, `game/src/components/MissionLog.tsx`, `game/src/store/gameStore.ts`, `game/src/components/Terminal.tsx`  
> **Шрифт в игре:** VT323 (моноширинный). Все ASCII-фреймы рассчитаны под него.

---

## Главный принцип дизайна робота

Робот **антропоморфный** — у него есть голова, лицо, туловище, руки и ноги. Эмоции передаются через:
- **Глаза** — меняются на каждое состояние (`o`, `-`, `x`, `^`, `*`)
- **Рот** — меняется (`~`, `...`, `‿`, `‾‾`, `‿‿‿`)
- **Руки** — опущены в idle, подняты в success, разведены в error
- **Поза тела** — сдвиг при error, прыжок при win

Ширина каждого кадра: **13 символов**. Высота: **13 строк**. Все кадры одинакового размера — это обязательно для стабильной анимации без прыжков.

---

## Задача 1 — `store/gameStore.ts`

Добавить тип и поле:

```typescript
export type RobotState = 'idle' | 'thinking' | 'success' | 'error' | 'win';

// В интерфейс GameState:
robotState: RobotState;
setRobotState: (state: RobotState) => void;

// В начальный стейт:
robotState: 'idle',

// В реализацию:
setRobotState: (robotState) => set({ robotState }),
```

---

## Задача 2 — `components/RobotWidget.tsx` (новый файл)

### ASCII-фреймы

Определи все фреймы как `const` — массивы строк. Каждая строка ровно 13 символов (дополнять пробелами при необходимости). Используй `white-space: pre` в CSS.

```typescript
// ─────────────────────────────────────────────
// IDLE — 2 кадра, интервал 900ms
// Состояние покоя. Антенна, открытые глаза, нейтральный рот.
// Кадр 1: моргание (глаза = чёрточки)
// ─────────────────────────────────────────────
const FRAMES_IDLE: string[][] = [
  [
    "     _|_     ",  // антенна
    "    /   \\    ",  // лоб
    "   | o o |   ",  // глаза открыты
    "   |  ~  |   ",  // рот — нейтральный
    "    \\___/    ",  // подбородок
    "  _/|   |\\_  ",  // плечи + руки
    " /  |   |  \\ ",  // руки опущены
    "|   |___|   |",  // торс с панелью
    " \\___|___/  ",  // талия
    "    /   \\    ",  // бёдра
    "   |     |   ",  // бёдра нижние
    "  _|_   _|_  ",  // голени
    " |___| |___| ",  // ступни
  ],
  [
    "     _|_     ",
    "    /   \\    ",
    "   | - - |   ",  // глаза закрыты — моргание
    "   |  ~  |   ",
    "    \\___/    ",
    "  _/|   |\\_  ",
    " /  |   |  \\ ",
    "|   |___|   |",
    " \\___|___/  ",
    "    /   \\    ",
    "   |     |   ",
    "  _|_   _|_  ",
    " |___| |___| ",
  ],
];

// ─────────────────────────────────────────────
// THINKING — 3 кадра, интервал 220ms
// Глаза смотрят в разные стороны. Знак вопроса над головой.
// Рот = три точки (думает). Тело без изменений.
// ─────────────────────────────────────────────
const FRAMES_THINKING: string[][] = [
  [
    "   ? _|_     ",  // знак вопроса слева от антенны
    "    /   \\    ",
    "   | o - |   ",  // один глаз смотрит в сторону
    "   | ... |   ",  // рот = "думаю"
    "    \\___/    ",
    "  _/|   |\\_  ",
    " /  |   |  \\ ",
    "|   |___|   |",
    " \\___|___/  ",
    "    /   \\    ",
    "   |     |   ",
    "  _|_   _|_  ",
    " |___| |___| ",
  ],
  [
    "     _|_ ?   ",  // знак вопроса справа
    "    /   \\    ",
    "   | - o |   ",  // другой глаз
    "   | ... |   ",
    "    \\___/    ",
    "  _/|   |\\_  ",
    " /  |   |  \\ ",
    "|   |___|   |",
    " \\___|___/  ",
    "    /   \\    ",
    "   |     |   ",
    "  _|_   _|_  ",
    " |___| |___| ",
  ],
  [
    "   ? _|_ ?   ",  // оба знака
    "    /   \\    ",
    "   | o o |   ",  // глаза снова вперёд
    "   | ... |   ",
    "    \\___/    ",
    "  _/|   |\\_  ",
    " /  |   |  \\ ",
    "|   |___|   |",
    " \\___|___/  ",
    "    /   \\    ",
    "   |     |   ",
    "  _|_   _|_  ",
    " |___| |___| ",
  ],
];

// ─────────────────────────────────────────────
// SUCCESS — 3 кадра, интервал 320ms
// Руки подняты вверх (\ и /). Счастливые глаза ^.
// Рот = ‿ (улыбка). На груди звезда [★].
// ─────────────────────────────────────────────
const FRAMES_SUCCESS: string[][] = [
  [
    "  \\  _|_  /  ",  // руки вверх
    "   \\/   \\/  ",  // руки соединяются с головой
    "   | ^w^ |   ",  // радостное лицо
    "   |  ‿  |   ",  // улыбка
    "    \\___/    ",
    "     |_|     ",  // шея видна (руки убраны в стороны)
    "   __|_|__   ",  // плечи
    "  |  [★] |  ",  // грудная панель со звездой
    "  |_____|   ",
    "    /   \\    ",
    "   |     |   ",
    "  _|_   _|_  ",
    " |___| |___| ",
  ],
  [
    " \\   _|_   / ",  // руки ещё выше
    "  \\ /   \\ /  ",
    "   | ^w^ |   ",
    "   | \\‿/ |   ",  // улыбка шире
    "    \\___/    ",
    "     |_|     ",
    "   __|_|__   ",
    "  |  [★] |  ",
    "  |_____|   ",
    "    /   \\    ",
    "   |     |   ",
    "  _|_   _|_  ",
    " |___| |___| ",
  ],
  [
    "  \\  _|_  /  ",  // обратно
    "   \\/   \\/  ",
    "   | ^‿^ |   ",
    "   |  ‿  |   ",
    "    \\___/    ",
    "     |_|     ",
    "   __|_|__   ",
    "  |  [★] |  ",
    "  |_____|   ",
    "    /   \\    ",
    "   |     |   ",
    "  _|_   _|_  ",
    " |___| |___| ",
  ],
];

// ─────────────────────────────────────────────
// ERROR — 3 кадра, интервал 130ms
// Глаза = x. Рот прямой (расстроен). 
// Тело трясётся: кадры смещены на 1 символ влево/вправо/центр.
// Руки опущены и разведены (растерянность).
// ─────────────────────────────────────────────
const FRAMES_ERROR: string[][] = [
  [
    "     _|_     ",  // центр
    "    /   \\    ",
    "   | x x |   ",  // x-глаза
    "   |  ‾‾ |   ",  // рот — прямая линия (расстроен)
    "    \\___/    ",
    "  _/|   |\\_  ",
    "./  |   |  \\.",  // руки опущены и чуть вниз
    "|   |___|   |",
    " \\___|___/  ",
    "    /   \\    ",
    "   |     |   ",
    "  _|_   _|_  ",
    " |___| |___| ",
  ],
  [
    "    _|_      ",  // смещение влево на 1
    "   /   \\     ",
    "  | x x |    ",
    "  |  ‾‾ |    ",
    "   \\___/     ",
    " _/|   |\\_   ",
    "/  |   |  \\. ",
    "   |___|   | ",
    "\\___|___/   ",
    "   /   \\     ",
    "  |     |    ",
    " _|_   _|_   ",
    "|___| |___|  ",
  ],
  [
    "      _|_    ",  // смещение вправо на 1
    "     /   \\   ",
    "    | x x |  ",
    "    |  ‾‾ |  ",
    "     \\___/   ",
    "   _/|   |\\_  ",
    " . /  |   |  \\",
    "  |   |___|   ",
    "  \\___|___/   ",
    "     /   \\   ",
    "    |     |  ",
    "   _|_   _|_ ",
    "  |___| |___|",
  ],
];

// ─────────────────────────────────────────────
// WIN — 4 кадра, интервал 260ms
// Прыжок: тело смещается вверх на 1-2 строки (добавить пустые строки снизу).
// Глаза * (сияние). Рот широкая улыбка ‿‿‿.
// Руки вверх. Звёзды вокруг.
// ─────────────────────────────────────────────
const FRAMES_WIN: string[][] = [
  [
    "  * _|_ *   ",   // звёзды
    "    /   \\    ",
    "   |*o o*|   ",  // сияющие глаза
    "   | ‿‿‿ |   ",  // широкая улыбка
    "    \\___/    ",
    "  \\  |_|  /  ",  // руки вверх
    "   \\_|_|_/   ",
    "  |  [★] |  ",
    "  |_____|   ",
    "    /   \\    ",
    "   |     |   ",
    "  _|_   _|_  ",
    " |___| |___| ",
  ],
  [
    "             ",  // прыжок — первая строка пустая
    "  * _|_ *   ",
    "    /   \\    ",
    "   |*o o*|   ",
    "   | ‿‿‿ |   ",
    "    \\___/    ",
    "  \\  |_|  /  ",
    "   \\_|_|_/   ",
    "  |  [★] |  ",
    "  |_____|   ",
    "    /   \\    ",
    "   |     |   ",
    " * * * * *  ",  // звёзды внизу вместо ног
  ],
  [
    "             ",  // прыжок выше
    "             ",
    "  * _|_ *   ",
    "    /   \\    ",
    "   |*‿ ‿*|   ",
    "   | ‿‿‿ |   ",
    "    \\___/    ",
    "  \\  |_|  /  ",
    "   \\_|_|_/   ",
    "  |  [★] |  ",
    "  |_____|   ",
    "             ",
    " * * * * *  ",
  ],
  [
    "  * _|_ *   ",  // приземление
    "    /   \\    ",
    "   |*o o*|   ",
    "   | ‿‿‿ |   ",
    "    \\___/    ",
    "  \\  |_|  /  ",
    "   \\_|_|_/   ",
    "  |  [★] |  ",
    "  |_____|   ",
    "    /   \\    ",
    "   |     |   ",
    "  _|_   _|_  ",
    " |___| |___| ",
  ],
];
```

### Маппинг состояний

```typescript
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

### Хук анимации

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
  const id = setInterval(() => {
    setFrameIdx((i) => (i + 1) % frames.length);
  }, ROBOT_INTERVALS[robotState]);
  return () => clearInterval(id);
}, [robotState]);

// Автосброс в idle после success / error
useEffect(() => {
  if (robotState !== 'success' && robotState !== 'error') return;
  const id = setTimeout(() => setRobotState('idle'), 2500);
  return () => clearTimeout(id);
}, [robotState, setRobotState]);
```

### JSX

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

## Задача 3 — CSS (`index.css`)

```css
/* ── RobotWidget ─────────────────────────── */

.robot-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px 8px;
  border-bottom: 1px solid var(--crt-dim);
  background: var(--bg-terminal);
  min-height: 210px;         /* фиксировать высоту — без прыжков при смене кадра */
  overflow: hidden;
}

.robot-header {
  font-family: var(--font-terminal);
  font-size: 11px;
  color: var(--crt-dim);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.robot-ascii {
  font-family: 'VT323', 'Courier New', monospace;
  font-size: 12px;           /* мелко — чтобы уместилась ширина 13 символов */
  line-height: 1.15;
  margin: 0;
  text-align: left;
  white-space: pre;
  user-select: none;
  transition: color 0.15s ease, text-shadow 0.15s ease;
}

/* Цвета по состоянию */
.robot-ascii--idle     { color: var(--crt-green); opacity: 0.65; }
.robot-ascii--thinking { color: var(--crt-amber); text-shadow: var(--glow-amber); }
.robot-ascii--success  { color: var(--crt-green); text-shadow: var(--glow-green); }
.robot-ascii--error    { color: var(--crt-red);   text-shadow: var(--glow-red); }
.robot-ascii--win      { color: var(--crt-amber); text-shadow: var(--glow-amber); }

/* Error — тряска через CSS (дополняет покадровый сдвиг) */
@keyframes rux-shake {
  0%,100% { transform: translateX(0px);  }
  33%     { transform: translateX(-2px); }
  66%     { transform: translateX(2px);  }
}
.robot-ascii--error {
  animation: rux-shake 0.13s linear infinite;
}

/* Win — пульсация яркости */
@keyframes rux-pulse {
  0%,100% { opacity: 1;   }
  50%     { opacity: 0.45; }
}
.robot-ascii--win {
  animation: rux-pulse 0.5s ease-in-out infinite;
}

/* Статусная строка */
.robot-status {
  font-family: var(--font-terminal);
  font-size: 11px;
  margin-top: 5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  height: 14px;              /* фиксировать высоту — без прыжков */
}
.robot-status--idle     { color: #003b00; }
.robot-status--thinking { color: var(--crt-amber); }
.robot-status--success  { color: var(--crt-green); }
.robot-status--error    { color: var(--crt-red); }
.robot-status--win      { color: var(--crt-amber); }

/* prefers-reduced-motion — уже обёрнуто в index.css */
```

---

## Задача 4 — `MissionLog.tsx`

Импортировать `RobotWidget` и разделить `<aside>` на две секции:

```tsx
import RobotWidget from './RobotWidget';
import type { LearningObjective } from '../types/level.types';

interface MissionLogProps {
  objectives: LearningObjective[];
  completedCommands: string[];
}

export default function MissionLog({ objectives, completedCommands }: MissionLogProps) {
  return (
    <aside className="mission-sidebar">
      <RobotWidget />
      <div className="mission-objectives">
        <h2 className="mission-objectives__title">ЦЕЛИ МИССИИ</h2>
        <ul className="mission-objectives__list">
          {objectives.map((obj) => {
            const done = completedCommands.includes(obj.command);
            return (
              <li key={obj.command} className={`mission-obj ${done ? 'mission-obj--done' : 'mission-obj--pending'}`}>
                <span>{done ? '[✓]' : '[ ]'}</span>
                <span>{obj.command}</span>
              </li>
            );
          })}
        </ul>
        <hr className="mission-divider" />
        <p className="mission-hint-tip">ПОДСКАЗКИ: hint 1 / 2 / 3</p>
      </div>
    </aside>
  );
}
```

CSS для секции целей (добавить в `index.css`):

```css
/* ── MissionLog sidebar ──────────────────── */

.mission-sidebar {
  width: 210px;
  flex-shrink: 0;
  border-left: 1px solid var(--crt-dim);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-terminal);
  background: var(--bg-deep);
}

.mission-objectives {
  flex: 1;
  padding: 10px 10px 8px;
  overflow-y: auto;
}

.mission-objectives__title {
  font-size: 12px;
  color: var(--crt-green);
  margin: 0 0 8px;
  letter-spacing: 0.08em;
}

.mission-objectives__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.mission-obj {
  font-size: 13px;
  display: flex;
  gap: 6px;
}
.mission-obj--done    { color: var(--crt-green); }
.mission-obj--pending { color: #2a2a2a; }

.mission-divider {
  border: none;
  border-top: 1px solid var(--crt-dim);
  margin: 8px 0;
}

.mission-hint-tip {
  font-size: 11px;
  color: #002200;
  margin: 0;
}
```

---

## Задача 5 — `Terminal.tsx` (три точки вставки)

```typescript
// Добавить в деструктуризацию из useGameStore:
const setRobotState = useGameStore((s) => s.setRobotState);

// Добавить в массив зависимостей useCallback handleSubmit:
// [..., setRobotState]

// ── ТОЧКА 1: первая строка handleSubmit после guard ──
// Сразу при нажатии Enter:
setRobotState('thinking');

// ── ТОЧКА 2: сразу после executeCommand ──
const hasError = result.lines.some((l) => l.kind === 'error');
setRobotState(hasError ? 'error' : 'success');

// ── ТОЧКА 3: внутри блока if (won) { ... }, перед onWin() ──
setRobotState('win');
onWin();
return;
```

---

## Чеклист

- [ ] `RobotWidget.tsx` создан, все 5 состояний реализованы
- [ ] Все фреймы одинаковой ширины (13 символов) и высоты (13 строк)
- [ ] `white-space: pre` у `.robot-ascii` — обязательно
- [ ] Контейнер `.robot-widget` имеет `min-height: 210px` — без вертикальных прыжков
- [ ] Auto-reset: success/error → idle через 2500ms
- [ ] `win`-состояние не сбрасывается автоматически (сбрасывается при initLevel)
- [ ] `robotState` сбрасывается в `idle` в `initLevel` (`gameStore.ts`)
- [ ] CSS-анимации отключены при `prefers-reduced-motion` (уже есть в `index.css`)
- [ ] `npm run typecheck` — 0 ошибок
- [ ] `npm run lint` — 0 warnings

---

## Итоговая структура сайдбара

```
┌────────────────────┐
│   ДРОИД  R.U.X     │  ← заголовок
│                    │
│      _|_           │
│     /   \          │  ← голова с антенной
│    | o o |         │  ← глаза (меняются)
│    |  ~  |         │  ← рот (меняется)
│     \___/          │  ← подбородок
│   _/|   |\_        │  ← плечи
│  /  |   |  \       │  ← руки (меняются)
│ |   |___|   |      │  ← торс с панелью
│  \___|___/         │  ← талия
│     /   \          │  ← ноги
│    |     |         │
│   _|_   _|_        │
│  |___| |___|       │  ← ступни
│                    │
│  [ R.U.X // ГОТОВ ]│  ← статус
├────────────────────┤
│  ЦЕЛИ МИССИИ       │
│  [✓] ls            │
│  [✓] cd            │
│  [ ] chmod         │
│  ─────────────     │
│  hint 1 / 2 / 3    │
└────────────────────┘
```
