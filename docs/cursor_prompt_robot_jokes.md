# Cursor Prompt — Шуточки робота R.U.X (speech bubble в idle)

> **Роль:** @generator + @ui-designer  
> **Читай перед началом:** `game/src/components/RobotWidget.tsx`, `game/src/data/robot_jokes.ts`  
> **Файл с контентом уже создан:** `game/src/data/robot_jokes.ts` — не редактировать логику, только добавлять шуточки при желании.

---

## Что нужно сделать

В состоянии `idle` робот R.U.X периодически показывает шуточку в ASCII speech bubble над собой.

**Поведение:**
- Каждые **18–22 секунды** (случайный интервал) в idle → появляется speech bubble
- Speech bubble виден **5 секунд**, затем исчезает
- При смене состояния (thinking/success/error/win) bubble исчезает немедленно
- Шуточки не повторяются подряд (shuffle без повторений)
- Bubble не показывается первые 5 секунд после загрузки уровня (дать игроку освоиться)

---

## Задача 1 — хук `useRobotJokes` (новый файл)

**Путь:** `game/src/hooks/useRobotJokes.ts`

```typescript
import { useState, useEffect, useRef } from 'react';
import { ROBOT_JOKES, type RobotJoke } from '../data/robot_jokes';
import { useGameStore } from '../store/gameStore';

interface UseRobotJokesResult {
  currentJoke: RobotJoke | null;
}

export function useRobotJokes(): UseRobotJokesResult {
  const robotState = useGameStore((s) => s.robotState);
  const [currentJoke, setCurrentJoke] = useState<RobotJoke | null>(null);
  const jokeIndexRef = useRef<number[]>([]);   // shuffled indices
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Сбросить bubble при смене состояния (не idle)
  useEffect(() => {
    if (robotState !== 'idle') {
      setCurrentJoke(null);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  }, [robotState]);

  // Цикл показа шуточек в idle
  useEffect(() => {
    if (robotState !== 'idle') return;

    // Инициализация shuffled очереди
    if (jokeIndexRef.current.length === 0) {
      jokeIndexRef.current = shuffleArray(
        Array.from({ length: ROBOT_JOKES.length }, (_, i) => i)
      );
    }

    // Задержка перед первой шуточкой (5с) + случайный интервал
    const delay = currentJoke === null ? 5000 : randomBetween(18000, 22000);

    showTimerRef.current = setTimeout(() => {
      if (jokeIndexRef.current.length === 0) {
        jokeIndexRef.current = shuffleArray(
          Array.from({ length: ROBOT_JOKES.length }, (_, i) => i)
        );
      }
      const idx = jokeIndexRef.current.pop()!;
      setCurrentJoke(ROBOT_JOKES[idx]);

      // Скрыть через 5 секунд
      hideTimerRef.current = setTimeout(() => {
        setCurrentJoke(null);
      }, 5000);
    }, delay);

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [robotState, currentJoke]);

  return { currentJoke };
}

// ── helpers ─────────────────────────────────────────────

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
```

---

## Задача 2 — компонент `SpeechBubble` (внутри `RobotWidget.tsx`)

Добавить внутренний компонент (не выносить в отдельный файл — он нигде больше не нужен).

### Визуальный дизайн bubble

```
Однострочная шуточка:
 .-----------------------.
 | sudo make me sandwich |
 '-----------v-----------'

Многострочная (диалог):
 .-------------------.
 | <r2d2> sudo make  |
 |        me sandwich|
 | <root> ok         |
 '--------v----------'
          v — указатель на робота (снизу bubble)
```

ASCII bubble (адаптировать ширину под контент):

```typescript
function formatBubble(joke: RobotJoke): string {
  // Нормализовать к массиву строк
  const lines = Array.isArray(joke) ? joke : joke.split('\n');

  // Максимальная длина строки
  const maxLen = Math.max(...lines.map((l) => l.length));
  const width = Math.max(maxLen, 10);  // минимальная ширина 10

  const top    = ' .' + '-'.repeat(width + 2) + '.';
  const bottom = ' \'' + '-'.repeat(Math.floor(width / 2)) +
                 'v' + '-'.repeat(width - Math.floor(width / 2)) + '\'';
  const body   = lines.map((l) => ` | ${l.padEnd(width)} |`).join('\n');

  return [top, body, bottom].join('\n');
}
```

### JSX в `RobotWidget`

```tsx
import { useRobotJokes } from '../hooks/useRobotJokes';

// Внутри компонента RobotWidget:
const { currentJoke } = useRobotJokes();

// Добавить ПЕРЕД блоком с ASCII-роботом:
{currentJoke && (
  <pre
    className="robot-bubble"
    aria-live="polite"
    aria-label="Шуточка робота"
  >
    {formatBubble(currentJoke)}
  </pre>
)}
```

---

## Задача 3 — CSS для speech bubble (`index.css`)

```css
/* ── Robot speech bubble ─────────────────────── */

.robot-bubble {
  font-family: 'VT323', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.2;
  color: var(--crt-amber);
  margin: 0 0 4px 0;
  text-align: left;
  white-space: pre;
  user-select: none;

  /* Появление/исчезновение */
  animation: bubble-appear 0.3s ease-out forwards;
}

@keyframes bubble-appear {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* prefers-reduced-motion уже обёрнуто в index.css */
```

---

## Задача 4 — обновить структуру `RobotWidget.tsx`

После добавления bubble блок `.robot-widget` выглядит так:

```tsx
<div className="robot-widget">
  <div className="robot-header">ДРОИД  R.U.X</div>

  {/* Speech bubble — появляется только в idle */}
  {currentJoke && (
    <pre className="robot-bubble">
      {formatBubble(currentJoke)}
    </pre>
  )}

  {/* ASCII-робот */}
  <pre className={`robot-ascii robot-ascii--${robotState}`}>
    {currentFrame.join('\n')}
  </pre>

  {/* Статус */}
  <div className={`robot-status robot-status--${robotState}`}>
    {ROBOT_STATUS[robotState]}
  </div>
</div>
```

Обновить CSS контейнера — bubble занимает место, высота `.robot-widget` должна адаптироваться:

```css
/* Было: min-height: 210px */
/* Стало: убрать min-height, добавить min-height только на ascii-блок */

.robot-widget {
  /* убрать min-height отсюда */
}

.robot-ascii {
  min-height: 156px;   /* 13 строк × 12px ≈ 156px — не прыгает */
}
```

---

## Задача 5 — обновить `.robot-widget` высоту в MissionLog

Поскольку bubble добавляет высоту динамически, убедиться что сайдбар не "прыгает":

```css
.mission-sidebar {
  /* добавить */
  overflow: hidden;
}

.robot-widget {
  /* transition для плавного расширения при появлении bubble */
  transition: min-height 0.2s ease;
}
```

---

## Чеклист

- [ ] `game/src/hooks/useRobotJokes.ts` создан
- [ ] bubble появляется только в `robotState === 'idle'`
- [ ] bubble скрывается при success/error/thinking/win немедленно
- [ ] Нет повторений подряд одной шуточки (shuffle)
- [ ] Задержка 5с при первом показе
- [ ] Интервал 18–22с между шуточками (случайный)
- [ ] `formatBubble` корректно обрабатывает однострочный string и string[]
- [ ] Нет memory leak — все setTimeout очищаются при unmount
- [ ] `prefers-reduced-motion` — анимация появления отключается (уже в index.css)
- [ ] `aria-live="polite"` на bubble (доступность)
- [ ] `npm run typecheck` — 0 ошибок
- [ ] `npm run lint` — 0 warnings

---

## Ожидаемое поведение

```
[5 сек после загрузки уровня]

     .-------------------------.
     | git commit -m "fix"     |
     '----------v--------------'
          _|_
         /   \
        | o o |
        |  ~  |
         \___/
       ...
     R.U.X // ГОТОВ

[5 сек — bubble исчезает]
[18–22 сек — следующая шуточка]

[пользователь вводит команду → bubble исчезает сразу]
     _|_
    /   \
   | - - |      ← thinking
   | ... |
    \___/
  ОБРАБОТКА...
```
