# Cursor Prompt — RobotWidget: анимированный робот + сплит сайдбара

> **Роль:** @generator + @ui-designer  
> **Читай перед началом:** `main_readme.md`, `game/src/App.tsx`, `game/src/components/MissionLog.tsx`, `game/src/store/gameStore.ts`, `game/src/components/Terminal.tsx`  
> **Язык кода:** English. **Язык UI:** Русский (только из YAML или статичные лейблы компонента).

---

## Что нужно сделать (обзор)

Правый сайдбар (`MissionLog`) сейчас — один блок. Нужно:

1. **Разделить** его на две секции по вертикали:
   - **Верхняя** — окно робота (`RobotWidget`), ~180px высоты
   - **Нижняя** — цели миссии + подсказки (существующий контент `MissionLog`)

2. **Создать `RobotWidget`** — ASCII-робот с 5 анимированными состояниями, меняющимися в зависимости от результата последней команды в терминале.

3. **Добавить в `gameStore`** поле `robotState` и экшен `setRobotState`.

4. **Обновить `Terminal.tsx`** — после каждой команды диспатчить нужное состояние робота на основе типов выходных строк (`OutputKind`).

---

## Задача 1 — `store/gameStore.ts`

Добавить в `GameState`:

```typescript
export type RobotState = 'idle' | 'success' | 'error' | 'thinking' | 'win';

// В интерфейс GameState:
robotState: RobotState;
setRobotState: (state: RobotState) => void;
```

Добавить в начальный стейт:
```typescript
robotState: 'idle',
```

Добавить реализацию:
```typescript
setRobotState: (robotState) => set({ robotState }),
```

---

## Задача 2 — `components/RobotWidget.tsx` (новый файл)

### Логика состояний

| `RobotState` | Когда | Поведение |
|---|---|---|
| `idle` | Начало уровня, после таймаута | Лёгкое покачивание антенн |
| `thinking` | Сразу после нажатия Enter (мгновенно) | Мигание глаз / вращение |
| `success` | Команда выполнена без ошибок | Руки вверх + пульс |
| `error` | Команда вернула `OutputKind = 'error'` | Вибрация / красные глаза |
| `win` | `phase === 'victory'` | Прыжки / яркое свечение |

После `success` или `error` — через **2500ms** автоматически вернуть в `idle` через `setRobotState('idle')`.  
После `thinking` — через **400ms** перейти в `success` или `error` (этим управляет `Terminal.tsx`, не `RobotWidget`).

### ASCII-фреймы

Реализуй пять наборов фреймов. Каждый набор — массив строк (кадры анимации). Анимация — CSS `@keyframes` или `useEffect` с `setInterval`, переключающий индекс кадра.

#### IDLE (2 кадра, интервал 800ms)
```
Кадр 0:          Кадр 1:
  \o/               \o/
  (|)               (|)
  /|\               /|\  
  / \               /.\
```

Используй полноценный ASCII, примерно такой (можно улучшить):

```
// FRAME 0
"  .-'-.  "
" /o   o\\ "
"(   ^   )"
" \\ ___ / "
"  |   |  "
" /|   |\\ "
"  '   '  "

// FRAME 1  (антенны чуть смещены)
"  .-'-.  "
" /o   o\\ "
"(   ^   )"
" \\ ___ / "
"  |   |  "
" /|   |\\ "
"  .   .  "
```

#### THINKING (3 кадра, интервал 200ms)
```
// Глаза мигают: o → - → o
// Над головой вращается символ: ? → ?? → ???
```

#### SUCCESS (3 кадра, интервал 300ms)
```
// Руки вверх: \o/ → \O/ → \o/
// Над головой: ★ → ✓ → ★
```

#### ERROR (3 кадра, интервал 150ms)
```
// Тряска: корпус смещается влево-вправо на 1 символ
// Глаза: x → X → x
```

#### WIN (4 кадра, интервал 250ms)
```
// Прыжок: корпус смещается вверх на 1 строку (добавить пустую строку снизу)
// Над головой: ★★★
// Интенсивное свечение
```

> **Важно:** точный вид фреймов — на твоё усмотрение в стиле CRT/Sci-Fi. Главное — читаемо, моноширинно, в духе ретро-терминала.

### Цвета по состоянию

| Состояние | Цвет текста | Glow |
|---|---|---|
| `idle` | `--crt-green` (dim, opacity 0.7) | нет |
| `thinking` | `--crt-amber` | `--glow-amber` |
| `success` | `--crt-green` | `--glow-green` |
| `error` | `--crt-red` | `--glow-red` |
| `win` | `--crt-amber` | `--glow-amber` (пульсирует) |

### Подпись под роботом

Маленький текст под ASCII-арт, меняется по состоянию:

| Состояние | Текст |
|---|---|
| `idle` | `R.U.X // ГОТОВ` |
| `thinking` | `ОБРАБОТКА...` |
| `success` | `КОМАНДА ПРИНЯТА` |
| `error` | `ОШИБКА ВВОДА` |
| `win` | `МИССИЯ ВЫПОЛНЕНА!` |

### Интерфейс компонента

```typescript
// Компонент не принимает пропсов.
// Читает robotState из useGameStore напрямую.
export default function RobotWidget(): JSX.Element
```

### Структура JSX

```tsx
<div className="robot-widget">
  {/* Заголовок секции */}
  <div className="robot-header">БОРТОВОЙ ДРОИД R.U.X</div>
  
  {/* ASCII-арт (моноширинный, pre) */}
  <pre className={`robot-ascii robot-ascii--${robotState}`}>
    {frames[currentFrame]}
  </pre>
  
  {/* Статусная строка */}
  <div className={`robot-status robot-status--${robotState}`}>
    {STATUS_TEXT[robotState]}
  </div>
</div>
```

### CSS (добавить в `index.css`)

```css
.robot-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-bottom: 1px solid var(--crt-dim);
  min-height: 180px;
  background: var(--bg-terminal);
}

.robot-header {
  font-family: var(--font-terminal);
  font-size: 11px;
  color: var(--crt-dim);
  letter-spacing: 0.05em;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.robot-ascii {
  font-family: var(--font-terminal);
  font-size: 13px;
  line-height: 1.2;
  text-align: center;
  margin: 0;
  transition: color 0.2s ease;
  user-select: none;
}

.robot-ascii--idle    { color: var(--crt-green); opacity: 0.75; }
.robot-ascii--thinking { color: var(--crt-amber); text-shadow: var(--glow-amber); }
.robot-ascii--success { color: var(--crt-green); text-shadow: var(--glow-green); }
.robot-ascii--error   { color: var(--crt-red);   text-shadow: var(--glow-red); }
.robot-ascii--win     { color: var(--crt-amber); text-shadow: var(--glow-amber); }

.robot-status {
  font-family: var(--font-terminal);
  font-size: 12px;
  margin-top: 6px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.robot-status--idle     { color: var(--crt-dim); }
.robot-status--thinking { color: var(--crt-amber); }
.robot-status--success  { color: var(--crt-green); }
.robot-status--error    { color: var(--crt-red); }
.robot-status--win      { color: var(--crt-amber); }

/* Анимация тряски для error */
@keyframes robot-shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-3px); }
  75%       { transform: translateX(3px); }
}
.robot-ascii--error {
  animation: robot-shake 0.15s ease infinite;
}

/* Анимация пульса для win */
@keyframes robot-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
.robot-ascii--win {
  animation: robot-pulse 0.5s ease infinite;
}

/* Отключить анимации при prefers-reduced-motion — уже есть в index.css */
```

---

## Задача 3 — `components/MissionLog.tsx`

Разбить на две вертикальные секции внутри `<aside>`:

```tsx
import RobotWidget from './RobotWidget';

export default function MissionLog({ objectives, completedCommands }: MissionLogProps) {
  return (
    <aside className="mission-sidebar">
      
      {/* Секция 1: Робот */}
      <RobotWidget />

      {/* Секция 2: Цели миссии */}
      <div className="mission-objectives">
        <h2>ЦЕЛИ МИССИИ</h2>
        <ul>
          {objectives.map((obj) => {
            const done = completedCommands.includes(obj.command);
            return (
              <li key={obj.command} className={done ? 'done' : 'pending'}>
                {done ? '[✓]' : '[ ]'} {obj.command}
              </li>
            );
          })}
        </ul>
        <hr />
        <p className="hint-hint">ПОДСКАЗКИ: hint 1 / 2 / 3</p>
      </div>

    </aside>
  );
}
```

CSS для сайдбара (обновить/добавить в `index.css`):

```css
.mission-sidebar {
  width: 220px;           /* чуть уже — робот моноширинный, не нужно широко */
  flex-shrink: 0;
  border-left: 1px solid var(--crt-dim);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-terminal);
}

.mission-objectives {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.mission-objectives h2 {
  color: var(--crt-green);
  font-size: 13px;
  margin: 0 0 10px 0;
  letter-spacing: 0.05em;
}

.mission-objectives ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mission-objectives li {
  font-size: 13px;
  margin-bottom: 6px;
}

.mission-objectives li.done    { color: var(--crt-green); }
.mission-objectives li.pending { color: #3a3a3a; }

.hint-hint {
  font-size: 11px;
  color: var(--crt-dim);
  margin-top: 8px;
}
```

---

## Задача 4 — `components/Terminal.tsx`

После выполнения команды (в `handleSubmit`, после `const result = executeCommand(...)`) диспатчить состояние робота:

```typescript
const setRobotState = useGameStore((s) => s.setRobotState);

// Сразу при нажатии Enter (ДО executeCommand):
setRobotState('thinking');

// После executeCommand, определить исход:
const hasError = result.lines.some((l) => l.kind === 'error');
const isWin = /* проверка win_condition — уже есть ниже по коду */;

// Если win — выставится через onWin() → phase = 'victory'
// Поэтому проверяй в таком порядке:
if (!hasError) {
  setRobotState('success');
} else {
  setRobotState('error');
}
// win-состояние выставить отдельно сразу перед onWin():
// setRobotState('win'); onWin();
```

Точное место вставки в существующем `handleSubmit`:

```typescript
// 1. СРАЗУ при входе в handleSubmit (первая строка после guard):
setRobotState('thinking');

// 2. После строки: const result = executeCommand(line, ctx);
const hasError = result.lines.some((l) => l.kind === 'error');
setRobotState(hasError ? 'error' : 'success');

// 3. В блоке if (won) { ... }, ПЕРЕД onWin():
setRobotState('win');
```

Добавить `setRobotState` в массив зависимостей `useCallback`.

---

## Чеклист

- [ ] `RobotWidget.tsx` создан, экспортируется как default
- [ ] `RobotState` тип добавлен в `gameStore.ts`
- [ ] `setRobotState` вызывается в `Terminal.tsx` в трёх точках
- [ ] Auto-reset в `RobotWidget` через `useEffect` + `setTimeout` 2500ms (только для `success`/`error`)
- [ ] CSS-анимации не ломают `prefers-reduced-motion` (уже обёрнуто в `index.css`)
- [ ] `MissionLog` рендерит `RobotWidget` сверху, objectives снизу
- [ ] `npm run typecheck` — 0 ошибок
- [ ] `npm run lint` — 0 warnings
- [ ] Нет `any`
- [ ] `RobotWidget` не принимает пропсов — только читает store

---

## Финальная структура сайдбара (визуально)

```
┌─────────────────────┐
│  БОРТОВОЙ ДРОИД R.U.X│  ← заголовок
│                     │
│    .-'-.            │
│   /o   o\           │  ← ASCII-робот (pre, моноширинный)
│  (   ^   )          │
│   \ ___ /           │
│    |   |            │
│                     │
│  [ ГОТОВ ]          │  ← статус
├─────────────────────┤  ← border
│  ЦЕЛИ МИССИИ        │
│  [✓] ls             │
│  [ ] chmod          │
│  [ ] ./script       │
│  ─────────────────  │
│  ПОДСКАЗКИ: hint 1  │
└─────────────────────┘
```
