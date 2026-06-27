# Cursor Prompt: Retro Terminal Linux Game

> **Статус документа:** актуализирован под репозиторий на 27.06.2026.  
> **Реализовано сейчас:** 5 уровней (`level_00` … `level_04`) в `game/src/levels/`.  
> **Расширенный сценарий (9 уровней)** — roadmap v2, см. раздел ниже.  
> **Связанные документы:** `main_readme.md`, `docs/cursor_prompt_section_plan.md`, `game/src/types/level.types.ts`.

## Общее описание проекта

Браузерная обучающая игра в жанре текстового симулятора выживания.
Игрок — астронавт, потерпевший крушение на астероиде. Единственный шанс выжить —
восстановить заброшенный корабль «Ностромо-8», работая в псевдо-Linux терминале.
Игра обучает реальным командам Linux через нарратив и геймплей.

### Реализованные уровни (v1)

| ID | YAML-файл | Локация | Ключевые команды |
|----|-----------|---------|------------------|
| `level_00` | `level_00_tutorial.yaml` | Аварийная капсула | `ls`, `cd`, `cat` |
| `level_01` | `level_01_airlock.yaml` | Внешний шлюз | `ls -la`, `chmod +x`, `./script.sh` |
| `level_02` | `level_02_crew_quarters.yaml` | Жилой отсек экипажа | `grep`, `grep -r`, `find` |
| `level_03` | `level_03_cargo_bay.yaml` | Грузовой отсек | `tar`, `mkdir`, `cp`, `mv` |
| `level_04` | `level_04_comms.yaml` | Рубка связи | `ip a`, `ping`, `ssh`, `curl` |

---

## Технический стек

- **Фреймворк:** React 19 + TypeScript (strict)
- **Терминал:** xterm.js + `@xterm/addon-fit`
- **Стили:** Tailwind CSS v4 + кастомные CSS-переменные для CRT-эффекта (`game/src/index.css`)
- **Сборка:** Vite 8
- **Хранение состояния:** Zustand
- **Сохранение прогресса:** localStorage
- **Формат уровней:** YAML-файлы (парсинг через js-yaml)
- **Тестирование:** Vitest + jsdom

### Зависимости (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "xterm": "^5.3.0",
    "@xterm/addon-fit": "^0.8.0",
    "zustand": "^4.4.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "vitest": "^1.0.0",
    "@types/js-yaml": "^4.0.0"
  }
}
```

---

## Архитектура проекта

```
game/src/
├── components/
│   ├── Terminal.tsx          # xterm.js враппер
│   ├── TopBar.tsx            # O₂ + score
│   ├── MissionLog.tsx        # Правая панель: RobotWidget + цели миссии
│   ├── RobotWidget.tsx       # ASCII-робот R.U.X (реакция на команды)
│   ├── SectionPlan.tsx       # [PLANNED] ASCII-план отсека с hover-hotspots
│   ├── CRTOverlay.tsx        # CSS-слой с эффектом старого монитора
│   ├── LevelLoadScreen.tsx   # Экран загрузки уровня (ascii_art)
│   ├── CutsceneScreen.tsx    # Межуровневая заставка
│   ├── VictoryScreen.tsx     # Экран победы
│   └── GameOverScreen.tsx    # Game Over (O₂ = 0)
├── engine/
│   ├── CommandParser.ts      # Парсинг и маршрутизация команд
│   ├── FileSystem.ts         # Виртуальная файловая система (in-memory)
│   ├── LevelLoader.ts        # Загрузка и валидация YAML-уровней
│   ├── HintSystem.ts         # Система подсказок (3 уровня)
│   ├── WinConditionChecker.ts
│   └── TabCompletion.ts      # Tab-autocomplete для ls/cd/cat
├── hooks/
│   ├── useGameSession.ts     # Логика submitCommand
│   ├── useOxygen.ts          # Таймер кислорода
│   └── useRobotJokes.ts      # Шутки робота
├── store/
│   └── gameStore.ts          # Zustand: фазы, прогресс, кислород, robot state
├── levels/                   # YAML-файлы уровней (редактируемые)
│   ├── level_00_tutorial.yaml
│   ├── level_01_airlock.yaml
│   ├── level_02_crew_quarters.yaml
│   ├── level_03_cargo_bay.yaml
│   └── level_04_comms.yaml
└── types/
    └── level.types.ts        # Источник истины для схемы уровня
```

---

## Формат YAML-файла уровня

Каждый уровень — отдельный `.yaml` файл в папке `game/src/levels/`.
Это **единственное место**, которое нужно редактировать для изменения контента.

> Схема полей — в `game/src/types/level.types.ts`.  
> Опциональное поле `section_plan` (ASCII-план отсека) — см. `docs/cursor_prompt_section_plan.md`.

```yaml
# game/src/levels/level_01_airlock.yaml  (упрощённый пример — см. файл в репо)

id: "level_01"
title: "Миссия 1: Шлюз"
location: "Внешний шлюз — Сектор A"

# Нарратив: выводится при старте уровня построчно с эффектом печатания
narrative:
  - "RETRO-UX v3.11 // ИНИЦИАЛИЗАЦИЯ..."
  - "МЕСТОПОЛОЖЕНИЕ: Внешний шлюз. Давление: 0.0 атм."
  - "Гермодверь заблокирована. Найдите способ открыть её."
  - "Система кислорода скафандра: 87%. Не медлите."

# Виртуальная файловая система уровня
# Движок создаёт её в памяти при загрузке уровня
filesystem:
  - path: "/"
    type: dir
  - path: "/system_core"
    type: dir
  - path: "/system_core/open_door.sh"
    type: file
    permissions: "000"          # права сброшены после столкновения
    content: |
      #!/bin/bash
      echo "▶ Инициализация протокола разблокировки..."
      echo "██ ДВЕРЬ ОТКРЫТА. Путь в жилой отсек свободен. ██"
  - path: "/system_core/README.txt"
    type: file
    content: |
      Скрипты требуют прав на исполнение.
      chmod +x <скрипт>  →  ./<скрипт>
  - path: "/logs/access.log"
    type: file
    content: |
      [ACCESS LOG] PERMISSIONS RESET: /system_core/* → 000

# Команды, которые изучает игрок на этом уровне
# Используется в подсказках и в обучающей сводке после победы
learning_objectives:
  - command: "pwd"
    description: "Показать текущую директорию"
    example: "pwd"
  - command: "ls"
    description: "Список файлов"
    example: "ls -la"
  - command: "cd"
    description: "Сменить директорию"
    example: "cd system_core"
  - command: "cat"
    description: "Прочитать файл"
    example: "cat /system_core/README.txt"
  - command: "chmod"
    description: "Изменить права доступа"
    example: "chmod +x open_door.sh"

# Условие победы: какое действие завершает уровень
win_condition:
  type: "command_executed"
  command: "./open_door.sh"
  working_directory: "/system_core"

# Система подсказок (вызываются командой: hint 1 / hint 2 / hint 3)
hints:
  - level: 1
    text: "Проверьте содержимое /system_core: ls -la. Обратите внимание на права."
  - level: 2
    text: "open_door.sh не исполняемый. chmod +x open_door.sh исправит это."
  - level: 3
    text: "cd /system_core → chmod +x open_door.sh → ./open_door.sh (−10 очков)"

# Награда за прохождение
reward:
  oxygen_bonus: 25
  score: 100
  unlock_log: "Шлюз открыт. Следующий отсек: жилой блок экипажа."
```

---

## Пошаговые этапы разработки

### Этап 1: Проект и CRT-визуал (День 1)

**Задачи:**
1. Инициализировать проект: `npm create vite@latest retro-terminal -- --template react-ts`
2. Установить все зависимости из списка выше
3. Настроить Tailwind CSS
4. Создать компонент `CRTOverlay.tsx` с эффектом старого монитора:
   - CSS-переменные: `--crt-green: #00ff41`, `--crt-amber: #ffb000`
   - Анимация scanlines через `::before` псевдоэлемент
   - Мерцание через `@keyframes flicker` с opacity 0.97–1.0
   - Слабое свечение текста: `text-shadow: 0 0 8px var(--crt-green)`
   - Фон: `#0a0a0a`, шрифт: `'VT323'` или `'Courier New'` monospace
5. Вывести статичный экран загрузки "RETRO-UX v3.11 INITIALIZING..."

**Результат этапа:** Работающий CRT-экран с атмосферой.

---

### Этап 2: Терминал и движок команд (День 2–3)

**Задачи:**
1. Интегрировать `xterm.js` в компонент `Terminal.tsx`
2. Создать `CommandParser.ts`:
   - Распознавание команд по регулярным выражениям
   - Маршрутизация к обработчикам: `handleLs()`, `handleCd()`, `handleCat()` и т.д.
   - Вывод кастомных ошибок: `bash: command not found: rm` (запрещённые команды)
3. Создать `FileSystem.ts`:
   - Класс `VirtualFS` с методами: `ls(path)`, `cd(path)`, `cat(path)`, `chmod(path, mode)`
   - Состояние файловой системы хранится в памяти как дерево объектов
   - Инициализируется из YAML-структуры `filesystem:` при загрузке уровня
4. Реализовать базовые команды: `pwd`, `ls`, `ls -la`, `cd`, `cat`, `chmod +x`, исполнение `.sh` скриптов

**Результат этапа:** Рабочий терминал, в котором можно пройти Миссию 1 вручную.

---

### Этап 3: Загрузчик уровней и YAML-парсер (День 4)

**Задачи:**
1. Создать `LevelLoader.ts`:
   - Загрузка YAML-файла через `import` (Vite поддерживает `?raw` импорт)
   - Парсинг через `js-yaml`
   - Валидация структуры (проверить наличие обязательных полей)
2. Создать TypeScript-типы в `level.types.ts` для всей структуры YAML
3. При старте уровня:
   - Вывести `narrative:` построчно с эффектом печатания (50мс между символами)
   - Инициализировать `VirtualFS` из секции `filesystem:`
   - Зарегистрировать `win_condition` в движке
4. При выполнении `win_condition` — показать экран победы, начислить `reward`

**Результат этапа:** Полностью рабочая Миссия 1, управляемая из YAML-файла.

---

### Этап 4: Игровые системы (День 5–6)

**Задачи:**
1. **Zustand store** (`gameStore.ts`):
   - `currentLevel`, `oxygen` (0–100), `score`, `completedLevels[]`
   - Сохранение/восстановление из `localStorage`
2. **OxygenBar** компонент:
   - Убывает на 1% каждые 30 секунд
   - Анимируется цветом: зелёный → жёлтый → красный (при <20%)
   - При 0 — экран Game Over с предложением начать заново или загрузить сохранение
3. **HintSystem** (`HintSystem.ts`):
   - Команда `hint` без аргумента показывает доступные уровни
   - `hint 1`, `hint 2`, `hint 3` — применяют штраф и выводят текст из YAML
4. **MissionLog** компонент:
   - Правая панель с `learning_objectives` текущего уровня
   - Галочка ✓ появляется, когда команда была успешно использована

**Результат этапа:** Полная игровая петля с сохранением.

---

### Этап 5: Наполнение уровней (День 7–10)

**Статус:** ✅ выполнено для v1 (5 уровней).

| Файл | Содержание |
|------|------------|
| `level_00_tutorial.yaml` | `ls`, `cd`, `cat`; таймер O₂ отключён |
| `level_01_airlock.yaml` | `ls -la`, `chmod +x`, `./open_door.sh` |
| `level_02_crew_quarters.yaml` | `grep`, `grep -r`, `find`, медотсек |
| `level_03_cargo_bay.yaml` | `tar`, `mkdir`, `cp`, архив навигации |
| `level_04_comms.yaml` | `ip a`, `ping`, `ssh`, `remote_filesystem` |

**Roadmap v2:** уровни 05–08 (турель, двигатель, реактор, финал) — см. расширенный сценарий ниже.

**Результат этапа:** Игра проходима от tutorial до SSH-финала.

---

### Этап 6: Полировка (День 11–14)

**Задачи:**
1. Звуки: Web Audio API — тихое гудение (drone), клик клавиатуры, тревожный сигнал при низком кислороде
2. ASCII-арт заставки для каждой миссии (рисуется в YAML в поле `ascii_art:`)
3. Экран "Обучающая сводка" после каждой миссии — показывает `learning_objectives` с примерами
4. Финальный экран с логом всех использованных команд — "Твоя история выживания"
5. README для контент-редактора: как добавить новый уровень, не трогая код

---

## Важные детали реализации

**Запрещённые команды** — движок должен их перехватывать и выдавать нарративный отказ:
```
> rm -rf /
RETRO-UX: Команда заблокирована системой безопасности корабля.
```

**Симуляция SSH (Миссия 4)** — это не настоящий SSH. При вводе
`ssh engineer@192.168.1.42` движок переключает контекст терминала
на "удалённую" виртуальную файловую систему из YAML (`remote_filesystem:`).

**Автодополнение Tab** — реализовать для `ls`/`cd`/`cat` через xterm.js addon.

**Мобильная версия** — не нужна. Игра заточена под десктоп с клавиатурой.

**SectionPlan (ASCII-план отсека)** — декоративная правая панель с hover-подсказками.
Спецификация: `docs/cursor_prompt_section_plan.md`. Поле `section_plan` в YAML — опционально.

---

# РАСШИРЕННЫЙ СЦЕНАРИЙ — Ностромо-8 (Roadmap v2)

> ⚠️ **Не путать с реализованными уровнями.** Таблица выше — фактический контент v1.
> Этот раздел — целевой нарратив на **9 уровней** с другой нумерацией локаций
> (например, «Рубка управления / grant_admin» = level_02 в roadmap, но в v1
> `level_02` — жилой отсек с grep). Используй как референс для следующих YAML-файлов
> и движковых фич (`hasSudo`, `mock_processes`, новые `win_condition`).

---

## Нарративный arc (мировая история)

```
ПРОЛОГ
Грузовой корабль "Ностромо-8" дрейфует в поясе астероидов — без экипажа,
без питания, без воздуха. Ты — единственный выживший. Скафандр даёт 90 минут
кислорода. Корабль можно запустить — но для этого нужно пройти через каждый
отсек и восстановить системы вручную, через единственный уцелевший терминал.

АКТ 1 (Уровни 00–02): Выжить и закрепиться
  Добраться до рубки управления, включить основные системы.

АКТ 2 (Уровни 03–05): Снять блокировки
  Отключить турель, найти навигационные данные, восстановить связь.

АКТ 3 (Уровни 06–08): Запустить корабль
  Активировать реактор, настроить сеть, расшифровать финальный код.

ЭПИЛОГ
Корабль выходит на орбиту. Сигнал SOS принят спасательной станцией.
```

---

## Ключевая механика: вариативность прав

### Точка ветвления — Уровень 02: Рубка управления

В рубке есть скрипт `./grant_admin.sh`. Если игрок его запускает:

```
gameStore.hasSudo = true     ← хранится в Zustand + localStorage
```

**Если `hasSudo = true`** — на уровнях 03–08 защищённые команды работают напрямую:
```
$ kill -9 4821
Process terminated.
```

**Если `hasSudo = false`** — те же команды дают `Permission denied`:
```
$ kill -9 4821
bash: kill: (4821) - Operation not permitted

$ sudo kill -9 4821
[sudo] password for pilot: ██████
Process terminated.
```

Для файлов — аналогично: скрипт с правами `750` не запустится без `chmod +x`
или `sudo ./script.sh`. Это не блокирует прохождение — только добавляет шаг.

### Реализация в движке

```typescript
// gameStore.ts — добавить поле
hasSudo: false,
setHasSudo: (v: boolean) => set({ hasSudo: v }),

// CommandParser.ts — обёртка для защищённых команд
function requiresPrivilege(cmd: string, args: string[]): boolean {
  const PROTECTED = ['kill', 'systemctl', 'netstat', 'useradd', 'usermod'];
  return PROTECTED.some(p => cmd === p);
}

// При выполнении команды:
if (requiresPrivilege(cmd, args) && !gameStore.hasSudo && !input.startsWith('sudo ')) {
  return { lines: [{ text: `bash: ${cmd}: Operation not permitted`, kind: 'error' }] };
}
```

### Поведение `sudo` в терминале

```
$ sudo kill -9 4821
[sudo] password for pilot:
```
Терминал маскирует ввод (`*`). Пароль берётся из YAML уровня:
```yaml
sudo_password: "n0str0m0"    # опциональное поле, если не задано — любой пароль принимается
```

---

## Карта уровней (Roadmap v2)

> Соответствие v1 → v2: `level_00`≈00, `level_01`≈01, `level_02`(crew/grep)≈04(comms/grep),
> `level_03`(cargo/tar)≈05(cargo), `level_04`(ssh)≈08(network). Уровни 02-bridge, 03-turret,
> 06-engine, 07-reactor — **ещё не реализованы**.

| № | Локация             | Новые команды                          | Повторение     | Сложность | v1 |
|---|---------------------|----------------------------------------|----------------|-----------|-----|
| 00 | Аварийная капсула  | `pwd`, `ls`, `cd`, `cat`               | —              | ★☆☆☆☆    | ✅ `level_00` |
| 01 | Внешний шлюз       | `ls -la`, `chmod +x`, `./script.sh`   | ls, cd, cat    | ★★☆☆☆    | ✅ `level_01` |
| 02 | Рубка управления   | `chmod 755`, `./grant_admin.sh`        | ls -la, cat    | ★★☆☆☆    | 🔜 |
| 03 | Турельный пост     | `netstat -tlnp`, `lsof -i`, `kill -9`  | chmod, [sudo]  | ★★★☆☆    | 🔜 |
| 04 | Рубка связи        | `grep`, `grep -r`, `grep -i`, `find`   | cat, ls        | ★★★☆☆    | ≈ `level_02` |
| 05 | Грузовой отсек     | `tar -xzf`, `mkdir`, `cp`, `mv`        | ls -la, chmod  | ★★★☆☆    | ≈ `level_03` |
| 06 | Машинное отделение | `ps aux`, `ps \| grep`, `df -h`        | kill, [sudo]   | ★★★★☆    | 🔜 |
| 07 | Реактор            | `systemctl`, `tail -f`, `tee`          | ps, kill, [sudo] | ★★★★☆  | 🔜 |
| 08 | Сетевой узел       | `ip a`, `ping`, `ssh`, `curl`          | grep, find     | ★★★★★    | ≈ `level_04` |

---

## Детальный дизайн уровней

---

### LEVEL 00 — Аварийная капсула (Tutorial)

```
Локация:  escape_pod / Сектор 0
O2 таймер: ОТКЛЮЧЁН
Команды:  pwd, ls, cd, cat
```

**Нарратив:**
```
RETRO-UX v3.11 // ИНИЦИАЛИЗАЦИЯ АВАРИЙНОГО ТЕРМИНАЛА...
МЕСТОПОЛОЖЕНИЕ: Спасательная капсула — Стыковочный узел B
Системы жизнеобеспечения: АКТИВНЫ
Кислород скафандра: 100%
---
Найди инструкции по эвакуации. Осмотрись.
```

**Файловая система:**
```
/
├── READ_ME.txt             (permissions: 644)
└── mission/
    ├── briefing.txt        (permissions: 644)
    └── ship_map.txt        (permissions: 644)
```

**Содержимое `briefing.txt`:**
```
АВАРИЙНЫЙ ПРОТОКОЛ — КОРАБЛЬ "НОСТРОМО-8"
Экипаж: ЭВАКУИРОВАН
Статус корабля: КРИТИЧЕСКИЙ
Твоя цель: добраться до рубки управления через шлюзовую камеру.
Первый шаг — прочти карту корабля: mission/ship_map.txt
```

**Win condition:** `file_read` → `/mission/ship_map.txt`

**Hints:**
1. Что здесь есть? Попробуй: `ls`
2. Папка — это тоже файл. Попробуй: `cd mission`
3. Полное решение: `ls` → `cd mission` → `cat ship_map.txt`

**Reward:** `oxygen_bonus: 0, score: 50`

---

### LEVEL 01 — Внешний шлюз

```
Локация:  airlock_a / Сектор A
O2 таймер: АКТИВЕН (-1% / 30с)
Новые команды: ls -la, chmod +x, ./script.sh
Повторение:   ls, cd, cat
```

**Нарратив:**
```
RETRO-UX // ШЛЮЗ СЕКТОР-A
Статус двери: ЗАБЛОКИРОВАНА [автоматика]
Скафандр O₂: 87%  — Не медли.
---
Инженер Чэнь оставил заметки. Найди их.
```

**Файловая система:**
```
/
├── engineers_note.txt      (644)
└── system_core/            (700 → нет доступа)
    ├── door_logs.log       (600)
    └── open_door.sh        (600)  ← нужно chmod +x
```

**Механика:**
- `cd system_core` → `Permission denied` (директория 700)
- `cat engineers_note.txt` → подсказка: "у меня нет прав на system_core, но я оставил копию"
- Добавить скрытый файл: `/engineers_note.txt` содержит копию пароля
- `chmod 755 system_core` → открывает директорию
- `chmod +x system_core/open_door.sh` → делает скрипт исполняемым
- `cd system_core && ./open_door.sh` → победа

**Ключевое обучение:** права доступа — не абстракция, а реальный барьер.

**Win condition:** `command_executed` → `./open_door.sh` in `/system_core`

**Hints:**
1. Прочти записку: `cat engineers_note.txt`
2. Директория закрыта. Попробуй: `chmod 755 system_core`
3. Полное решение: `chmod 755 system_core` → `chmod +x system_core/open_door.sh` → `cd system_core` → `./open_door.sh`

**Reward:** `oxygen_bonus: 20, score: 100`

---

### LEVEL 02 — Рубка управления (BRANCHING POINT)

```
Локация:  bridge / Главная рубка
O2 таймер: АКТИВЕН
Новые команды: chmod 755 (на директорию), ./grant_admin.sh
Повторение:   ls -la, cat, chmod +x
⚠️  КЛЮЧЕВОЕ РЕШЕНИЕ: запустить grant_admin.sh или пропустить
```

**Нарратив:**
```
RETRO-UX // РУБКА УПРАВЛЕНИЯ — НОСТРОМО-8
Основные системы: OFFLINE
Административный токен: НЕ НАЗНАЧЕН
---
Капитан Вейл оставил инструкции по восстановлению.
Предупреждение: без прав администратора доступ к
критическим системам будет ограничен.
```

**Файловая система:**
```
/
├── captain_log.txt         (644)
├── admin/                  (750)
│   ├── grant_admin.sh      (750)  ← chmod +x → ./grant_admin.sh
│   └── system_tokens.txt   (600)
└── systems/
    ├── init_systems.sh     (644)  ← win condition
    └── status.txt          (644)
```

**Содержимое `captain_log.txt`:**
```
ЖУРНАЛ КАПИТАНА ВЕЙЛ — ДЕНЬ 843
Если ты читаешь это — значит, автоматика сработала.
Чтобы получить полный контроль над кораблём:
  chmod +x admin/grant_admin.sh
  ./admin/grant_admin.sh
Без этого многие команды потребуют sudo.
Пароль sudo, если понадобится: n0str0m0
После — запусти systems/init_systems.sh
```

**Содержимое `grant_admin.sh`:**
```bash
#!/bin/bash
echo "Верификация биометрии..."
echo "ИДЕНТИФИКАЦИЯ ПОДТВЕРЖДЕНА"
echo "Права администратора назначены пользователю: pilot"
echo "[SUDO_GRANTED]"    # движок ловит этот тег и устанавливает hasSudo=true
```

**Механика:**
- Игрок МОЖЕТ пропустить `grant_admin.sh` и напрямую запустить `init_systems.sh`
- Движок записывает `hasSudo = true/false` в store при завершении уровня
- Подсказка уровня намекает на это, но не требует

**Win condition:** `command_executed` → `./init_systems.sh` in `/systems`

**Hints:**
1. Прочти журнал капитана: `cat captain_log.txt`
2. Получи права администратора — это пригодится на следующих уровнях
3. Полное решение: `chmod +x admin/grant_admin.sh` → `./admin/grant_admin.sh` → `cd systems` → `./init_systems.sh`

**Reward:** `oxygen_bonus: 25, score: 150`
**Unlock log:** `"Рубка ожила. На мониторе мигает статус: ТУРЕЛЬ АКТИВНА. Отсек 3 заблокирован."`

---

### LEVEL 03 — Турельный пост

```
Локация:  turret_control / Сектор C
O2 таймер: АКТИВЕН (повышенный расход: -1.5% / 30с)
Новые команды: netstat -tlnp, lsof -i :PORT, kill -9 PID
Повторение:   chmod, cat, [sudo если нет прав]
Вариативность: kill/netstat требуют sudo без hasSudo
```

**Нарратив:**
```
RETRO-UX // ТУРЕЛЬНЫЙ ПОСТ — СЕКТОР C
⚠  АВТОМАТИЧЕСКАЯ ТУРЕЛЬ АКТИВНА
⚠  ДАТЧИК ДВИЖЕНИЯ: КАЛИБРОВАН
Процесс управления турелью занимает порт 4821.
Найди PID процесса и уничтожь его.
```

**Файловая система:**
```
/
├── security_manual.txt     (644)
├── logs/
│   ├── turret.log          (644)
│   └── active_ports.txt    (644)
└── emergency/
    ├── disable_turret.sh   (750)  ← chmod +x нужен
    └── override_code.txt   (600)  ← нужно sudo cat или chmod
```

**Содержимое `security_manual.txt`:**
```
РУКОВОДСТВО ПО БЕЗОПАСНОСТИ — НОСТРОМО-8
Турель управляется процессом turret_daemon на порту 4821.

Для отключения:
1. Найди PID процесса: netstat -tlnp | grep 4821
   или: lsof -i :4821
2. Уничтожь процесс: kill -9 <PID>
3. Запусти процедуру отключения: ./emergency/disable_turret.sh
```

**Симулируемые процессы (движок генерирует при старте уровня):**
```
# netstat -tlnp (или sudo netstat -tlnp)
Proto  Local Address    PID/Program
tcp    0.0.0.0:22       1102/sshd
tcp    0.0.0.0:4821     4821/turret_daemon   ← цель
tcp    0.0.0.0:8080     2205/web_monitor

# ps aux
pilot  1102  0.0  sshd
pilot  2205  0.0  web_monitor
root   4821  98.7 turret_daemon              ← цель
```

**Механика:**
- `netstat -tlnp` → если `!hasSudo`: `Permission denied. Try: sudo netstat -tlnp`
- `sudo netstat -tlnp` → показывает таблицу с PID 4821
- `kill -9 4821` → если `!hasSudo`: `Operation not permitted. Try: sudo kill -9 4821`
- После kill → `turret_daemon` исчезает из `ps aux`
- `chmod +x emergency/disable_turret.sh` → `./emergency/disable_turret.sh` → победа

**Win condition:** `command_executed` → `./disable_turret.sh` in `/emergency`
**Pre-condition:** процесс `turret_daemon` должен быть убит (флаг в движке)

**Hints:**
1. Узнай какой процесс держит порт 4821: `netstat -tlnp` или `lsof -i :4821`
2. Запомни PID и уничтожь процесс: `kill -9 <PID>` (может потребоваться sudo)
3. Полное решение: `sudo netstat -tlnp` → `sudo kill -9 4821` → `chmod +x emergency/disable_turret.sh` → `./emergency/disable_turret.sh`

**Reward:** `oxygen_bonus: 20, score: 200`

---

### LEVEL 04 — Рубка связи

```
Локация:  comms / Рубка связи
O2 таймер: АКТИВЕН
Новые команды: grep, grep -r, grep -i, find -name, find -mtime
Повторение:   cat, ls, cd
```

**Нарратив:**
```
RETRO-UX // РУБКА СВЯЗИ — НОСТРОМО-8
Статус маяка: OFFLINE
Частота передачи: НЕИЗВЕСТНА
Логи переговоров рассыпаны по 200+ файлам.
Найди частоту сигнала SOS. Она где-то в логах.
```

**Файловая система:**
```
/
├── comms_manual.txt        (644)
├── logs/                   (755)
│   ├── 2187-01/            (755)   ← 50 файлов .log
│   ├── 2187-02/            (755)   ← 50 файлов .log
│   └── 2187-03/            (755)
│       ├── crew_chat.log   (644)
│       ├── system.log      (644)
│       └── emergency.log   (644)   ← содержит FREQ=472.88
└── beacon/
    └── activate_beacon.sh  (750)   ← win condition
```

**Ключевые данные в логах:**
```
# logs/2187-03/emergency.log
[2187-03-14 01:44] EMERGENCY PROTOCOL INITIATED
[2187-03-14 01:45] SOS FREQUENCY SET: FREQ=472.88
[2187-03-14 01:46] BEACON: OFFLINE (power failure)
```

**Команды и их вывод:**
```bash
# Найти файл с частотой:
$ grep -r "FREQ" logs/
logs/2187-03/emergency.log:[2187-03-14 01:45] SOS FREQUENCY SET: FREQ=472.88

# Найти все .log файлы за март:
$ find logs/ -name "*.log" -path "*/2187-03/*"
logs/2187-03/crew_chat.log
logs/2187-03/system.log
logs/2187-03/emergency.log

# Поиск без учёта регистра:
$ grep -i "frequency" logs/2187-03/emergency.log
[2187-03-14 01:45] SOS FREQUENCY SET: FREQ=472.88
```

**Win condition:** `command_executed` → `./activate_beacon.sh` in `/beacon`
**Pre-condition:** команда `grep` с паттерном `FREQ` была выполнена (движок отслеживает)

**Hints:**
1. Файлов много — используй поиск: `grep -r "FREQ" logs/`
2. Или сначала найди нужный файл: `find logs/ -name "emergency*"`
3. Полное решение: `grep -r "FREQ" logs/` → `cd beacon` → `chmod +x activate_beacon.sh` → `./activate_beacon.sh`

**Reward:** `oxygen_bonus: 15, score: 200`

---

### LEVEL 05 — Грузовой отсек

```
Локация:  cargo_bay / Грузовой отсек
O2 таймер: АКТИВЕН
Новые команды: tar -xzf, mkdir, cp, mv, ls -lh
Повторение:   chmod +x, cd, cat
```

**Нарратив:**
```
RETRO-UX // ГРУЗОВОЙ ОТСЕК — НОСТРОМО-8
Навигационные данные: АРХИВИРОВАНЫ
Архив повреждён, частично — требует ручной сборки.
Распакуй данные, собери карту маршрута.
```

**Файловая система:**
```
/
├── cargo_manifest.txt      (644)
└── nav_archive/
    ├── navigation_data.tar.gz   (644, is_archive: true)
    │   └── [содержимое архива]:
    │       ├── route_part_1.dat
    │       ├── route_part_2.dat
    │       └── route_part_3.dat
    └── README_archive.txt  (644)
```

**Механика:**
```bash
# Создать папку для распаковки
$ mkdir nav_extracted

# Распаковать архив
$ tar -xzf nav_archive/navigation_data.tar.gz -C nav_extracted/
nav_extracted/route_part_1.dat
nav_extracted/route_part_2.dat
nav_extracted/route_part_3.dat

# Собрать маршрут
$ cat nav_extracted/route_part_1.dat
$ cat nav_extracted/route_part_2.dat
$ cat nav_extracted/route_part_3.dat

# Скопировать в /beacon/data/ (создана в предыдущем уровне — или создать)
$ mkdir -p /beacon/data
$ cp nav_extracted/*.dat /beacon/data/

# Финальный скрипт
$ cd /beacon/data
$ ./beacon_protocol.sh
```

**Win condition:** `command_executed` → `./beacon_protocol.sh` in `/beacon/data`
**Pre-condition:** все 3 `route_part_*.dat` существуют в `/beacon/data/`

**Hints:**
1. Посмотри что в архиве: `tar -tzf nav_archive/navigation_data.tar.gz`
2. Распакуй: `mkdir nav_extracted && tar -xzf nav_archive/navigation_data.tar.gz -C nav_extracted/`
3. Полное решение: `mkdir nav_extracted` → `tar -xzf nav_archive/navigation_data.tar.gz -C nav_extracted/` → `mkdir -p /beacon/data` → `cp nav_extracted/*.dat /beacon/data/` → `cd /beacon/data` → `./beacon_protocol.sh`

**Reward:** `oxygen_bonus: 15, score: 200`

---

### LEVEL 06 — Машинное отделение

```
Локация:  engine_room / Машинное отделение
O2 таймер: АКТИВЕН (расход: -2% / 30с — кислород кончается)
Новые команды: ps aux, ps | grep, df -h, kill (повторение с pipes)
Повторение:   kill -9, [sudo], chmod +x
Вариативность: kill требует sudo без hasSudo
```

**Нарратив:**
```
RETRO-UX // МАШИННОЕ ОТДЕЛЕНИЕ — НОСТРОМО-8
⚠  O₂: КРИТИЧЕСКИЙ УРОВЕНЬ
Двигательная система заблокирована процессом-зомби.
Найди и уничтожь зависший процесс. Быстро.
```

**Файловая система:**
```
/
├── engine_manual.txt       (644)
├── diagnostics/
│   └── run_diag.sh         (750)
└── engine/
    ├── start_engines.sh    (750)  ← win condition
    └── engine_status.txt   (644)
```

**Симулируемые процессы:**
```
# ps aux
USER    PID   %CPU  %MEM  COMMAND
pilot   101   0.0   0.1   bash
pilot   205   0.0   0.2   terminal_ui
root    1337  99.9  45.2  legacy_lockd    ← ЗОМБИ-ПРОЦЕСС, надо убить
pilot   1401  0.0   0.1   engine_monitor

# df -h
Filesystem      Size  Used Avail  Mounted on
/dev/sda1       500G  487G  13G   /           ← диск почти полон (нарратив)
/dev/sdb1       100G   2G   98G   /cargo
```

**Механика:**
```bash
# Найти зависший процесс через pipe
$ ps aux | grep legacy
root  1337  99.9  45.2  legacy_lockd

# Убить процесс
$ kill -9 1337          # → Permission denied (без sudo)
$ sudo kill -9 1337     # → Process terminated

# Проверить диск (опционально, но учит команде)
$ df -h

# Запустить двигатели
$ chmod +x engine/start_engines.sh
$ cd engine
$ ./start_engines.sh
```

**Win condition:** `command_executed` → `./start_engines.sh` in `/engine`
**Pre-condition:** `legacy_lockd` PID 1337 убит

**Hints:**
1. Найди что жрёт CPU: `ps aux | grep -v grep | sort -k3 -r | head`
2. Уничтожь процесс: `kill -9 1337` (возможно потребуется sudo)
3. Полное решение: `ps aux | grep legacy` → `sudo kill -9 1337` → `chmod +x engine/start_engines.sh` → `cd engine` → `./start_engines.sh`

**Reward:** `oxygen_bonus: 30, score: 250`

---

### LEVEL 07 — Реактор

```
Локация:  reactor / Реакторный отсек
O2 таймер: АКТИВЕН
Новые команды: tail -f (симуляция), systemctl (симуляция), tee
Повторение:   ps aux, kill, [sudo], chmod +x
Вариативность: systemctl требует sudo без hasSudo
```

**Нарратив:**
```
RETRO-UX // РЕАКТОРНЫЙ ОТСЕК — НОСТРОМО-8
Реактор: COLD SHUTDOWN
Для запуска требуется: последовательный старт трёх систем.
Следи за логом запуска в реальном времени.
```

**Файловая система:**
```
/
├── reactor_manual.txt      (644)
├── reactor/
│   ├── start_coolant.sh    (750)   ← шаг 1
│   ├── start_core.sh       (750)   ← шаг 2
│   └── start_reactor.sh    (750)   ← шаг 3, win condition
└── logs/
    └── reactor.log         (644)   ← tail -f симуляция
```

**Механика — последовательность:**
```bash
# Шаг 1: запустить систему охлаждения
$ chmod +x reactor/start_coolant.sh
$ ./reactor/start_coolant.sh
[COOLANT] Помпы активированы...
[COOLANT] Температура: стабилизируется
[OK] coolant_system: ONLINE

# Шаг 2: запустить ядро (требует, чтобы coolant был запущен)
$ ./reactor/start_core.sh
[CORE] Проверка охлаждения...
[CORE] Инициализация...
[OK] reactor_core: STANDBY

# Наблюдать за логом (симуляция tail -f):
$ tail -f logs/reactor.log
[01:23:45] coolant_system: OK
[01:23:46] reactor_core: initializing...
[01:23:47] reactor_core: STANDBY

# Шаг 3: финальный запуск
$ ./reactor/start_reactor.sh
[REACTOR] Все системы готовы.
[REACTOR] ЗАПУСК... 3... 2... 1...
[REACTOR] ONLINE ✓
```

**Win condition:** `command_executed` → `./start_reactor.sh` in `/reactor`
**Pre-condition:** оба предыдущих скрипта выполнены (флаги в движке)

**Hints:**
1. Читай мануал: `cat reactor_manual.txt` — там последовательность
2. Запускай системы по порядку: coolant → core → reactor
3. Полное решение: `chmod +x reactor/*.sh` → `./reactor/start_coolant.sh` → `./reactor/start_core.sh` → `./reactor/start_reactor.sh`

**Reward:** `oxygen_bonus: 35, score: 300`

---

### LEVEL 08 — Сетевой узел (финал)

```
Локация:  network_hub / Сетевой узел
O2 таймер: АКТИВЕН (финальный отсчёт)
Новые команды: ip a, ping, ssh (симуляция), curl (симуляция)
Повторение:   grep, find, cat
SSH: переключение на remote_filesystem
```

**Нарратив:**
```
RETRO-UX // СЕТЕВОЙ УЗЕЛ — НОСТРОМО-8
Двигатели ONLINE. Маяк ONLINE.
Последнее препятствие: спасательная станция не отвечает.
Нужно подключиться к ретранслятору и активировать канал связи.
```

**Файловая система (local):**
```
/
├── network_log.txt         (644)
├── secrets/
│   └── ssh_credentials.txt (600)  ← нужно sudo cat
└── relay/
    └── connect_relay.sh    (750)  ← требует ssh сначала
```

**Remote filesystem (после ssh):**
```
/
├── relay/
│   └── activate_relay.sh   (750)  ← win condition
└── config/
    └── relay_config.txt    (644)
```

**Механика:**
```bash
# Узнать IP
$ ip a
eth0: inet 10.0.0.5/24

# Пингануть ретранслятор
$ ping 10.0.0.42
PING 10.0.0.42: 56 bytes
64 bytes from 10.0.0.42: time=1.2ms

# Получить credentials
$ cat secrets/ssh_credentials.txt     # Permission denied
$ sudo cat secrets/ssh_credentials.txt
SSH_HOST: 10.0.0.42
SSH_USER: relay_operator
SSH_PASS: r3lay_2187

# Подключиться
$ ssh relay_operator@10.0.0.42
relay_operator@10.0.0.42's password: ██████
Connected to RELAY-NODE-7.

# На удалённой машине:
$ chmod +x relay/activate_relay.sh
$ ./relay/activate_relay.sh
[RELAY] Канал связи активирован.
[RELAY] SOS TRANSMITTED ✓
```

**Win condition:** `command_executed` → `./activate_relay.sh` in `/relay` (remote context)

**Hints:**
1. Найди IP сети: `ip a`, попробуй достучаться: `ping 10.0.0.42`
2. Credentials в secrets/: `sudo cat secrets/ssh_credentials.txt`
3. Полное решение: `ip a` → `ping 10.0.0.42` → `sudo cat secrets/ssh_credentials.txt` → `ssh relay_operator@10.0.0.42` → `chmod +x relay/activate_relay.sh` → `./relay/activate_relay.sh`

**Reward:** `oxygen_bonus: 99, score: 500`
**Unlock log:** `"СИГНАЛ SOS ПРИНЯТ. Спасательное судно 'HYPERION' выходит на курс. Расчётное время прибытия: 4 часа. Ты выжил."`

---

## Таблица команд по уровням (для Cursor)

```
Команда              | 00 | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08
─────────────────────┼────┼────┼────┼────┼────┼────┼────┼────┼────
pwd                  | ★  |    |    |    |    |    |    |    |
ls                   | ★  | ↺  | ↺  |    | ↺  |    |    |    |
ls -la               |    | ★  | ↺  |    |    | ↺  |    |    |
ls -lh               |    |    |    |    |    | ★  |    |    |
cd                   | ★  | ↺  | ↺  | ↺  | ↺  | ↺  | ↺  | ↺  | ↺
cat                  | ★  | ↺  | ↺  | ↺  | ↺  |    |    |    | ↺
chmod +x             |    | ★  | ↺  | ↺  | ↺  | ↺  | ↺  | ↺  |
chmod 755/600        |    |    | ★  |    |    |    |    |    |
./script.sh          |    | ★  | ↺  | ↺  |    | ↺  | ↺  | ↺  | ↺
grep                 |    |    |    |    | ★  |    |    |    | ↺
grep -r              |    |    |    |    | ★  |    |    |    |
grep -i              |    |    |    |    | ★  |    |    |    |
find -name           |    |    |    |    | ★  |    |    |    |
tar -xzf             |    |    |    |    |    | ★  |    |    |
mkdir                |    |    |    |    |    | ★  |    |    |
cp / mv              |    |    |    |    |    | ★  |    |    |
netstat -tlnp        |    |    |    | ★  |    |    |    |    |
lsof -i              |    |    |    | ★  |    |    |    |    |
kill -9              |    |    |    | ★  |    |    | ↺  |    |
ps aux               |    |    |    |    |    |    | ★  | ↺  |
ps | grep (pipe)     |    |    |    |    |    |    | ★  |    |
df -h                |    |    |    |    |    |    | ★  |    |
tail -f              |    |    |    |    |    |    |    | ★  |
systemctl (sim)      |    |    |    |    |    |    |    | ★  |
ip a                 |    |    |    |    |    |    |    |    | ★
ping                 |    |    |    |    |    |    |    |    | ★
ssh (sim)            |    |    |    |    |    |    |    |    | ★
curl (sim)           |    |    |    |    |    |    |    |    | ★
sudo                 |    |    |    | ★  |    |    | ↺  | ↺  | ↺

★ = вводится впервые     ↺ = повторение в новом контексте
```

---

## Движковые требования для новых уровней

### Новые типы в `level.types.ts`

```typescript
// Глобальные флаги, сохраняемые между уровнями
interface GlobalFlags {
  hasSudo: boolean;           // Level 02 grant_admin.sh
  beaconActive: boolean;      // Level 04
  enginesOnline: boolean;     // Level 06
  reactorOnline: boolean;     // Level 07
}

// Симулируемые процессы (для ps aux / kill)
interface MockProcess {
  pid: number;
  user: string;
  cpu: number;
  command: string;
  isTarget?: boolean;         // этот PID нужно убить для победы
}

// Секция уровня с процессами
interface LevelDefinition {
  // ... существующие поля
  mock_processes?: MockProcess[];
  sudo_password?: string;     // если не задан — любой пароль принимается
  requires_prev_flags?: Partial<GlobalFlags>;  // пре-условие для загрузки уровня
  sets_flags?: Partial<GlobalFlags>;           // флаги, выставляемые при победе
}
```

### Новые win_condition типы

```yaml
# Процесс убит И скрипт запущен
win_condition:
  type: "process_killed_and_command"
  target_pid: 1337
  command: "./start_engines.sh"
  working_directory: "/engine"

# SSH + команда на удалённой машине
win_condition:
  type: "command_executed"
  command: "./activate_relay.sh"
  working_directory: "/relay"
  requires_ssh: true
  ssh_host: "10.0.0.42"

# Последовательность команд (реактор)
win_condition:
  type: "sequence"
  steps:
    - command: "./start_coolant.sh"
    - command: "./start_core.sh"
    - command: "./start_reactor.sh"
  working_directory: "/reactor"
```