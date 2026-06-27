# RETRO Linux Terminal Game — Main README

![CI](https://github.com/santfather/rltg/actions/workflows/ci.yml/badge.svg)

> **Репозиторий:** [github.com/santfather/rltg](https://github.com/santfather/rltg)  
> **Публичный README:** [README.md](./README.md) · **Индекс docs:** [docs/README.md](./docs/README.md)

> **Назначение файла:** единая точка входа для людей, ИИ-агентов и Cursor.
> Читай этот файл первым, прежде чем вносить изменения в проект.

---

## 1. Метаданные проекта

| Поле | Значение |
|------|----------|
| **Название** | Retro Terminal Linux Game (RETRO-UX) |
| **Корень репозитория** | `RETRO_LINUX_TERMINAL_GAME/` |
| **Игровой код (React)** | `game/` |
| **Документация** | `docs/` |
| **Pixel art ассеты** | `assets/` (сцены, тайлсеты) |
| **Генерация art (локально)** | `ComfyUI/` — **не трогать код игры ради ComfyUI** |
| **Статус** | v0.9 — 10 уровней, 75+ тестов, CI, меню, эпилог, карта, звук, E2E |
| **Язык UI игры** | Русский (тексты — только из YAML) |
| **Язык кода/комментариев** | Английский |
| **Язык общения с пользователем** | Русский |

### Связанные документы

| Файл | Содержание |
|------|------------|
| `docs/scenario.md` | Сюжет, геймплей, этапы разработки, пример YAML |
| `docs/cursor_prompt_section_plan.md` | ASCII-план отсека (SectionPlan), hover-hotspots |
| `docs/audit_review.md` | Аудит состояния проекта |
| `docs/UI_designer.md` | CRT-дизайн, экраны, CSS-токены, wireframes |
| `.cursor/rules/*.mdc` | Активные правила для Cursor по ролям |
| `.cursorrules` | Legacy-правила (краткая выжимка) |
| `game/src/types/level.types.ts` | **Источник истины** для схемы уровня |

---

## 2. Идея и концепция

### Что это

Браузерная **обучающая игра-симулятор выживания** в стиле ретро CRT-терминала (Sci-Fi, эстетика «Чужого» / Nostromo).

Игрок — астронавт после крушения на астероиде. Чтобы выжить и восстановить корабль **«Ностромо-8»**, он работает в **псевдо-Linux терминале**, изучая **реальные команды Linux** через нарратив и геймплей.

### Ключевые механики

1. **Терминал** — ввод команд через xterm.js; ответы генерирует движок, не настоящая ОС.
2. **Виртуальная FS** — in-memory дерево файлов/директорий, создаётся из YAML при загрузке уровня.
3. **Кислород (O₂)** — глобальный таймер: −1% каждые 30 сек; при 0 → Game Over.
4. **Миссии (уровни)** — 10 YAML (`level_00`…`level_09`).
5. **Подсказки** — команды `hint 1`, `hint 2`, `hint 3`; hint 3 штрафует score.
6. **Победа** — выполнение `win_condition` из YAML → экран Victory → награда (O₂, score).
7. **Прогресс** — Zustand + `localStorage`.

### Чего игра НЕ делает

- Не запускает реальный shell / не имеет доступа к файловой системе хоста.
- Не поддерживает мобильные устройства (только desktop + клавиатура).
- Не использует WebGL / Canvas для UI (кроме xterm.js).
- Не хранит игровые тексты в коде — **только в YAML**.

---

## 3. Технологический стек

### Frontend (`game/`)

| Технология | Назначение |
|------------|------------|
| **React 19** + **TypeScript** (strict) | UI-слой |
| **Vite 8** | Сборка, dev-сервер |
| **xterm.js** + `@xterm/addon-fit` | Эмулятор терминала |
| **Zustand** | Глобальное состояние игры |
| **js-yaml** | Парсинг уровней |
| **Tailwind CSS v4** | Утилитарные стили + CRT CSS-переменные |
| **Vitest** + **jsdom** | Unit-тесты |
| **Playwright** | E2E smoke-тесты |
| **ESLint** | Линтинг |

### Контент и ассеты

| Технология | Назначение |
|------------|------------|
| **YAML** | Уровни, нарратив, виртуальная FS, подсказки |
| **PNG pixel art** | Катсцены (`assets/scenes/`, 320×240) |
| **ComfyUI** (опционально) | Генерация pixel art по промптам из `docs/UI_designer.md` |

### AI-разработка (Cursor + Ollama)

Локальные модели через `http://localhost:11434/v1`:

| Роль | Модель | Когда использовать |
|------|--------|-------------------|
| Архитектор | `deepseek-analyst:latest` | Проектирование `engine/`, `store/`, рефакторинг |
| Генератор | `qwen-generator:latest` | Реализация функций, хуков, тестов |
| UI Designer | `ui-designer:latest` | CRT, CSS, React-компоненты |
| Ревьюер | `deepseek-r1:7b` | Code review, отладка |
| YAML-контент | `qwen-generator` / `t-pro-it-2.0` | Русскоязычный нарратив в YAML |

---

## 4. Архитектура и принципы

### 4.1. Главное правило: разделение слоёв

```
┌─────────────────────────────────────────────────────────┐
│  components/ + hooks/     ← React UI, side effects       │
│         ↓ вызывает                                       │
│  engine/                  ← чистая TS-логика, без React  │
│         ↓ читает                                         │
│  levels/*.yaml            ← контент (единственный источник текстов) │
│         ↓ типизируется через                             │
│  types/level.types.ts                                    │
│         ↓ состояние через                                │
│  store/gameStore.ts      ← Zustand                       │
└─────────────────────────────────────────────────────────┘
```

### 4.2. Жёсткие ограничения (обязательны для агентов)

1. **Никогда** не смешивать бизнес-логику и UI в одном файле.
2. **Все игровые тексты** — только из `game/src/levels/*.yaml`.
3. **TypeScript strict**, запрет `any`.
4. **VirtualFS иммутабельна** — каждая операция возвращает новый state.
5. **Парсинг команд** — только в `engine/CommandParser.ts`, не в компонентах.
6. **`useEffect`** — только для подписок/DOM, не для игровой логики.
7. **Тесты** — файл `*.test.ts` рядом с модулем в `engine/`.
8. **Экспорты** — named для утилит/хуков, default для React-компонентов.

### 4.3. Структура каталогов

```
RETRO_LINUX_TERMINAL_GAME/
├── main_readme.md              ← этот файл
├── .cursorrules
├── .cursor/
│   ├── rules/                  # Cursor Rules по ролям
│   └── prompts/
│       └── ui-designer-cutscene.md
├── docs/
│   ├── scenario.md
│   ├── rules.md
│   └── UI_designer.md
├── assets/
│   ├── scenes/                 # PNG катсцен (gitignore для *.png)
│   └── tilesets/
├── ComfyUI/                    # локальная генерация art (не часть game/)
└── game/                       # ← ОСНОВНОЙ КОД ИГРЫ
    ├── package.json
    ├── vite.config.ts
    ├── scripts/
    │   └── validate-levels.js  # pre-commit: валидация YAML
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css           # CRT design tokens + Tailwind
        ├── components/
        │   ├── CRTOverlay.tsx
        │   ├── Terminal.tsx            # xterm.js (lazy-loaded)
        │   ├── SectionPlan.tsx         # ASCII floor plan + hotspots
        │   ├── RobotWidget.tsx         # R.U.X robot (5 states)
        │   ├── TopBar.tsx / OxygenBar.tsx
        │   ├── MissionLog.tsx
        │   ├── CutsceneScreen.tsx      # narrative + ascii_art_path image
        │   ├── LevelLoadScreen.tsx
        │   ├── GameOverScreen.tsx
        │   ├── VictoryScreen.tsx
        │   ├── MainMenuScreen.tsx          # стартовое меню [N]/[C]
        │   ├── FinaleScreen.tsx            # эпилог после level_09
        │   ├── ShipMapScreen.tsx           # ASCII-карта корабля [M]
        │   ├── LevelErrorScreen.tsx        # битый YAML вместо throw
        │   └── ErrorBoundary.tsx
        ├── engine/
        │   ├── CommandParser.ts
        │   ├── FileSystem.ts
        │   ├── LevelLoader.ts
        │   ├── HintSystem.ts
        │   ├── WinConditionChecker.ts
        │   ├── TabCompletion.ts
        │   └── AudioSystem.ts              # Web Audio API (звук)
        ├── hooks/
        │   ├── useGameSession.ts       # game loop (win, score, hints)
        │   ├── useOxygen.ts
        │   ├── useAudio.ts             # init + O₂ alarm
        │   └── useRobotJokes.ts
        ├── assets/scenes/              # cutscene SVG/PNG placeholders
        ├── store/
        │   └── gameStore.ts
        ├── types/
        │   └── level.types.ts
        └── levels/
            ├── level_00_tutorial.yaml
            ├── level_01_airlock.yaml
            ├── level_02_crew_quarters.yaml
            ├── level_03_cargo_bay.yaml
            ├── level_04_comms.yaml
            ├── level_05_turret.yaml
            ├── level_06_comms.yaml
            ├── level_07_engine.yaml
            ├── level_08_reactor.yaml
            └── level_09_network.yaml
```

### 4.4. Поток данных (game loop)

```
Boot → MainMenuScreen → LevelLoadScreen → CutsceneScreen (narrative[])
  → Terminal (gameplay) + ShipMapScreen overlay [M]
      → user input → CommandParser → VirtualFS / HintSystem
      → win_condition met? → VictoryScreen → reward → next level
      → level_09 done? → FinaleScreen
      → oxygen == 0? → GameOverScreen
```

---

## 5. Модули: ответственность

### `engine/CommandParser.ts`
- Разбивает строку ввода на токены.
- Маршрутизирует к обработчикам: `handleLs`, `handleCd`, `handleCat`, …
- Блокирует опасные команды (`rm -rf /`) с нарративным отказом.
- **Паттерн:** Command (один handler = одна функция, не monolith switch).

### `engine/FileSystem.ts`
- In-memory виртуальная FS из `filesystem:` секции YAML.
- Методы: `ls`, `cd`, `cat`, `chmod`, выполнение `.sh`.
- **Иммутабельность:** `state' = reducer(state, action)`.

### `engine/LevelLoader.ts`
- Загрузка YAML (`import raw from './levels/foo.yaml?raw'`).
- Валидация обязательных полей.
- Бросает ошибку при невалидном уровне.

### `engine/HintSystem.ts`
- `hint` / `hint N` → текст из YAML, учёт использованных подсказок.

### `store/gameStore.ts`
- `currentLevel`, `oxygen` (0–100), `score`, `completedLevels[]`.
- Persist в `localStorage`.

### `hooks/`
- `useGameSession` — submitCommand, win detection, score, hint penalty.
- `useOxygen` — таймер −1%/30s (только `phase === 'playing'`).
- `useRobotJokes` — idle speech bubbles для RobotWidget.

### `components/`
- Только отображение и пользовательский ввод.
- Без парсинга команд и без прямой работы с YAML.

---

## 6. Формат уровня (YAML)

**Путь:** `game/src/levels/<id>.yaml`  
**Схема:** `game/src/types/level.types.ts`  
**Валидация:** `npm run validate:levels` (из `game/`)

### Обязательные поля

```yaml
id: "level_01"                    # формат: level_NN
title: "Миссия 1: ..."
location: "Внешний шлюз — Сектор A"
narrative:                        # min 3 строки, typewriter-эффект
  - "..."
filesystem:                       # min 2 узла (/ + хотя бы 1 файл)
  - path: "/"
    type: dir
learning_objectives:              # min 1 команда
  - command: "ls"
    description: "..."
    example: "ls -la"
win_condition:
  type: "command_executed"        # | file_created | file_read
  command: "./open_door.sh"
  working_directory: "/system_core"
hints:                            # РОВНО 3 подсказки
  - level: 1
    text: "..."
  - level: 2
    text: "..."
  - level: 3
    text: "..."
reward:
  oxygen_bonus: 25                # 0–50
  score: 100
```

### Опциональные поля

- `ascii_art` — ASCII-заставка на LevelLoadScreen.
- `ascii_art_path` — файл в `src/assets/scenes/` для CutsceneScreen (SVG/PNG).
- `section_plan` — ASCII-план отсека с hover-hotspots (см. `docs/cursor_prompt_section_plan.md`).
- `remote_filesystem` — симуляция SSH.
- `reward.unlock_log` — typewriter-текст на VictoryScreen.
- `win_condition.contains` — для `file_read`: проверка подстроки в выводе cat/grep.

### Реализованные уровни (v1)

| ID | Локация | Команды |
|----|---------|---------|
| `level_00` | Tutorial | `ls`, `cd`, `cat` |
| `level_01` | Airlock | `chmod`, `./script` |
| `level_02` | Crew quarters | `grep`, `find` |
| `level_03` | Cargo bay | `tar`, `mkdir`, `cp` |
| `level_04` | Comms | `ip a`, `ping`, `ssh` |

### Roadmap v2 (уровни 05–09)

| ID | Локация | Команды |
|----|---------|---------|
| `level_05` | Turret | `netstat`, `kill`, `sudo` |
| `level_06` | Comms/grep | `grep -r`, `find` |
| `level_07` | Engine | `ps`, `df`, `kill` |
| `level_08` | Reactor | `systemctl`, `tail -f`, sequence win |
| `level_09` | Network (финал) | `ssh`, `ping`, relay |

### Как добавить уровень

1. Создать `game/src/levels/level_NN_name.yaml` (по шаблону выше).
2. Добавить `'level_NN'` в `LEVEL_ORDER` и тип `LevelId` в `types/level.types.ts`.
3. Файл подхватится автоматически через `import.meta.glob('./level_*.yaml')`.
4. `node scripts/validate-levels.js` — YAML валиден.
5. `npm test` — регрессии нет.

Опционально: `section_plan`, `ascii_art_path`, placeholder через `node scripts/gen-placeholders.mjs`.

---

## 7. UI / визуальный стиль

### Design tokens (не менять без согласования)

```css
--crt-green:   #00ff41;   /* основной текст */
--crt-amber:   #ffb000;   /* ввод игрока */
--crt-red:     #ff3131;   /* ошибки, O₂ < 20% */
--crt-dim:     #003b00;   /* рамки */
--crt-blue:    #00cfff;   /* системные сообщения */
--bg-deep:     #060606;
--bg-terminal: #0a0f0a;
--font-terminal: 'VT323', 'Courier New', monospace;
```

### CRT-эффекты

- Scanlines (`::before`), vignette (`::after`), flicker (`@keyframes flicker`).
- `prefers-reduced-motion` — отключать все анимации.
- Промпт `RETRO-UX:~$` — зелёный; ввод — amber; ошибки — red + glow.

### Экраны (см. `docs/UI_designer.md`)

| Компонент | Когда показывается |
|-----------|-------------------|
| `LevelLoadScreen` | Boot sequence между уровнями (~2.5s) |
| `CutsceneScreen` | Pixel art + typewriter narrative |
| `TopBar` + `OxygenBar` + `MissionLog` | Gameplay HUD |
| `GameOverScreen` | O₂ = 0 |
| `VictoryScreen` | win_condition выполнен |
| `MainMenuScreen` | Старт / продолжение, прогресс save |
| `FinaleScreen` | Эпилог после всех 10 миссий |
| `ShipMapScreen` | ASCII-карта отсеков (overlay) |
| `LevelErrorScreen` | Невалидный YAML уровня |

---

## 8. Команды для разработки

Все команды выполняются из `game/`:

```bash
cd game

npm run dev              # http://localhost:5173
npm run build            # tsc + vite build → dist/
npm run preview          # preview production build
npm test                 # vitest run
npm run test:watch       # vitest в watch-режиме
npm run test:coverage    # coverage engine/
npm run test:e2e         # Playwright smoke-тests
npm run test:e2e:ui      # Playwright UI mode
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run validate:levels  # проверка YAML в src/levels/
```

---

## 9. Roadmap (текущий прогресс)

| Этап | Описание | Статус |
|------|----------|--------|
| **0** | Каркас проекта, структура, Cursor Rules | ✅ Done |
| **1** | CRT-визуал, boot/cutscene экраны | ✅ Done |
| **2** | xterm.js + CommandParser + VirtualFS + базовые команды | ✅ Done |
| **3** | LevelLoader + YAML + win_condition | ✅ Done |
| **4** | O₂, hints, MissionLog, localStorage | ✅ Done |
| **5** | 10 YAML-уровней (`level_00`…`level_09`) | ✅ Done |
| **6** | CI, pixel art cutscene, Tab completion, SectionPlan | ✅ Done |
| **7** | Sprint v3 — меню, эпилог, карта, звук, E2E, LevelErrorScreen | ✅ Done |

---

## 10. Инструкции для ИИ-агентов

### Перед началом работы

1. Прочитай **этот файл** и релевантный doc из `docs/`.
2. Определи слой: `engine` / `components` / `hooks` / `levels` / `store`.
3. Проверь `.cursor/rules/` — там правила по ролям и glob-паттернам.
4. Не редактируй `ComfyUI/` при задачах по игре.

### Типовые задачи → куда писать код

| Задача | Куда |
|--------|------|
| Новая команда терминала | `engine/CommandParser.ts` + handler-функция |
| Логика файлов | `engine/FileSystem.ts` |
| Новый экран / CSS | `components/` + `index.css` |
| Новый уровень / текст | `src/levels/*.yaml` только |
| Глобальное состояние | `store/gameStore.ts` |
| Связка UI ↔ engine | `hooks/` |

### Чеклист перед завершением задачи

- [ ] `npm run typecheck` — без ошибок
- [ ] `npm test` — тесты проходят
- [ ] `npm run lint` — без warnings (если затронут `src/`)
- [ ] `npm run validate:levels` — если добавлен/изменён YAML
- [ ] Нет `any`, нет текстов игры в TS/TSX (кроме UI-лейблов вроде «O2:»)
- [ ] Engine-модули не импортируют React

### Антипаттерны (не делать)

```typescript
// ❌ Парсинг команд в компоненте
function Terminal() {
  const handleInput = (cmd) => { if (cmd.startsWith('ls')) ... }
}

// ❌ Хардкод нарратива
terminal.write('Гермодверь заблокирована');

// ❌ Мутация FS
fs.nodes[0].content = 'hacked';

// ✅ Правильно
const result = handleCommand(parsed, fsState);
const newState = applyCommandResult(result);
terminal.write(result.output); // output пришёл из engine
```

---

## 11. Cursor Rules — быстрый справочник

| Файл | Активация | Область |
|------|-----------|---------|
| `00_global.mdc` | always | Весь проект |
| `01_architect.mdc` | `@architect` | `game/src/engine/**`, `store/**`, `types/**` |
| `02_generator.mdc` | `@generator` | `components/**`, `engine/**`, `hooks/**` |
| `03_ui_designer.mdc` | `@ui-designer` | `components/**`, `*.css` |
| `04_reviewer.mdc` | перед commit | `game/src/**` |
| `05_yaml_editor.mdc` | `@yaml_editor` | `game/src/levels/**` |

---

## 12. Особые случаи реализации

### Запрещённые команды
```
> rm -rf /
RETRO-UX: Команда заблокирована системой безопасности корабля.
```

### SSH (миссия 4)
Не настоящий SSH. `ssh user@host` переключает контекст на `remote_filesystem` из YAML.

### Tab-autocomplete
Реализовано в `engine/TabCompletion.ts` — single Tab дополняет, double Tab показывает список.

### Pixel art катсцены
- Placeholder SVG: `node scripts/gen-placeholders.mjs` → `src/assets/scenes/`.
- YAML: `ascii_art_path: "level_01.svg"`.
- Рендер: `CutsceneScreen` с `image-rendering: pixelated`.
- Production art: ComfyUI + промпты из `docs/UI_designer.md`.

---

## 13. Git и игнорируемые файлы

- `.gitignore` — `ComfyUI/`, `game/node_modules/`, `game/dist/`, `game/coverage/`, `game/test-results/`, `assets/scenes/*.png`.
- `.cursorignore` — ComfyUI, node_modules, assets (для индексации Cursor).

---

*Последнее обновление: 27.06.2026 — Sprint v3 (меню, эпилог, карта, звук, E2E, CI).*
