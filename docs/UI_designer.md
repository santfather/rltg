# Промт для ui-designer: Дизайн уровней и катсцены
# Файл: .cursor/prompts/ui-designer-cutscene.md
# Использование: открой в Cursor, напиши @ui-designer и вставь нужный раздел

---

## КОНТЕКСТ ПРОЕКТА

Ретро-игра в браузере. Стиль: 8/16-bit, CRT-монитор, Sci-Fi в духе "Чужого".
Всё строится на HTML/CSS/React. Никакого WebGL, никакого Canvas (кроме xterm.js).
Шрифт: VT323 (Google Fonts). Палитра зафиксирована — не отступать.

```css
/* ДИЗАЙН-ТОКЕНЫ — использовать строго, не изменять */
:root {
  --crt-green:   #00ff41;   /* основной текст терминала    */
  --crt-amber:   #ffb000;   /* ввод игрока, акценты        */
  --crt-red:     #ff3131;   /* ошибки, тревога, <20% O2    */
  --crt-dim:     #003b00;   /* приглушённый зелёный, рамки */
  --crt-blue:    #00cfff;   /* системные сообщения         */
  --bg-deep:     #060606;   /* фон страницы                */
  --bg-terminal: #0a0f0a;   /* фон терминала               */
  --font-mono:   'VT323', 'Courier New', monospace;
}
```

---

## ЗАДАЧА 1: Экран катсцены (CutsceneScreen)

### Что нужно
React-компонент `CutsceneScreen.tsx` — статическая картинка слева,
бегущий текст справа. Классика в духе старых JRPG и текстовых квестов.

### Макет (ASCII wireframe)

```
┌─────────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░  RETRO-UX v3.11  ░░░░░░░░░░░░░░░░░░░░░░  │  <- header, мигает 2с при старте
├───────────────────────────┬─────────────────────────────────────┤
│                           │  > МЕСТОПОЛОЖЕНИЕ: Внешний шлюз    │
│   [PIXEL ART IMAGE]       │  > Давление: 0.0 атм               │
│                           │  > Температура: -40°C              │
│   320 × 240 px            │                                     │
│   object-fit: contain     │  Система кислорода скафандра: 87%   │
│   image-rendering:        │  Не медлите.                        │
│     pixelated             │                                     │
│                           │  _                                  │  <- мигающий курсор
│                           │                                     │
├───────────────────────────┴─────────────────────────────────────┤
│  [ПРОДОЛЖИТЬ — НАЖМИТЕ ENTER]                          O2: 87% │  <- footer
└─────────────────────────────────────────────────────────────────┘
```

### Требования к компоненту

```tsx
interface CutsceneScreenProps {
  imageUrl: string;          // путь к pixel art картинке из YAML
  lines: string[];           // массив строк нарратива из YAML narrative[]
  typingSpeed?: number;      // мс между символами, default: 40
  onComplete: () => void;    // колбэк: Enter или клик → переход в терминал
  location: string;          // название локации для header
}
```

### Поведение бегущего текста
- Строки печатаются последовательно, одна за другой
- Между строками пауза 300мс
- Звук: тихий клик каждые 3 символа (Web Audio API, опционально)
- Если игрок нажимает Enter до конца — весь текст показывается мгновенно
- После последней строки появляется `[НАЖМИТЕ ENTER]` с анимацией мигания

### CSS-детали для изображения
```css
.cutscene-image {
  image-rendering: pixelated;   /* критично для pixel art */
  image-rendering: crisp-edges; /* Safari fallback */
  width: 320px;
  height: 240px;
  object-fit: contain;
  border: 1px solid var(--crt-dim);
  /* Лёгкое зелёное свечение по краям */
  filter: drop-shadow(0 0 6px rgba(0, 255, 65, 0.3));
}
```

---

## ЗАДАЧА 2: Экран загрузки уровня (LevelLoadScreen)

### Что нужно
Переходный экран между уровнями. Имитирует загрузку системы.
Длительность: 2–3 секунды. Потом автоматически переходит в катсцену.

### Макет

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│              RETRO-UX v3.11 // BOOT SEQUENCE                   │
│                                                                 │
│              > Initializing subsystems...     [OK]             │
│              > Loading sector map...          [OK]             │
│              > Mounting filesystem...         [OK]             │
│              > Connecting to terminal...      [  ]  <- мигает  │
│                                                                 │
│              ████████████████████░░░░░░░  73%                  │
│                                                                 │
│              MISSION 01: ПРЕОДОЛЕНИЕ ШЛЮЗА                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Данные из YAML
```tsx
interface LevelLoadScreenProps {
  missionId: string;         // "01"
  missionTitle: string;      // "ПРЕОДОЛЕНИЕ ШЛЮЗА"
  onLoadComplete: () => void; // автовызов через ~2.5с
}
```

### Прогресс-бар
```css
/* Пиксельный прогресс-бар без border-radius */
.progress-bar-fill {
  background: var(--crt-green);
  box-shadow: var(--glow-green);
  height: 16px;
  border-radius: 0;           /* строго прямоугольный */
  transition: width 0.1s steps(20); /* ступенчатое заполнение */
}
```

---

## ЗАДАЧА 3: HUD (heads-up display) во время игры

### Макет общего layout игры

```
┌─────────────────────────────────────────────────────────────────┐
│  O2 ████████████████████░░░░  78%    МИССИЯ 01    SCORE: 0450  │  <- TopBar
├──────────────────────────────────────────┬──────────────────────┤
│                                          │  ЦЕЛИ МИССИИ:        │
│                                          │                      │
│   ТЕРМИНАЛ (xterm.js)                    │  [✓] pwd             │
│                                          │  [✓] ls -la          │
│   RETRO-UX:~$ _                          │  [ ] chmod +x        │
│                                          │  [ ] ./open_door.sh  │
│                                          │                      │
│                                          │  ──────────────────  │
│                                          │  ПОДСКАЗКИ:          │
│                                          │  hint 1 / 2 / 3      │
└──────────────────────────────────────────┴──────────────────────┘
```

### TopBar компонент
```tsx
// Три зоны: кислород слева, миссия по центру, очки справа
// OxygenBar меняет цвет:
//   > 40%  → var(--crt-green)
//   20-40% → var(--crt-amber)  + анимация pulse
//   < 20%  → var(--crt-red)    + анимация pulse быстрее

@keyframes pulse-oxygen {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--crt-red); }
  50%       { opacity: 0.6; box-shadow: 0 0 2px var(--crt-red); }
}
```

### MissionLog (правая панель)
- Ширина: 220px, фиксированная
- Команды: `[ ]` серым, `[✓]` зелёным с glow
- При выполнении команды — анимация: текст вспыхивает и гаснет в `[✓]`
- Галочка появляется мгновенно, не с задержкой

---

## ЗАДАЧА 4: Экран Game Over и Victory

### Game Over (кончился кислород)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                    ██████  ██████                               │
│                   ██    ██ ██    ██                             │  <- ASCII большими буквами
│                   ██       ██████                               │
│                   ██    ██ ██   ██                              │
│                    ██████  ██    ██                             │
│                                                                 │
│              СИСТЕМА ЖИЗНЕОБЕСПЕЧЕНИЯ ОТКАЗАЛА                  │  <- красный, мигает
│                                                                 │
│              Последняя команда: chmod +x open_door.sh          │  <- amber
│              Очки: 0320                                        │
│                                                                 │
│              [R] НАЧАТЬ ЗАНОВО    [L] ЗАГРУЗИТЬ СОХРАНЕНИЕ     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- Экран появляется с эффектом: всё гаснет, потом красный текст "проявляется"
- Фоновый звук: flat line (опционально)
- Scanlines усиливаются до opacity: 0.08

### Victory (уровень пройден)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              ✓ СИСТЕМА ВОССТАНОВЛЕНА                            │  <- зелёный glow
│                                                                 │
│              Изученные команды:                                 │
│              ┌────────────────────────────────────┐            │
│              │ chmod  — изменить права доступа    │            │
│              │ cat    — прочитать файл            │            │  <- обучающая сводка
│              │ ls -la — список файлов с правами   │            │
│              └────────────────────────────────────┘            │
│                                                                 │
│              Кислород: +25%   Очки: +100                       │  <- анимация счётчика
│                                                                 │
│              [ENTER] СЛЕДУЮЩАЯ МИССИЯ                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ЗАДАЧА 5: Промты для Stable Diffusion (катсцены)

Используй в ComfyUI с pixel art LoRA. Разрешение: 512×384 → downscale до 320×240.

### Миссия 0: Туториал (снаружи корабля)
```
pixel art, 16-bit, astronaut floating in space near crashed spacecraft,
asteroid surface, starfield background, retro sci-fi, dark color palette,
green terminal glow reflecting on visor, Alien movie aesthetic,
nostromo style, detailed pixel shading, isometric view
negative: realistic, 3d render, modern, colorful, anime
```

### Миссия 1: Шлюз
```
pixel art, 16-bit, dark spaceship airlock corridor, heavy metal door,
warning lights red and amber, control panel with switches,
retro sci-fi interior, abandoned, dust particles, dim lighting,
Alien Isolation style, top-down slight angle
negative: realistic, bright, colorful, humans visible
```

### Миссия 2: Жилой отсек
```
pixel art, 16-bit, spaceship crew quarters, narrow bunk beds,
personal lockers with stickers, dim emergency lighting green,
scattered belongings, abandoned in hurry, retro sci-fi horror,
claustrophobic atmosphere, flickering light
negative: realistic, clean, bright
```

### Миссия 3: Грузовой трюм
```
pixel art, 16-bit, spaceship cargo bay, stacked metal containers,
forklift robot, industrial lighting, yellow caution stripes,
large dark space, retro sci-fi, Alien movie cargo hold aesthetic,
volumetric light beams through grates
negative: realistic, modern, bright
```

### Миссия 4: Рубка связи
```
pixel art, 16-bit, spaceship communication room, multiple screens
with static, satellite dish controls, blinking lights, dark,
retro computer terminals green phosphor glow, Alien Isolation UI,
technical debris, abandoned station feel
negative: realistic, modern, bright colors
```

### Миссия 5: Машинное отделение
```
pixel art, 16-bit, spaceship engine room, massive reactor core glowing red,
pipes and valves, steam, danger warning signs, nuclear aesthetic,
dark industrial, Alien movie engine room, emergency red lighting,
claustrophobic, mechanical detail
negative: realistic, modern, clean
```

---

## ИНСТРУКЦИЯ ДЛЯ CURSOR

Когда показываешь этот файл Cursor, говори:

"Используй роль @ui-designer. Реализуй [ЗАДАЧА N] из файла
.cursor/prompts/ui-designer-cutscene.md.
Соблюдай дизайн-токены из секции КОНТЕКСТ ПРОЕКТА.
Компонент сохрани в src/components/[ComponentName].tsx"

Пример:
"@ui-designer реализуй ЗАДАЧУ 1 (CutsceneScreen) из промта.
Компонент — src/components/CutsceneScreen.tsx"