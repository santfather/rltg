# Аудит проекта RETRO Linux Terminal Game

**Дата:** 27 июня 2026 (повторный аудит после Sprint v2 + cleanup)  
**Предыдущие аудиты:** 18.06.2026, 27.06.2026 (утро)  
**Объект:** `/Users/vladislavkovalenko/Projects/RETRO_LINUX_TERMINAL_GAME`  
**Версия кода:** `game@0.0.0` (React 19 + Vite 8 + TypeScript strict + Zustand 5)  
**Метод:** статический анализ, рефакторинг мёртвого кода, прогон CI-цепочки локально

---

## 1. Резюме

Проект прошёл полный **Sprint v2** (10 уровней, движок v2, 65 тестов) и **cleanup-проход** с исправлением критических багов restart/discovery и удалением неиспользуемого store-кода.

| Область | 27.06 (утро) | 27.06 (вечер, после cleanup) |
|---------|--------------|------------------------------|
| Безопасность | 🟢 | 🟢 |
| Отказоустойчивость | 🟢 | 🟢 (исправлен restart soft-lock) |
| Оптимизация | 🟢 | 🟢 (убран мёртвый `terminalHistory`) |
| Масштабируемость | 🟡 | 🟢 (glob YAML, 10 уровней) |
| Best practices | 🟢 | 🟢 |
| Тестирование | 🟢 (31) | 🟢 (**65** тестов, 4 файла) |
| Документация | 🟡 | 🟢 (`main_readme`, `todo_list` актуализированы) |

**CI-проверки (локально):**

```
npm test              → 65/65
npm run typecheck     → OK
npm run lint          → OK (--max-warnings 0)
node scripts/validate-levels.js → 10/10 YAML
npm run build         → OK
```

**Production bundle (Vite 8):**

```
dist/assets/index-*.js       ~361 kB │ gzip ~109 kB  (initial)
dist/assets/Terminal-*.js    ~286 kB │ gzip ~68 kB   (lazy)
dist/assets/index-*.css       ~16 kB │ gzip ~4.3 kB
```

---

## 2. Что сделано в cleanup-проходе (27.06, вечер)

### 2.1. Исправленные логические ошибки

| ID | Проблема | Исправление |
|----|----------|-------------|
| **BUG-01** | `handleRestart` не переводил `phase` → зависание на Game Over / Victory | `setPhase('loading')` в `App.tsx`; `restartCurrentLevel` больше не обнуляет `commandContext` |
| **BUG-02** | RESTART во время игры → «INITIALIZING...» (context null при phase playing) | То же — restart идёт через loading → cutscene → `initLevel` |
| **BUG-03** | `hasSudo` сохранялся при рестарте уровня → тривиальный replay | `restartCurrentLevel` сбрасывает `hasSudo: false` |
| **BUG-04** | Discovery level_06 только для `grep`, не pipe/cat | Любой вывод с `requires_discovery` токеном засчитывается |
| **BUG-05** | Pipe `\| grep` → неверный `executedCommand.command` | `executedCommand` парсится из правой части pipe |
| **BUG-06** | Неверный SSH/sudo пароль → ложный win-check | `executedCommand: null` при failed auth |
| **BUG-07** | `oxygen \|\| 87` — 0% превращался в 87 | `initialOxygen()` с явной проверкой `> 0` |
| **BUG-08** | Повторный win до смены phase | Win-check только при `phase === 'playing'` |

### 2.2. Удалённый мёртвый код

| Удалено | Файл |
|---------|------|
| `terminalHistory`, `appendHistory`, `clearHistory` | `gameStore.ts` |
| `resetForLevel()`, `setPaused()` | `gameStore.ts` |
| `fileExists()`, `replaceNodes()` | `FileSystem.ts` |
| `fitAddonRef` (неиспользуемый ref) | `Terminal.tsx` |
| Re-export `parseCommand` из CommandParser | `CommandParser.ts` |
| Re-export `LEVEL_ORDER` из levels/index | `levels/index.ts` |

### 2.3. Дедупликация

| Было | Стало |
|------|-------|
| `targetsKilled()` дублировал `isTargetKilled()` | `WinConditionChecker` использует `extendedCommands.isTargetKilled` |
| `advanceToNextLevel` и `getNextLevelId` — две копии логики | Единый `getNextLevelId()` в `level.types.ts` |

### 2.4. Оптимизация ресурсов

| Область | Действие |
|---------|----------|
| **Память store** | Убран накопитель `terminalHistory` (дублировал xterm buffer, никогда не читался) |
| **Timers** | `CutsceneScreen` — все `setTimeout` собираются в массив и `clearTimeout` при unmount |
| **Процессы ОС** | Нет фоновых workers/child processes; только browser timers — все с cleanup в hooks/components |
| **Логи** | Production-код без `console.log`; только `console.error` в ErrorBoundary (намеренно) |
| **Zustand** | Нет `.subscribe()` — только hook selectors, утечек подписок нет |

---

## 3. Обзор архитектуры (актуальный)

### 3.1. Поток данных

```
App.tsx (ErrorBoundary)
  ├─ phase: loading    → LevelLoadScreen
  ├─ phase: cutscene   → CutsceneScreen (pixel art + skip click/Enter)
  ├─ phase: playing    → TopBar + Terminal (lazy) + MissionLog
  │                        ├─ SectionPlan
  │                        ├─ RobotWidget
  │                        └─ Mission objectives
  ├─ phase: victory    → VictoryScreen ([Enter] next)
  └─ phase: gameover   → GameOverScreen ([R] restart → loading)
        ↓
useGameSession         → executeCommand, win, discovery, sequence, score
useOxygen              → interval O₂ (playing only, cleanup on unmount)
engine/CommandParser   → ~1000 строк, v2 commands + sudo + pipe
engine/extendedCommands→ ps/netstat/kill/df/ping helpers
engine/FileSystem      → immutable VirtualFS
levels/index.ts        → import.meta.glob (eager raw YAML)
store/gameStore.ts     → Zustand persist v2 (hasSudo)
```

### 3.2. Уровни (10 миссий)

| ID | Локация | Ключевые команды | Win type |
|----|---------|------------------|----------|
| level_00 | Tutorial | ls, cd, cat | file_read |
| level_01 | Airlock | chmod, ./script | command_executed |
| level_02 | Crew quarters | grep, find | file_read + contains |
| level_03 | Cargo bay | tar, mkdir, cp | file_created |
| level_04 | Comms (SSH) | ip, ping, ssh | command_executed + SSH |
| level_05 | Turret | netstat, kill, sudo | process_killed_and_command |
| level_06 | Comms beacon | grep -r | command_executed + discovery |
| level_07 | Engine room | ps, df, kill | process_killed_and_command |
| level_08 | Reactor | tail -f, systemctl | sequence (3 steps) |
| level_09 | Network SOS | ip, ping, ssh | command_executed + SSH (финал) |

### 3.3. Win condition types (5)

`command_executed` · `file_read` · `file_created` · `process_killed_and_command` · `sequence`

Валидация: `validate-levels.js` + `FAILSAFE_SCHEMA` (win types, hints=3).

---

## 4. Безопасность

Без изменений относительно утреннего аудита — **критических уязвимостей нет**.

| ID | Severity | Статус |
|----|----------|--------|
| SEC-01 ReDoS в grep | Info | Won't Fix (single-player) |
| SEC-02 yaml.load без FAILSAFE | Low | Частично: win types валидируются в CI |
| SEC-03 credentials в YAML | Info | By design |
| SEC-04 persist v2 migration | Low | ✅ hasSudo migrate добавлен |
| SEC-05 blacklist bypass spaces | Low | Open |

**Улучшение:** wrong SSH/sudo password больше не триггерит win-check (BUG-06).

---

## 5. Отказоустойчивость

| Элемент | Статус |
|---------|--------|
| ErrorBoundary + [R] reset | ✅ |
| tryGetLevelById / LevelLoadError | ✅ |
| Cutscene typewriter cancel + timer cleanup | ✅ |
| Restart flow (Game Over, Victory, TopBar) | ✅ **исправлено** |
| Terminal xterm dispose + resize cleanup | ✅ |
| useOxygen interval cleanup | ✅ |
| useRobotJokes timer cleanup | ✅ |

### Остаточные риски

| ID | Severity | Проблема | Рекомендация |
|----|----------|----------|--------------|
| FT-01b | Low | Eager glob YAML — битый файл ломает build | CI validate уже ловит; lazy glob опционален |
| FT-03 | Low | Пустые narrative/filesystem проходят validate | min length checks |
| FT-09 | Low | App throws при broken level | Dedicated error screen |

---

## 6. Оптимизация и производительность

| ID | Статус | Комментарий |
|----|--------|-------------|
| PERF-01 glob YAML | ✅ | `import.meta.glob` eager |
| PERF-02 code split Terminal | ✅ | lazy chunk ~68 KB gzip |
| PERF-03 level cache | ✅ | `Map<LevelId, LoadedLevel>` |
| PERF-04 terminalHistory | ✅ **удалён** | xterm — единственный буфер вывода |
| PERF-05 cutscene skip | ✅ | click / Enter |
| PERF-06 tail -f | Info | Синхронная симуляция (без async interval) — OK для UX |

VirtualFS O(n) при ~20–50 nodes на уровень — проблем нет.

---

## 7. Масштабируемость

### Добавление уровня

1. `game/src/levels/level_NN_*.yaml`
2. `LEVEL_ORDER` + `LevelId` в `level.types.ts`
3. (опционально) SVG в `assets/scenes/`, `section_plan`
4. `node scripts/validate-levels.js` + `npm test`

Glob подхватывает файл автоматически — **ручной import raw не нужен**.

### CommandParser (~1000 строк)

Рекомендация на будущее: registry `engine/commands/` — **не блокер** при 10 уровнях.

---

## 8. Best practices и качество кода

| Правило | Статус |
|---------|--------|
| Бизнес-логика отделена от UI | ✅ useGameSession |
| Контент из YAML | ✅ |
| TS strict | ✅ |
| VirtualFS immutable | ✅ |
| Мёртвый код | ✅ **очищен** (store history, unused FS helpers) |
| Тесты рядом с модулем | ✅ 4 файла |

### Намеренно оставлено (не мёртвый код)

| Элемент | Причина |
|---------|---------|
| `completedLevels` в persist | Save-game прогресс; UI пока не отображает |
| `target_pid` в YAML | Документация сценария; kill logic через `is_target` |
| `getLevelById` export | Internal + tryGetLevelById wrapper |

---

## 9. UI/UX

| Фича | Статус |
|------|--------|
| SectionPlan hotspots | ✅ все 10 YAML |
| Pixel art cutscene | ✅ ascii_art_path |
| Cutscene skip | ✅ click / Enter |
| Victory [Enter] | ✅ |
| SSH/sudo password mask | ✅ |
| Tab autocomplete | ✅ |
| Game Over [R] | ✅ → loading (исправлено) |

---

## 10. Тестирование

### 10.1. Покрытие (65 тестов, 4 файла)

| Файл | Область |
|------|---------|
| `CommandParser.test.ts` | FS, levels 01/04/05, SSH, sudo, pipe, v2 commands |
| `WinConditionChecker.test.ts` | все win types, sequence, discovery, process_killed |
| `extendedCommands.test.ts` | ps/netstat/df/ping/kill helpers |
| `sectionPlanTokenize.test.ts` | hotspot tokenize |

### 10.2. Пробелы (низкий приоритет)

1. E2E Playwright — полный проход level_05→09
2. Coverage thresholds в CI (`@vitest/coverage-v8`)
3. Restart flow — unit test через store + App integration

---

## 11. DevOps

| Элемент | Статус |
|---------|--------|
| Husky pre-commit | ✅ typecheck + lint + test + validate |
| GitHub Actions | ✅ `.github/workflows/ci.yml` (push на remote — badge pending) |
| validate-levels.js | ✅ + FAILSAFE_SCHEMA win types |
| gen-placeholders.mjs | ✅ level_00…level_09 SVG |

---

## 12. Матрица приоритетов (актуальная)

### 🟢 Done (Sprint v2 + cleanup)

- 10 уровней YAML + движок v2
- 65 тестов
- glob levels, pixel art, CI workflow
- SectionPlan, contains, sequence win
- Restart/discovery/pipe bugs
- Dead code cleanup

### 🟡 Medium (backlog)

1. UI для `completedLevels` (progress screen)
2. E2E smoke test одного уровня
3. Coverage gate в CI
4. Dedicated «corrupt level» screen вместо throw
5. Command registry refactor при росте >15 новых команд

### 🟢 Low

6. Lazy YAML import (PERF-01b)
7. `target_pid` — удалить из YAML или валидировать vs mock_processes
8. SEC-02 full FAILSAFE_SCHEMA для yaml.load

---

## 13. Положительные находки

1. **Чистый engine** — тестируется без React; v2 helpers в `extendedCommands.ts`.
2. **Единый getNextLevelId** — нет drift между store и levels.
3. **Phase machine** — предсказуемый UI routing.
4. **YAML-driven** — narrative, FS, processes, network, tail_stream, section_plan.
5. **Resource discipline** — timers/listeners/xterm с cleanup; нет фоновых процессов.
6. **Strict CI gate** — 65 tests + lint + typecheck + validate + build.

---

## 14. Заключение

**RETRO Linux Terminal Game** — **завершённый обучающий продукт** на 10 миссий с полным game loop, движком v2 и стабильным restart flow.

Sprint v2 закрыт. Cleanup устранил критический soft-lock при рестарте, дублирование логики и мёртвое состояние store. Приложение не создаёт фоновых процессов ОС, не спамит логами и корректно освобождает browser timers при unmount.

**Рекомендация:** push на GitHub для активации CI badge; опционально — E2E и progress UI для `completedLevels`.

---

## Приложение A: Changelog метрик

| Метрика | 18.06 | 27.06 утро | 27.06 вечер |
|---------|-------|------------|-------------|
| Уровни | 5 | 5 | **10** |
| Тесты | 7 | 31 | **65** |
| Test files | 1 | 3 | **4** |
| CommandParser | ~705 строк | ~705 | ~1000 (+ v2) |
| persist version | — | v1 | **v2** |
| Win types | 3 | 3 | **5** |
| terminalHistory | — | мёртвый | **удалён** |
| Restart bug | — | есть | **исправлен** |
| GitHub Actions | нет | добавлен | ✅ |
| glob levels | нет | нет | ✅ |

---

*Аудит выполнен статическим анализом, рефакторингом и прогоном `npm test`, `npm run typecheck`, `npm run lint`, `node scripts/validate-levels.js`, `npm run build` в директории `game/`.*
