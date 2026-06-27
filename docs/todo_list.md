# TODO LIST — RETRO Linux Terminal Game
> Обновлён: 27.06.2026 на основе аудита от 27.06 (аудит 18.06 закрыт полностью).  
> Читай `docs/audit_review.md` (27.06) и `docs/scenario.md` перед началом работы.  
> Следующий этап: Sprint v2 — подготовка инфраструктуры + движок для уровней 05–08.

---

## Статус аудита 18.06 → 27.06 (всё закрыто)

| Старая задача | Статус |
|---|---|
| TASK-01: Lazy load + ErrorBoundary | ✅ |
| TASK-02: Удалить мёртвые hooks | ✅ |
| TASK-03: useGameSession | ✅ |
| TASK-04: LevelLoadScreen + CutsceneScreen | ✅ |
| TASK-05: unlock_log на VictoryScreen | ✅ |
| TASK-06: GameOverScreen без сломанной кнопки | ✅ |
| TASK-07: pre-commit hook (typecheck+lint+test+validate) | ✅ |
| TASK-08: WinConditionChecker normalize + ssh_host | ✅ |
| TASK-09: 31 тест (CommandParser + WinCondition + SectionPlan) | ✅ |
| TASK-10: Tab autocomplete | ✅ |
| TASK-11: persist version:1 + migrate | ✅ |
| TASK-12: React.lazy(Terminal) code split | ✅ |
| TASK-13: main_readme.md | ⚠️ устарел — в текущем спринте |
| TASK-14: aria-labels TopBar | ✅ |
| TASK-15: keyboard [R] на GameOverScreen | ✅ |
| SectionPlan компонент | ✅ |

---

## Текущее состояние (27.06.2026)

- **Уровней:** 10 (level_00…level_09) ✅
- **Тесты:** 65/65, 4 файла
- **Game loop:** loading → cutscene (+ art, skip click) → playing → victory/gameover ✅
- **Сессия 1:** ✅ CI, pixel art, glob, contains, README
- **Сессия 2:** ✅ hasSudo, mock processes, новые команды, sequence win
- **Сессия 3:** ✅ level_05…level_09 YAML
- **Сессия 4:** ✅ 65 тестов, cutscene skip, FAILSAFE_SCHEMA validate-levels

---

---

## 🟠 HIGH — завершить до расширения контента

> **Сессия 1 (V2-01…V2-06): ✅ выполнена 27.06.2026**

### V2-01: GitHub Actions CI

**Файлы:** `.github/workflows/ci.yml` (новый)

```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: game
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: game/package-lock.json }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint -- --max-warnings 0
      - run: npm test -- --run
      - run: node scripts/validate-levels.js
      - run: npm run build
```

**Чеклист:**
- [x] `.github/workflows/ci.yml` создан
- [ ] CI проходит на `main` (после push на GitHub)
- [x] Badge в `main_readme.md` (заменить OWNER)

---

### V2-02: Pixel art в CutsceneScreen

**Файлы:** `game/src/components/CutsceneScreen.tsx`, `game/src/levels/*.yaml`  
**Аудит:** UX-06 — `imageUrl` prop есть, App.tsx не передаёт, assets не подключены

```
Что сделать:
1. Добавить в каждый YAML поле ascii_art_path: "scenes/level_01_airlock.png"
   (или использовать уже существующее поле ascii_art если оно есть)

2. В App.tsx при phase='cutscene':
   const imgUrl = level.definition.ascii_art_path
     ? new URL(`../assets/scenes/${level.definition.ascii_art_path}`, import.meta.url).href
     : undefined;
   <CutsceneScreen imageUrl={imgUrl} ... />

3. CutsceneScreen: если imageUrl задан — показывать слева 320×240.
   Если не задан — занимать весь экран текстом (graceful degradation).

4. Placeholder: поместить в game/src/assets/scenes/ любой .png 320×240
   на каждый уровень (можно тот же файл переименованный — главное
   чтобы import не падал при сборке).

5. Промты для Stable Diffusion — в docs/UI_designer.md §ЗАДАЧА 5.
```

**Чеклист:**
- [x] `ascii_art_path` в YAML
- [x] App.tsx передаёт imageUrl в CutsceneScreen
- [x] Placeholder assets в `game/src/assets/scenes/`
- [x] `npm run build` — нет ошибок
- [x] Graceful: без файла — текст занимает полный экран

---

### V2-03: VictoryScreen — привязать [Enter]

**Файлы:** `game/src/components/VictoryScreen.tsx`  
**Аудит:** UX-03

```
Добавить useEffect:
  document.addEventListener('keydown', handler)
  handler: e.key === 'Enter' → onNextLevel()
  cleanup: removeEventListener при unmount

Отображать в footer: "[ENTER] СЛЕДУЮЩАЯ МИССИЯ"
— текст уже есть, listener не был добавлен.
```

**Чеклист:**
- [x] Enter переходит на следующий уровень
- [x] Listener удаляется при unmount (нет утечки)

---

### V2-04: Level registry через import.meta.glob

**Файлы:** `game/src/levels/index.ts`  
**Аудит:** FT-01b, §7.1

```
Заменить ручные import * as rawNN на:

const rawYamls = import.meta.glob('./level_*.yaml', { eager: true, as: 'raw' });
// Тип: Record<string, string>

function getLevelById(id: LevelId): LoadedLevel {
  const key = Object.keys(rawYamls).find(k => k.includes(id));
  if (!key) throw new LevelLoadError(`Level not found: ${id}`);
  return parseLevel(rawYamls[key] as string);
}

LEVEL_ORDER и LevelId тип не меняются — только убрать ручные imports.
При добавлении нового level_NN_*.yaml — автодискавери без изменений кода.
Проверить: tryGetLevelById по-прежнему работает с новым getLevelById.
```

**Чеклист:**
- [x] Нет ручных `import levelNN from ...`
- [x] Новый YAML подхватывается glob (нужен только LEVEL_ORDER + LevelId)
- [x] `npm test` — все тесты проходят
- [x] `npm run build` — нет ошибок

---

### V2-05: WinCondition.contains — реализовать или удалить

**Файлы:** `game/src/engine/WinConditionChecker.ts`, `game/src/types/level.types.ts`  
**Аудит:** §8.2 — в типах есть, в checker не реализован

```
Реализовать (нужно для grep win_condition в level_05+):

При type: 'file_read' + contains: 'FREQ=472.88':
  const output = ctx.lastCommandOutput; // добавить в CommandContext
  return output.includes(condition.contains);

Или проще: двухэтапная проверка:
  1. Команда cat/grep выполнена над нужным файлом ✓
  2. Вывод содержит contains строку ✓

CommandContext расширить: lastCommandOutput?: string
CommandParser: при успешном cat/grep → ctx.lastCommandOutput = result

Добавить тест: file_read без contains = достаточно прочитать.
               file_read с contains = проверять вывод.
```

**Чеклист:**
- [x] `contains` работает в WinConditionChecker
- [x] `lastCommandOutput` в CommandContext
- [x] Тест: with/without `contains`

---

### V2-06: Обновить main_readme.md

**Файлы:** `main_readme.md`  
**Аудит:** §11 — устарел, 6 YAML → на самом деле 5, game loop расписан не так

```
Обновить:
- §2 Технический стек: React 19, Vite 8, Zustand 5, TypeScript strict
- §6 Уровни: реализовано 5 (level_00…level_04), roadmap v2: 05–08
- §9 Roadmap: Этапы 1–5 ✅, Этап 6 🔶 В процессе (pixel art, CI), Этап 7 ⬜ levels 05–08
- §4 Архитектура: добавить SectionPlan, useGameSession, useRobotJokes, phase machine
- Добавить CI badge когда V2-01 будет готов
- Добавить раздел «Как добавить уровень»: 1) YAML файл, 2) LEVEL_ORDER (пока не glob)
```

**Чеклист:**
- [x] Стек актуален (версии)
- [x] Roadmap отражает реальность
- [x] Упомянуты SectionPlan, game phases, RobotWidget

---

## 🟡 MEDIUM — движок для уровней 05–08

> Реализовать до создания YAML уровней 05–08.
> Без этого движка новые уровни нельзя завершить.

### V2-07: hasSudo — глобальный флаг прав

**Файлы:** `game/src/store/gameStore.ts`, `game/src/engine/CommandParser.ts`  
**Референс:** `docs/scenario.md` — механика вариативности, Level 02

```
1. gameStore.ts — добавить поле:
   hasSudo: false,
   setHasSudo: (v: boolean) => set({ hasSudo: v }),

   Сохранять в persist (partialize уже включает нужные поля).
   Сбрасывать в false при resetGame() (не при initLevel).

2. CommandParser.ts — константа защищённых команд:
   const SUDO_REQUIRED = ['kill', 'netstat', 'lsof', 'systemctl', 'useradd', 'usermod'];

   Обёртка при выполнении:
   function needsSudo(cmd: string): boolean {
     return SUDO_REQUIRED.includes(cmd);
   }

   При выполнении команды:
   if (needsSudo(parsed.command) && !gameStore.hasSudo && !input.startsWith('sudo ')) {
     return [{ text: `${parsed.command}: Operation not permitted`, kind: 'error' },
             { text: `Попробуй: sudo ${input}`, kind: 'system' }];
   }

3. Обработка sudo:
   if (input.startsWith('sudo ')) {
     // Показать prompt пароля:
     // [sudo] password for pilot: ████
     // Пароль берётся из level.definition.sudo_password ?? любой принимается
     // После верного пароля — выполнить команду без флага sudo
   }

4. В уровне_02: при выполнении grant_admin.sh движок ловит в output
   строку [SUDO_GRANTED] и вызывает setHasSudo(true).
   Аналогично: при initLevel сбрасывать в false если level_00/01
   (уровни до рубки управления).

5. YAML поле:
   sudo_password: "n0str0m0"  # опциональное, если нет — любой пароль принимается

Добавить тест: команда без sudo → permission denied.
               та же команда с sudo → выполняется.
```

**Чеклист:**
- [x] `hasSudo` в store + persist
- [x] `SUDO_REQUIRED` список в CommandParser
- [x] `sudo <cmd>` работает (password prompt + выполнение)
- [x] grant_admin.sh с `[SUDO_GRANTED]` тегом выставляет флаг
- [x] `sudo_password` в YAML — опциональное поле
- [x] Тест покрывает оба пути

---

### V2-08: Mock processes (ps aux / kill / netstat)

**Файлы:** `game/src/engine/CommandParser.ts`, `game/src/types/level.types.ts`

```
Добавить в YAML секцию mock_processes (используется в уровнях 03, 06):

mock_processes:
  - pid: 4821
    user: "root"
    cpu: 98.7
    mem: 12.4
    command: "turret_daemon"
    port: 4821        # показывается в netstat
    is_target: true   # этот PID нужно убить для разблокировки win
  - pid: 1102
    user: "pilot"
    cpu: 0.0
    mem: 0.2
    command: "sshd"
    port: 22

Движок:
1. При initLevel — загрузить mock_processes в память (Map<number, MockProcess>).
2. Команда ps aux:
   Вывести таблицу из активных процессов (не убитых).
3. Команда netstat -tlnp (или sudo netstat -tlnp):
   Показать только процессы с port != undefined.
4. Команда lsof -i :PORT:
   Показать процесс на этом порту.
5. Команда kill -9 PID (или sudo kill -9 PID):
   - Если PID в mock_processes → удалить из Map, вывести "Process terminated."
   - Если PID не существует → "No such process"
   - Если без sudo и !hasSudo → permission denied
6. win_condition type: "process_killed_and_command":
   - Проверить что is_target process убит
   - И что команда выполнена в нужной директории

Добавить в LevelDefinition:
  mock_processes?: MockProcess[]

interface MockProcess {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  command: string;
  port?: number;
  is_target?: boolean;
}
```

**Чеклист:**
- [x] `MockProcess` тип в level.types.ts
- [x] mock_processes инициализируются при загрузке уровня
- [x] `ps aux` рендерит таблицу
- [x] `netstat -tlnp` рендерит порты
- [x] `lsof -i :PORT` фильтрует по порту
- [x] `kill -9 PID` удаляет из Map
- [x] win condition проверяет `is_target` убит
- [x] Тест: kill → проверка → win

---

### V2-09: Новые команды движка

**Файлы:** `game/src/engine/CommandParser.ts`

```
Добавить обработчики (в порядке уровней):

── Level 05: df -h ──────────────────────────────────
handleDf():
  Если в YAML есть disk_usage[] → рендерить таблицу.
  Иначе — статичный placeholder:
  Filesystem  Size  Used  Avail  Mount
  /dev/sda1   500G  487G   13G   /

── Level 06: tail -f (симуляция) ────────────────────
handleTailF(path):
  Читать файл из VirtualFS.
  Вывести последние 10 строк (или весь файл < 10 строк).
  Затем через 1s / 2s / 3s добавлять строки из tail_stream[]
  (новое YAML поле: tail_stream: ["line1", "line2"]).
  Через 5s auto-stop (имитация Ctrl+C с сообщением).

── Level 06: systemctl (симуляция) ──────────────────
handleSystemctl(action, service):
  Читает systemctl_services[] из YAML:
    { name: "coolant_system", status: "inactive" }
  start → если is_enabled: true → меняет status на "active", пишет [OK]
         → если is_enabled: false → "Failed to start: permission denied"
  status → выводит статус сервиса
  Записывать activated services в level runtime state.

── Level 07: ip a ────────────────────────────────────
handleIpA():
  Читает network[] из YAML:
    { iface: "eth0", inet: "10.0.0.5/24", status: "UP" }
  Рендерить в стиле реального `ip a` вывода.

── Level 07: ping ────────────────────────────────────
handlePing(host):
  Если host в reachable_hosts[] (YAML) → 3 строки "64 bytes from..."
  Иначе → "Request timeout" x3

── (level_04 уже есть ssh) ──────────────────────────
Расширить SSH: поддержка sudo_password проверки при подключении.

── Pipe operator ─────────────────────────────────────
Расширить CommandParser: если input содержит " | " →
  разбить на [left, right], выполнить left, передать stdout в right.
  Поддержать pipe для: ps | grep, cat | grep.
  НЕ поддерживать pipe для других команд пока.

── Новые YAML поля (добавить в level.types.ts) ───────
disk_usage?: DiskEntry[]
tail_stream?: string[]    // строки добавляемые в tail -f симуляции
systemctl_services?: SystemctlService[]
network?: NetworkIface[]
reachable_hosts?: string[]
```

**Чеклист:**
- [x] `df -h` рендерит таблицу
- [x] `tail -f` показывает стрим из YAML с задержкой
- [x] `systemctl start/status` с YAML-состоянием
- [x] `ip a` из YAML network[]
- [x] `ping` с reachable_hosts[]
- [x] `cmd | grep pattern` — pipe работает
- [x] Все новые типы в level.types.ts
- [x] Тесты для pipe + новых команд

---

### V2-10: win_condition type "sequence"

**Файлы:** `game/src/engine/WinConditionChecker.ts`, `game/src/types/level.types.ts`

```
Новый тип для реакторного уровня (07):

win_condition:
  type: "sequence"
  steps:
    - command: "./start_coolant.sh"
      working_directory: "/reactor"
    - command: "./start_core.sh"
      working_directory: "/reactor"
    - command: "./start_reactor.sh"
      working_directory: "/reactor"

Движок:
  Хранить счётчик выполненных шагов: completedSteps: number (в level runtime).
  При каждом executeCommand проверять: совпадает ли с steps[completedSteps].
  Если совпадает → completedSteps++.
  Если completedSteps === steps.length → win.

  Если шаги выполнены не по порядку → предыдущий шаг выводит:
  "Система не готова. Сначала завершите предыдущий шаг."

Добавить тест: sequence полная / неполная.
```

**Чеклист:**
- [x] `sequence` тип в WinCondition union
- [x] `completedSteps` отслеживается в level runtime
- [x] Неверный порядок → понятное сообщение
- [x] Тест: 3 шага подряд → win; 2 шага → не win

---

## 🟢 CONTENT — уровни 05–08 (после V2-07…V2-10)

### V2-11: Создать level_05_turret.yaml

**Референс:** `docs/scenario.md` — Level 03 (турельный пост)  
**Референс:** `docs/cursor_prompt_section_plan.md` — section_plan Level 03  
**Команды:** netstat, lsof, kill, sudo  
**Зависит от:** V2-07 (hasSudo), V2-08 (mock_processes)

```yaml
# Минимальная структура для Cursor — остальное из docs/scenario.md
id: "level_05"
title: "Миссия 5: Турельный пост"
win_condition:
  type: "process_killed_and_command"
  target_pid: 4821
  command: "./disable_turret.sh"
  working_directory: "/emergency"
mock_processes:
  - pid: 4821
    user: "root"
    cpu: 98.7
    command: "turret_daemon"
    port: 4821
    is_target: true
sudo_password: "n0str0m0"
# + filesystem, narrative, hints, section_plan из scenario.md Level 03
```

**Чеклист:**
- [x] level_05_turret.yaml создан и валиден
- [x] `validate-levels.js` проходит
- [x] level_05 добавлен в LEVEL_ORDER и imports

---

### V2-12: Создать level_06_comms.yaml

**Референс:** `docs/scenario.md` — Level 04 (рубка связи)  
**Команды:** grep, grep -r, grep -i, find  
**Зависит от:** V2-05 (WinCondition.contains)

```yaml
id: "level_06"
win_condition:
  type: "file_read"
  path: "/logs/2187-03/emergency.log"
  contains: "FREQ=472.88"
# Вторичный win (после grep нашли):
# command_executed: ./activate_beacon.sh
# Можно сделать двухэтапным: сначала file_read с contains,
# потом command_executed как финальный trigger
```

**Чеклист:**
- [x] level_06_comms.yaml создан
- [x] grep -r находит FREQ= строку
- [x] contains проверяется в WinConditionChecker

---

### V2-13: Создать level_07_engine.yaml

**Референс:** `docs/scenario.md` — Level 06 (машинное отделение)  
**Команды:** ps aux, ps | grep, df -h, kill, sudo  
**Зависит от:** V2-07, V2-08, V2-09

```yaml
id: "level_07"
win_condition:
  type: "process_killed_and_command"
  target_pid: 1337
  command: "./start_engines.sh"
  working_directory: "/engine"
mock_processes:
  - pid: 1337
    user: "root"
    cpu: 99.9
    command: "legacy_lockd"
    is_target: true
```

---

### V2-14: Создать level_08_reactor.yaml

**Референс:** `docs/scenario.md` — Level 07 (реактор)  
**Команды:** systemctl (sim), tail -f (sim), chmod +x  
**Зависит от:** V2-09 (systemctl, tail), V2-10 (sequence win)

```yaml
id: "level_08"
win_condition:
  type: "sequence"
  steps:
    - command: "./start_coolant.sh"
      working_directory: "/reactor"
    - command: "./start_core.sh"
      working_directory: "/reactor"
    - command: "./start_reactor.sh"
      working_directory: "/reactor"
systemctl_services:
  - name: "coolant_system"
    status: "inactive"
    is_enabled: true
```

---

### V2-15: Создать level_09_network.yaml (финал)

**Референс:** `docs/scenario.md` — Level 08 (сетевой узел)  
**Команды:** ip a, ping, ssh (расширенный), curl (sim)  
**Зависит от:** V2-07, V2-09

```yaml
id: "level_09"
title: "Миссия 9: Сетевой узел — финал"
win_condition:
  type: "command_executed"
  command: "./activate_relay.sh"
  working_directory: "/relay"
  requires_ssh: true
  ssh_host: "10.0.0.42"
network:
  - iface: "eth0"
    inet: "10.0.0.5/24"
    status: "UP"
reachable_hosts:
  - "10.0.0.42"
sudo_password: "n0str0m0"
```

---

### V2-16: Тесты для уровней 05–09 + движка V2

```
Добавить в CommandParser.test.ts:
  - hasSudo=false + protected cmd → permission denied
  - hasSudo=false + sudo cmd → password prompt → success
  - hasSudo=true + protected cmd → success без sudo
  - kill -9 target_pid → process removed from Map
  - ps aux → target process виден
  - netstat -tlnp → port виден
  - pipe: "ps aux | grep turret_daemon" → строка видна

Добавить WinConditionChecker.test.ts:
  - process_killed_and_command: процесс жив → false; убит + команда → true
  - sequence: 1/3 шага → false; 3/3 → true; неверный порядок → false
  - file_read + contains: строка есть → true; нет → false

Цель: ≥ 55 тестов.
```

**Чеклист:**
- [x] Все новые команды покрыты тестами
- [x] hasSudo mechanic покрыта
- [x] Все новые win_condition типы покрыты
- [x] `npm test` — все тесты зелёные

---

## Порядок выполнения

```
СЕССИЯ 1 — инфраструктура (V2-01 → V2-06):
  V2-01 GitHub CI
  V2-02 Pixel art CutsceneScreen
  V2-03 VictoryScreen [Enter]
  V2-04 import.meta.glob
  V2-05 WinCondition.contains
  V2-06 README update

СЕССИЯ 2 — движок v2 (V2-07 → V2-10):
  V2-07 hasSudo mechanic
  V2-08 Mock processes
  V2-09 Новые команды (df, tail, systemctl, ip, ping, pipe)
  V2-10 Sequence win condition

СЕССИЯ 3 — контент (V2-11 → V2-15):
  V2-11 level_05_turret.yaml
  V2-12 level_06_comms.yaml
  V2-13 level_07_engine.yaml
  V2-14 level_08_reactor.yaml
  V2-15 level_09_network.yaml

СЕССИЯ 4 — тесты и полировка (V2-16):
  V2-16 Тесты движка v2 + уровней 05–09
  UX: cutscene skip-on-click (CutsceneScreen)
  SEC: FAILSAFE_SCHEMA в validate-levels.js
  DOCS: cursor_prompt_section_plan.md статус → Done
```

---

## Что НЕ делать (решение принято, не пересматривать)

| Пункт | Решение |
|---|---|
| SEC-01 ReDoS в grep | Won't Fix |
| PERF-03 build-time YAML | Won't Do |
| Command registry refactor (engine/commands/) | Won't Do сейчас — CommandParser ~705 строк, не блокер |
| FS index by parent path | Won't Do — < 40 nodes, O(n) не проблема |
| Coverage thresholds в CI | Low — добавить позже |
| React.lazy уже сделан | ✅ — не трогать |

---

*Обновлён: 27.06.2026 | Проект: RETRO Linux Terminal Game*
