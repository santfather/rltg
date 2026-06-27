# Cursor Prompt — Реализация первых 5 сцен игры RETRO-UX

> **Роль:** @generator + @yaml_editor  
> **Читай перед началом:** `main_readme.md`, `docs/scenario.md`, `game/src/types/level.types.ts`  
> **Язык кода:** English. **Язык UI и нарратива:** Русский (только из YAML).

---

## Контекст задачи

Игра «Retro Terminal Linux Game» — браузерный симулятор выживания в стиле CRT-терминала. Игрок — астронавт, переживший крушение, работает в псевдо-Linux терминале (xterm.js), изучая реальные Linux-команды через нарратив.

Созданы 5 YAML-файлов сцен (`game/src/levels/`). Твоя задача — реализовать **игровой движок** (engine), который загружает эти уровни и обеспечивает их прохождение в терминале.

---

## Сцены (обзор прогрессии сложности)

| Уровень | Локация | Linux-команды | Новые механики |
|---------|---------|---------------|----------------|
| `level_00` | Аварийная капсула | `ls`, `cd`, `cat` | Без таймера O₂ (tutorial) |
| `level_01` | Внешний шлюз | `pwd`, `ls -la`, `cd`, `chmod`, `./script.sh` | Таймер O₂, права доступа |
| `level_02` | Жилой отсек | `grep`, `grep -r`, `find`, `grep -i` | Поиск по содержимому файлов |
| `level_03` | Грузовой отсек | `tar`, `mkdir`, `cp`, `mv` | Архивы, управление файлами |
| `level_04` | Рубка связи | `ip a`, `ping`, `ssh` (симуляция), `curl` | SSH-контекст (remote_filesystem) |

---

## Задача 1 — `engine/CommandParser.ts`

Реализуй обработку команд для всех 5 уровней. Каждый handler — отдельная функция.

### Команды для реализации

#### Базовые (Level 00)
```typescript
// ls [path] [-la | -a | -l]
// cd [path]   — поддержка: cd .., cd /, cd ~/path, cd (в root)
// cat <path>  — вывод content из VirtualFS
// clear       — очистка терминала
// pwd         — текущая директория из fsState.cwd
// help        — список доступных команд
// hint [1|2|3] — делегировать в HintSystem
```

#### Права и выполнение (Level 01)
```typescript
// chmod <mode> <path>
//   Принимать: chmod +x file.sh | chmod 755 file.sh | chmod 000 file.sh
//   Хранить права в VirtualFS node.permissions
// ./<script.sh>
//   Проверить: node.permissions допускает execute (x bit или +x)?
//   Если нет → вывести: "bash: ./script.sh: Permission denied"
//   Если да → взять content из node, вернуть его как output построчно
```

#### Поиск (Level 02)
```typescript
// grep <pattern> <file>
//   Найти строки в file.content, вывести совпавшие с номерами строк
// grep -r <pattern> <directory>
//   Рекурсивно обойти все files в dir, вывести: "path/file.txt: строка"
// grep -i <pattern> <file>
//   Case-insensitive поиск
// find <dir> -name <pattern>
//   Поиск файлов/директорий по glob-паттерну (* поддерживается)
// find <dir> -type f | -type d
//   Фильтрация по типу
```

#### Архивы и файловые операции (Level 03)
```typescript
// tar -tzf <file>     — вывести список файлов в архиве (из archive_contents в YAML)
// tar -xzf <file>     — распаковать архив в текущую директорию
// tar -xzf <file> -C <dir>  — распаковать в указанную директорию
//   Брать содержимое из node.archive_contents[], создавать VirtualFS-узлы
// mkdir <dir>         — создать директорию
// mkdir -p <dir>      — создать со всеми родительскими директориями
// cp <src> <dst>      — скопировать файл
// mv <src> <dst>      — переместить/переименовать файл
```

#### Сеть и SSH (Level 04)
```typescript
// ip a                — вывести список интерфейсов из /network/interfaces.conf
// ping <host>         — вывести latency из /network/ping_log.txt или "Host unreachable"
// ssh <user>@<host>   — если host совпадает с remote_filesystem.host в YAML:
//                        запросить пароль → если верный → переключить fsContext на remote_filesystem
//                        вывести: "Connected to <host> as <user>"
//                        после переключения pwd, ls, cat, etc. работают в remote FS
// exit                — выйти из SSH-контекста, вернуть локальную FS
// curl <url>          — симуляция: если url содержит известный IP → вывести статус
```

### Блокированные команды (вывести нарративный отказ)
```typescript
const BLOCKED_COMMANDS = [
  'rm -rf /',
  'rm -rf *',
  'mkfs',
  'dd if=/dev/zero',
  'shutdown',
  'reboot',
];
// Ответ: "NOSTROMO-8: Команда заблокирована системой безопасности корабля."
```

---

## Задача 2 — `engine/FileSystem.ts`

### Модель узла VirtualFS
```typescript
interface VirtualNode {
  path: string;
  type: 'file' | 'dir';
  content?: string;
  permissions?: string;    // '000' | '644' | '755' | '+x' (нормализовать к octal)
  isArchive?: boolean;
  archiveContents?: ArchiveEntry[];  // из archive_contents в YAML
}

interface ArchiveEntry {
  path: string;
  content: string;
}
```

### Методы
```typescript
// ls(cwd, path?, flags?) → string[]  (имена узлов)
// cd(cwd, path) → { newCwd: string } | { error: string }
// cat(cwd, path) → { content: string } | { error: string }
// chmod(cwd, path, mode) → { newNode: VirtualNode } | { error: string }
// canExecute(node: VirtualNode) → boolean
// executeScript(node: VirtualNode) → string   (возвращает content как output)
// mkdir(cwd, path, recursive?) → VirtualNode[]  (новые узлы)
// cp(cwd, src, dst) → VirtualNode
// mv(cwd, src, dst) → [removedPath: string, VirtualNode]
// extractArchive(cwd, archivePath, targetDir) → VirtualNode[]  (новые узлы из archive_contents)
// grep(content, pattern, caseInsensitive?) → string[]  (строки с совпадением)
// find(nodes, startPath, name?, type?) → string[]  (пути)
```

**Иммутабельность обязательна:** каждый метод принимает `state: VirtualNode[]` и возвращает `newState: VirtualNode[]`. Не мутировать напрямую.

---

## Задача 3 — `engine/WinConditionChecker.ts` (новый файл)

```typescript
interface WinCondition {
  type: 'command_executed' | 'file_read' | 'file_created';
  command?: string;
  file?: string;
  working_directory?: string;
  requires_ssh?: boolean;
  ssh_host?: string;
}

// Проверяет после каждого выполнения команды:
// - command_executed: последняя команда === condition.command
//                     И cwd === condition.working_directory
//                     И если requires_ssh: fsContext === 'remote'
// - file_read:        команда была cat и читался condition.file
// - file_created:     в VirtualFS существует condition.file

export function checkWinCondition(
  lastCommand: ParsedCommand,
  cwd: string,
  fsContext: 'local' | 'remote',
  winCondition: WinCondition
): boolean
```

---

## Задача 4 — `engine/LevelLoader.ts`

Загрузить уровни из YAML. Для каждого уровня:
1. Парсить `filesystem[]` → `VirtualNode[]`
2. Если есть `remote_filesystem` → сохранить отдельно как `remoteNodes: VirtualNode[]`
3. Установить начальную `cwd = "/"`
4. Для `level_00`: установить `oxygenEnabled = false`
5. Передать `win_condition` в `WinConditionChecker`
6. Передать `hints[]` в `HintSystem`

```typescript
// YAML импорт через: import raw from '../levels/level_00_tutorial.yaml?raw'
// Парсинг: js-yaml parse(raw)
// Валидация: проверить наличие id, title, filesystem, win_condition, hints (ровно 3)
```

---

## Задача 5 — SSH-контекст (Level 04)

В `gameStore.ts` добавить:
```typescript
interface GameState {
  // ... существующие поля
  fsContext: 'local' | 'remote';
  remoteNodes: VirtualNode[];
  sshHost: string | null;
  sshUser: string | null;
}
```

В `CommandParser.ts`:
- При `ssh user@host`:
  1. Найти `remote_filesystem.host` из текущего уровня
  2. Если совпадает → вывести `"Password for <user>@<host>:"` → ждать следующего ввода
  3. Следующий ввод сравнить с паролем из `/secrets/ssh_credentials.txt` виртуальной FS
  4. Если верно → `fsContext = 'remote'`, `cwd = "/"` в remoteNodes
  5. Промпт терминала сменить на: `rescue_op@jonas:~$`

- При `exit` или `logout` → вернуть `fsContext = 'local'`, промпт → `RETRO-UX:~$`

---

## Задача 6 — `hooks/useOxygen.ts`

```typescript
// level_00: oxygenEnabled = false → таймер не запускать, отображать "TRAINING MODE"
// level_01..04: таймер -1% каждые 30 сек
// При reward.oxygen_bonus → refill на указанное значение (не превышать 100)
// При O₂ == 0 → dispatch GameOver в store
```

---

## Задача 7 — `hooks/useHints.ts`

```typescript
// hint       → вывести список доступных уровней подсказок
// hint 1     → вывести hints[0].text, запомнить использование
// hint 2     → вывести hints[1].text
// hint 3     → вывести hints[2].text, вычесть 10 из score
// Уже использованные уровни показывать с пометкой [уже использована]
```

---

## Задача 8 — `components/Terminal.tsx`

### Поведение промпта
```
Локальный режим:  RETRO-UX:/текущая/директория$
SSH-режим:        user@hostname:/текущая/директория$
```

### Вывод команд
- Ввод пользователя: цвет `--crt-amber`
- Вывод команды: цвет `--crt-green`
- Ошибки (Permission denied, not found): цвет `--crt-red`
- Системные сообщения (██ ...): цвет `--crt-blue` + glow

### Поведение chmod
- `ls -la` должен показывать права: `drwxr-xr-x` или `-rw-r--r--` в стиле Unix

---

## Чеклист перед завершением

- [ ] `npm run typecheck` — 0 ошибок
- [ ] `npm test` — все тесты проходят  
- [ ] `npm run validate:levels` — все 5 YAML валидны
- [ ] `npm run lint` — 0 warnings
- [ ] Нет `any` в TypeScript
- [ ] Нет игровых текстов в `.ts`/`.tsx` файлах
- [ ] `engine/` модули не импортируют React
- [ ] VirtualFS иммутабельна (каждый метод возвращает новый state)

---

## Порядок реализации (рекомендуемый)

```
1. types/level.types.ts      — обновить типы (VirtualNode, WinCondition, архивы, SSH)
2. engine/FileSystem.ts      — базовые методы (ls, cd, cat, chmod)
3. engine/CommandParser.ts   — level_00 команды (ls, cd, cat, clear, pwd)
4. engine/LevelLoader.ts     — загрузка YAML + инициализация FS
5. store/gameStore.ts        — добавить fsContext, remoteNodes
6. hooks/useOxygen.ts        — таймер с учётом level_00
7. engine/CommandParser.ts   — level_01 команды (chmod, ./script)
8. engine/WinConditionChecker.ts — все типы win_condition
9. engine/CommandParser.ts   — level_02 команды (grep, find)
10. engine/CommandParser.ts  — level_03 команды (tar, mkdir, cp, mv)
11. engine/CommandParser.ts  — level_04 команды (ip a, ping, ssh, curl)
12. hooks/useHints.ts        — система подсказок
13. Тесты для каждого модуля engine/
```

---

## Файлы уровней (уже созданы)

```
game/src/levels/level_00_tutorial.yaml    ← ls, cd, cat | без O₂
game/src/levels/level_01_airlock.yaml     ← chmod, ./script | O₂ старт
game/src/levels/level_02_crew_quarters.yaml ← grep, find
game/src/levels/level_03_cargo_bay.yaml   ← tar, mkdir, cp, mv
game/src/levels/level_04_comms.yaml       ← ip a, ping, ssh, curl
```

**Не редактировать YAML-файлы** — весь нарратив и FS уже настроены. Только добавлять типы в `level.types.ts` если нужны новые поля.

---

## Примеры ожидаемого поведения в терминале

### Level 01 — chmod сценарий
```
RETRO-UX:/$ ls /system_core
open_door.sh  README.txt

RETRO-UX:/$ ls -la /system_core
---------- 1 root root  342 Mar 14 03:22 open_door.sh
-rw-r--r-- 1 root root  891 Mar 14 03:22 README.txt

RETRO-UX:/$ cd /system_core
RETRO-UX:/system_core$ ./open_door.sh
bash: ./open_door.sh: Permission denied

RETRO-UX:/system_core$ chmod +x open_door.sh
RETRO-UX:/system_core$ ./open_door.sh
▶ Инициализация протокола разблокировки...
▶ Проверка давления в шлюзе... OK
▶ Снятие магнитных замков... OK
██ ДВЕРЬ ОТКРЫТА. Путь в жилой отсек свободен. ██

[МИССИЯ ВЫПОЛНЕНА — +25 O₂, +100 очков]
```

### Level 02 — grep сценарий
```
RETRO-UX:/$ grep -r 'AUTH_CODE' /system/
/system/config/med_access.conf: AUTH_CODE=MED-4891-ZETA

RETRO-UX:/$ find / -name '*.sh'
/system/scripts/activate_med_bay.sh
```

### Level 04 — SSH сценарий
```
RETRO-UX:/$ ip a
eth1: 10.0.0.1 [RESCUE NET — ONLINE]
lo:   127.0.0.1 [LOOPBACK]

RETRO-UX:/$ ping 10.0.0.42
PING 10.0.0.42: 3ms — rescue_bot_jonas [REACHABLE]

RETRO-UX:/$ ssh rescue_op@10.0.0.42
Password for rescue_op@10.0.0.42:
> Jonas-7749-ALPHA
Connected to 10.0.0.42 as rescue_op

rescue_op@jonas:/$ cd /relay
rescue_op@jonas:/relay$ ./activate_relay.sh
▶ Бот «Йонас» — активация ретранслятора...
██ РЕТРАНСЛЯТОР АКТИВИРОВАН. Сигнал достиг ретрансляционной сети. ██

[МИССИЯ ВЫПОЛНЕНА — +30 O₂, +250 очков]
```
