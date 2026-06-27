# Cursor Prompt — Sprint v3: финализация игры

> **Роль:** @ui-designer + @generator  
> **Читай перед началом:**  
> - `docs/audit_review.md` (27.06 вечер) — текущее состояние  
> - `game/src/store/gameStore.ts` — `completedLevels`, `phase`, `score`  
> - `game/src/types/level.types.ts` — `LevelId`, `LEVEL_ORDER`, `GamePhase`  
> - `game/src/App.tsx` — phase routing  
> - `docs/UI_designer.md` — дизайн-токены (CSS vars), компоненты

**Контекст:** 10 уровней, 65 тестов, CI зелёный. Игра функционально завершена.  
Sprint v3 — **финализация UX**: эпилог, экран прогресса, звук, E2E, hardening.

---

## Сессия 1 — Финальный экран и главное меню

### S3-01: FinaleScreen (эпилог после level_09)

**Файл:** `game/src/components/FinaleScreen.tsx`  
**Триггер:** `phase === 'finale'`; переход из App.tsx когда `getNextLevelId(level_09)` возвращает `null`

```tsx
interface FinaleScreenProps {
  totalScore: number;
  completedLevels: LevelId[];
  onRestart: () => void;       // → reset → level_00
}
```

**Макет:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ░░░ NOSTROMO-8 // MISSION COMPLETE ░░░                        │
│                                                                 │
│       SOS ПРИНЯТ — HYPERION-3 на курсе                         │  ← --crt-blue, typewriter
│                                                                 │
│   ╔═══════════════════════════════════════╗                     │
│   ║  ИТОГОВЫЙ ОТЧЁТ                      ║                     │
│   ║                                       ║                     │
│   ║  Миссий выполнено:  10 / 10           ║  ← зелёный         │
│   ║  Финальный счёт:    ████ pts          ║  ← счётчик анимация│
│   ║  O₂ при финале:     NN%              ║                     │
│   ╚═══════════════════════════════════════╝                     │
│                                                                 │
│       ОСВОЕННЫЕ КОМАНДЫ (35):                                   │
│       ls  cd  cat  chmod  grep  find  tar  kill  ps  ssh  ...  │  ← amber
│                                                                 │
│       [ENTER] НАЧАТЬ СНОВА                                      │  ← мигает
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Поведение:**
- Появление: fade-in, затем typewriter для "SOS ПРИНЯТ..."
- Счётчик очков: анимирует от 0 до `totalScore` за 2s (requestAnimationFrame, шаг ≈50)
- Команды берутся из `LEARNING_OBJECTIVES_ALL` — собрать все `command` из всех уровней
- [Enter] или клик на кнопку → `onRestart()` → `resetGame()` → `phase = 'menu'`
- Scanlines CRT усилены: `--scanline-opacity: 0.06`

**CSS:**
```css
.finale-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-deep);
  font-family: var(--font-mono);
  color: var(--crt-green);
}

.finale-score-counter {
  color: var(--crt-amber);
  text-shadow: var(--glow-amber);
  font-size: 20px;
  /* transition через JS, не CSS — нужна точность requestAnimationFrame */
}

.finale-commands {
  font-size: 12px;
  color: var(--crt-amber);
  opacity: 0.7;
  letter-spacing: 0.08em;
  max-width: 540px;
  word-spacing: 0.5em;
  text-align: center;
  margin-top: 12px;
}

@keyframes finale-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.finale-enter-prompt {
  animation: finale-blink 1.2s step-start infinite;
  margin-top: 24px;
  color: var(--crt-green);
}
```

**App.tsx — добавить:**
```tsx
// В phase routing:
case 'finale':
  return (
    <FinaleScreen
      totalScore={score}
      completedLevels={completedLevels}
      onRestart={() => {
        resetGame();
        setPhase('menu');
      }}
    />
  );

// В useGameSession / handleLevelComplete:
const nextId = getNextLevelId(currentLevelId);
if (!nextId) {
  setPhase('finale');   // ← последний уровень пройден
} else {
  setCurrentLevelId(nextId);
  setPhase('loading');
}
```

**gameStore.ts — добавить `'finale'` в `GamePhase`:**
```typescript
export type GamePhase = 'menu' | 'loading' | 'cutscene' | 'playing' | 'victory' | 'gameover' | 'finale';
```

---

### S3-02: MainMenuScreen (стартовый экран)

**Файл:** `game/src/components/MainMenuScreen.tsx`  
**Триггер:** `phase === 'menu'`; стартовое состояние при первом запуске или после finale/resetGame

```tsx
interface MainMenuScreenProps {
  completedLevels: LevelId[];
  onStart: () => void;        // → loading level_00 (или следующий незавершённый)
  onContinue?: () => void;    // показать если completedLevels.length > 0
}
```

**Макет:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│         ██████ ███████ ████████ ██████   ██████                 │
│         ██  ██ ██         ██    ██  ██  ██    ██                │  ← ASCII big letters
│         ██████ █████      ██    ██████  ██    ██                │
│         ██  ██ ██         ██    ██  ██  ██    ██                │
│         ██  ██ ███████    ██    ██  ██   ██████                 │
│                                                                 │
│         LINUX TERMINAL SURVIVAL — NOSTROMO-8                    │  ← --crt-dim
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐     │
│   │  ПРОГРЕСС: ████████████████████░░░░░░░░  5/10        │     │  ← если есть save
│   └──────────────────────────────────────────────────────┘     │
│                                                                 │
│         [N] НОВАЯ ИГРА                                          │  ← зелёный
│         [C] ПРОДОЛЖИТЬ (МИССИЯ 06)                              │  ← только если есть save
│                                                                 │
│         v0.9 // НОСТРОМО-8 // RETRO-UX v3.11                   │  ← --crt-dim, мелко
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Поведение:**
- При наличии `completedLevels.length > 0` — показывать прогресс-бар и [C]
- [N] → `resetGame()` → `setCurrentLevelId('level_00')` → `setPhase('loading')`
- [C] → продолжить с первого незавершённого уровня: `getFirstIncompleteLevel(completedLevels)`
- keydown: `n/N` → новая игра, `c/C` → продолжить (если есть save)
- Фоновый эффект: редкое мерцание строки `> BOOT SEQUENCE INTERRUPTED...` появляется и исчезает каждые 5–8с

**Хелпер (добавить в `level.types.ts`):**
```typescript
export function getFirstIncompleteLevel(completed: LevelId[]): LevelId {
  const set = new Set(completed);
  return LEVEL_ORDER.find(id => !set.has(id)) ?? LEVEL_ORDER[0];
}
```

**CSS:**
```css
.main-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-deep);
  gap: 12px;
}

.main-menu__logo {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.1;
  color: var(--crt-green);
  text-shadow: var(--glow-green);
  white-space: pre;
  text-align: center;
}

.main-menu__progress-bar {
  width: 360px;
  height: 8px;
  background: var(--crt-dim);
  position: relative;
  border: 1px solid var(--crt-dim);
}
.main-menu__progress-fill {
  height: 100%;
  background: var(--crt-green);
  box-shadow: var(--glow-green);
  transition: width 0.6s ease-out;
}

.main-menu__option {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--crt-green);
  cursor: pointer;
  letter-spacing: 0.1em;
}
.main-menu__option:hover {
  text-shadow: var(--glow-green);
  color: var(--crt-amber);
}
.main-menu__option--disabled {
  color: var(--crt-dim);
  cursor: default;
  pointer-events: none;
}
```

---

## Сессия 2 — Прогресс-карта корабля

### S3-03: ShipMapScreen (карта Ностромо-8)

**Файл:** `game/src/components/ShipMapScreen.tsx`  
**Вызов:** кнопка `[M] КАРТА` в TopBar во время игры (открывается как оверлей поверх терминала)

**Концепция:** ASCII-карта корабля. Завершённые отсеки — зелёные. Текущий — мигает. Будущие — серые.

```
┌─────────────────────────────────────────────────────────────────┐
│  NOSTROMO-8 // КАРТА КОРАБЛЯ                           [ESC]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ╔══════╗  ╔══════════╗  ╔════════╗  ╔═══════╗               │
│   ║ POD  ║══║  AIRLOCK ║══║ BRIDGE ║══║ CREW  ║               │
│   ║  ✓   ║  ║    ✓     ║  ║   ✓   ║  ║   ✓  ║               │  ← зелёные (done)
│   ╚══════╝  ╚══════════╝  ╚════════╝  ╚═══════╝               │
│                                              ║                  │
│   ╔══════════╗  ╔══════════╗           ╔═══╩═══╗               │
│   ║  CARGO   ║══║  COMMS   ║           ║TURRET ║               │
│   ║    ✓    ║  ║    ✓     ║           ║  ██  ║               │  ← текущий мигает
│   ╚══════════╝  ╚══════════╝           ╚═══════╝               │
│                                              ║                  │
│              ╔════════╗  ╔═══════╗  ╔════════╩═╗  ╔═══════╗  │
│              ║ ENGINE ║══║REACTOR║══║  NETWORK ║  ║  SOS  ║  │
│              ║   …    ║  ║  …    ║  ║    …     ║  ║  …    ║  │  ← серые (locked)
│              ╚════════╝  ╚═══════╝  ╚══════════╝  ╚═══════╝  │
│                                                                 │
│  ✓ ПРОЙДЕНО   ██ ТЕКУЩИЙ   … ЗАБЛОКИРОВАНО      [ESC] ЗАКРЫТЬ │
└─────────────────────────────────────────────────────────────────┘
```

**Данные карты (константа в компоненте или отдельный файл):**

```typescript
// game/src/data/shipMap.ts

export interface ShipNode {
  id: LevelId;
  label: string;       // короткое название для карты
  row: number;
  col: number;
}

export const SHIP_MAP_NODES: ShipNode[] = [
  { id: 'level_00', label: 'POD',     row: 0, col: 0 },
  { id: 'level_01', label: 'AIRLOCK', row: 0, col: 1 },
  { id: 'level_02', label: 'BRIDGE',  row: 0, col: 2 },
  { id: 'level_03', label: 'CREW',    row: 0, col: 3 },
  { id: 'level_04', label: 'COMMS',   row: 1, col: 1 },
  { id: 'level_05', label: 'TURRET',  row: 1, col: 3 },
  { id: 'level_06', label: 'CARGO',   row: 1, col: 0 },
  { id: 'level_07', label: 'ENGINE',  row: 2, col: 0 },
  { id: 'level_08', label: 'REACTOR', row: 2, col: 1 },
  { id: 'level_09', label: 'NETWORK', row: 2, col: 2 },
];
```

**Рендер:** статичный ASCII layout — не динамическая сетка. Заготовить строки карты как многострочная константа, подставлять статусы (✓ / ██ / …) по id.

**Открытие/закрытие:**
- TopBar: кнопка `[M]` → `gameStore.setMapOpen(true)`
- Оверлей над терминалом (z-index 200, не закрывает TopBar)
- ESC или повторный [M] → `setMapOpen(false)`
- O₂ таймер НЕ останавливается при открытой карте

**gameStore.ts — добавить:**
```typescript
mapOpen: false,
setMapOpen: (v: boolean) => set({ mapOpen: v }),
```

**CSS:**
```css
.ship-map-overlay {
  position: fixed;
  inset: 0;
  top: 40px;            /* под TopBar */
  background: rgba(6, 6, 6, 0.96);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: map-appear 0.15s ease-out;
}

@keyframes map-appear {
  from { opacity: 0; transform: scale(0.98); }
  to   { opacity: 1; transform: scale(1); }
}

.ship-map {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.4;
  white-space: pre;
  border: 1px solid var(--crt-dim);
  padding: 16px 20px;
}

/* Текущий отсек мигает */
@keyframes node-blink {
  0%, 100% { color: var(--crt-amber); text-shadow: var(--glow-amber); }
  50%       { color: var(--crt-dim); text-shadow: none; }
}
.ship-map__node--current {
  animation: node-blink 0.8s step-start infinite;
}
.ship-map__node--done    { color: var(--crt-green); }
.ship-map__node--locked  { color: #002200; }
```

---

## Сессия 3 — Звуковая система

### S3-04: AudioSystem — Web Audio API

**Файл:** `game/src/engine/AudioSystem.ts` (чистый TS, не React)  
**Файл:** `game/src/hooks/useAudio.ts`

**Принцип:**
- Лениво создаёт `AudioContext` при первом user gesture (клик или нажатие клавиши)
- Все звуки — программно через Web Audio API oscillator/noise (нет файлов для загрузки)
- Отключаемо: `localStorage.setItem('rux_audio', '0')` → глобальный mute

```typescript
// game/src/engine/AudioSystem.ts

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private droneNode: OscillatorNode | null = null;
  private muted = localStorage.getItem('rux_audio') === '0';

  /** Вызвать при первом user interaction (keydown/click в App) */
  init(): void {
    if (this.ctx || this.muted) return;
    this.ctx = new AudioContext();
    this.startDrone();
  }

  // ── Постоянный фоновый дрон ────────────────────────────────────
  private startDrone(): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;       // sub-bass A1
    gain.gain.value = 0.012;        // очень тихо
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    this.droneNode = osc;
  }

  // ── Клик клавиатуры ───────────────────────────────────────────
  keyClick(): void {
    if (!this.ctx || this.muted) return;
    const buf = this.ctx.createBuffer(1, 512, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < 512; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / 512);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    gain.gain.value = 0.15;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  // ── Тревога кислорода (<20%) ──────────────────────────────────
  startOxygenAlarm(): void {
    if (!this.ctx || this.muted) return;
    // Короткий двойной бип 880 Hz каждые 3 секунды
    // Реализация: scheduleRepeating через setInterval (хранить id)
  }

  stopOxygenAlarm(): void { /* clearInterval */ }

  // ── Успех выполнения команды ──────────────────────────────────
  successBeep(): void {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // ── Ошибка ────────────────────────────────────────────────────
  errorBuzz(): void {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 120;
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // ── Win (level complete) ──────────────────────────────────────
  winFanfare(): void {
    if (!this.ctx || this.muted) return;
    // Простой ascending arpeggio: C5 E5 G5 C6
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = this.ctx!.currentTime + i * 0.12;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // ── Mute toggle ───────────────────────────────────────────────
  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('rux_audio', this.muted ? '0' : '1');
    if (this.muted && this.droneNode) {
      this.droneNode.stop();
      this.droneNode = null;
    } else if (!this.muted && this.ctx) {
      this.startDrone();
    }
    return this.muted;
  }

  get isMuted(): boolean { return this.muted; }

  dispose(): void {
    this.droneNode?.stop();
    this.ctx?.close();
  }
}

// Singleton
export const audioSystem = new AudioSystem();
```

**Хук:**
```typescript
// game/src/hooks/useAudio.ts
import { audioSystem } from '../engine/AudioSystem';
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function useAudio(): void {
  const oxygen = useGameStore(s => s.oxygen);
  const phase = useGameStore(s => s.phase);

  // Init на первый user gesture
  useEffect(() => {
    const handler = () => audioSystem.init();
    window.addEventListener('keydown', handler, { once: true });
    window.addEventListener('click', handler, { once: true });
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('click', handler);
    };
  }, []);

  // O2 alarm
  useEffect(() => {
    if (phase === 'playing' && oxygen < 20) {
      audioSystem.startOxygenAlarm();
    } else {
      audioSystem.stopOxygenAlarm();
    }
    return () => audioSystem.stopOxygenAlarm();
  }, [oxygen, phase]);
}
```

**Интеграция в useGameSession.ts:**
```typescript
import { audioSystem } from '../engine/AudioSystem';

// В executeCommand после результата:
if (hasError) audioSystem.errorBuzz();
else          audioSystem.successBeep();

// keyClick вызывать в Terminal.tsx при onData (каждый символ):
audioSystem.keyClick();

// В handleWin:
audioSystem.winFanfare();
```

**TopBar — кнопка mute:**
```tsx
// Добавить в TopBar:
const [muted, setMuted] = useState(audioSystem.isMuted);

<button
  className="topbar-btn"
  onClick={() => setMuted(audioSystem.toggleMute())}
  aria-label={muted ? 'Включить звук' : 'Выключить звук'}
  title={muted ? '[S] вкл звук' : '[S] откл звук'}
>
  {muted ? '[MUTE]' : '[SND]'}
</button>
```

---

## Сессия 4 — Инженерное качество

### S3-05: Playwright E2E smoke test

**Установка:**
```bash
# В game/
npm install -D @playwright/test
npx playwright install chromium
```

**Файл:** `game/tests/e2e/level00.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Level 00 Tutorial — smoke test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Дождаться главного меню
    await expect(page.locator('.main-menu')).toBeVisible({ timeout: 5000 });
  });

  test('completes level_00 with correct commands', async ({ page }) => {
    // Нажать [N] новая игра
    await page.keyboard.press('n');

    // Дождаться terминала
    await expect(page.locator('.xterm-screen')).toBeVisible({ timeout: 8000 });

    // Выполнить команды
    const term = page.locator('.xterm-screen');
    await term.click();
    await page.keyboard.type('ls\r');
    await page.keyboard.type('cd mission\r');
    await page.keyboard.type('cat ship_map.txt\r');

    // Ожидать экран победы
    await expect(page.locator('.victory-screen')).toBeVisible({ timeout: 5000 });
  });

  test('game over when oxygen reaches 0', async ({ page }) => {
    // Начать игру и принудительно опустить O2 через store (через page.evaluate)
    // ...
  });
});
```

**playwright.config.ts:**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
```

**Добавить в `package.json`:**
```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

**Добавить в CI (`.github/workflows/ci.yml`):**
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium
  working-directory: game

- name: E2E smoke tests
  run: npm run test:e2e
  working-directory: game
```

---

### S3-06: Coverage gate в CI

```bash
npm install -D @vitest/coverage-v8
```

**`game/vite.config.ts` — добавить:**
```typescript
test: {
  coverage: {
    provider: 'v8',
    thresholds: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
    include: ['src/engine/**', 'src/hooks/**'],
    exclude: ['src/**/*.test.ts', 'src/data/**'],
  },
}
```

**`package.json`:**
```json
"test:coverage": "vitest run --coverage"
```

**CI — добавить после `npm test`:**
```yaml
- name: Coverage
  run: npm run test:coverage
  working-directory: game
```

---

### S3-07: Dedicated error screen (FT-09)

Вместо `throw` при сломанном уровне — отдельный экран.

**Файл:** `game/src/components/LevelErrorScreen.tsx`

```tsx
interface LevelErrorScreenProps {
  levelId: string;
  error: string;
  onReset: () => void;
}

export default function LevelErrorScreen({ levelId, error, onReset }: LevelErrorScreenProps) {
  return (
    <div className="level-error-screen">
      <pre className="level-error-screen__ascii">
        {`  ██████╗  ██████╗  ██╗      ██╗  ██╗
  ██╔══██╗██╔═══██╗ ██║      ██║  ██║
  ██████╔╝██║   ██║ ██║      ██║  ██║
  ██╔═══╝ ██║   ██║ ██║      ██║  ██║
  ██║     ╚██████╔╝ ███████╗ ╚█████╔╝
  ╚═╝      ╚═════╝  ╚══════╝  ╚════╝ `}
      </pre>
      <p className="level-error-screen__title">ПОВРЕЖДЕНИЕ ДАННЫХ УРОВНЯ</p>
      <p className="level-error-screen__detail">
        {`Сектор: ${levelId}\nОшибка: ${error}`}
      </p>
      <p className="level-error-screen__hint">
        [R] — вернуться к началу
      </p>
    </div>
  );
}
```

**App.tsx:**
```tsx
// Заменить throw на:
if (!levelResult.ok) {
  return (
    <LevelErrorScreen
      levelId={currentLevelId}
      error={levelResult.error}
      onReset={() => { resetGame(); setPhase('menu'); }}
    />
  );
}
```

---

## Финальный чеклист Sprint v3

```
СЕССИЯ 1 — FinaleScreen + MainMenuScreen:
  [ ] GamePhase расширен: 'menu' | 'finale'
  [ ] FinaleScreen.tsx — очки + список команд + [Enter]
  [ ] MainMenuScreen.tsx — лого + прогресс + [N]/[C]
  [ ] App.tsx routing для 'menu' и 'finale'
  [ ] getFirstIncompleteLevel() в level.types.ts
  [ ] Первый запуск → phase 'menu' (не 'loading')
  [ ] npm test — все 65+ тестов проходят

СЕССИЯ 2 — ShipMapScreen:
  [ ] ShipMapScreen.tsx — ASCII карта 10 отсеков
  [ ] shipMap.ts — SHIP_MAP_NODES константа
  [ ] TopBar: кнопка [M] / ESC toggle
  [ ] mapOpen в gameStore
  [ ] Overlay над терминалом, O2 не останавливается
  [ ] Статусы: done ✓ / current (blink) / locked …
  [ ] npm test

СЕССИЯ 3 — AudioSystem:
  [ ] AudioSystem.ts singleton (keyClick, successBeep, errorBuzz, winFanfare, drone)
  [ ] useAudio.ts хук (init on gesture, O2 alarm)
  [ ] Интеграция в useGameSession, Terminal, TopBar
  [ ] [S] mute/unmute кнопка в TopBar
  [ ] localStorage persist mute state
  [ ] AudioContext init только после user gesture
  [ ] prefers-reduced-motion не влияет (звук ≠ анимация)

СЕССИЯ 4 — Engineering:
  [ ] Playwright установлен, playwright.config.ts
  [ ] E2E smoke test level_00 (ls → cd → cat → victory)
  [ ] CI: playwright job добавлен
  [ ] @vitest/coverage-v8 установлен
  [ ] Coverage thresholds 70/60/70/70
  [ ] CI: coverage job добавлен
  [ ] LevelErrorScreen.tsx — не throw, а экран
  [ ] App.tsx: levelResult.ok === false → LevelErrorScreen
  [ ] npm run build — OK
  [ ] Push на GitHub → CI badge активен
```

---

## Порядок зависимостей

```
S3-01 (GamePhase 'menu'/'finale')
  ↓
S3-02 (MainMenu использует GamePhase + completedLevels)
  ↓
S3-03 (ShipMap — независим, добавить после S3-02)
  ↓
S3-04 (Audio — независим, добавить в S3-02+ сессию)
  ↓
S3-05 (E2E — нужен работающий dev сервер, S3-01/02 должны быть стабильны)
  ↓
S3-06, S3-07 — независимы, можно в любой момент
```
