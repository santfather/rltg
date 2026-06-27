# Cursor Prompt — Sprint v2: инфраструктура + движок + уровни 05–09

> **Роль:** @generator + @architect + @yaml_editor  
> **Читай перед началом:**  
> - `docs/audit_review.md` (27.06.2026) — текущее состояние  
> - `docs/todo_list.md` — задачи V2-01…V2-16  
> - `docs/scenario.md` — детали уровней 05–09 (Level 03–08 по нумерации сценария)  
> - `game/src/types/level.types.ts` — source of truth типов  
> - `game/src/engine/CommandParser.ts` — движок команд  
> - `game/src/store/gameStore.ts` — Zustand store

**Принцип:** Выполняй сессиями. Каждая сессия — атомарный коммит с `npm test` и `npm run typecheck` в конце.

---

## СЕССИЯ 1 — Инфраструктура (V2-01…V2-06)

> Цель: CI зелёный, pixel art в игре, glob для уровней, README актуален.

### V2-01: GitHub Actions

Создай `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: game

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: game/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint -- --max-warnings 0

      - name: Tests
        run: npm test -- --run

      - name: Validate levels
        run: node scripts/validate-levels.js

      - name: Build
        run: npm run build
```

---

### V2-02: Pixel art в CutsceneScreen

**Шаг 1.** В `game/src/types/level.types.ts` добавить опциональное поле:
```typescript
// В LevelDefinition:
ascii_art_path?: string;  // "level_01_airlock.png" — имя файла в assets/scenes/
```

**Шаг 2.** Создать папку `game/src/assets/scenes/` и поместить туда placeholder:
- Скопировать любой PNG (или создать 320×240 чёрный PNG через Canvas API в скрипте)
- Назвать: `level_00_tutorial.png`, `level_01_airlock.png`, ..., `level_04_comms.png`
- Placeholder: `<svg>` → PNG 320×240 с текстом локации (если нет настоящего арта)

**Шаг 3.** Скрипт для генерации placeholder assets (`scripts/gen-placeholders.mjs`):
```javascript
// Генерирует SVG-заглушки для каждого уровня
// Запуск: node scripts/gen-placeholders.mjs
import { writeFileSync, mkdirSync } from 'fs';

const levels = [
  { id: '00', name: 'ESCAPE POD', color: '#001100' },
  { id: '01', name: 'AIRLOCK', color: '#001a00' },
  { id: '02', name: 'BRIDGE', color: '#001500' },
  { id: '03', name: 'CREW QUARTERS', color: '#001800' },
  { id: '04', name: 'COMMS ROOM', color: '#001200' },
];

mkdirSync('game/src/assets/scenes', { recursive: true });

for (const lvl of levels) {
  const svg = `<svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="240" fill="${lvl.color}"/>
  <text x="160" y="100" text-anchor="middle" fill="#00ff41"
        font-family="monospace" font-size="14">NOSTROMO-8</text>
  <text x="160" y="130" text-anchor="middle" fill="#00ff41"
        font-family="monospace" font-size="18">${lvl.name}</text>
  <text x="160" y="160" text-anchor="middle" fill="#003b00"
        font-family="monospace" font-size="11">MISSION ${lvl.id}</text>
</svg>`;
  writeFileSync(`game/src/assets/scenes/level_${lvl.id}.svg`, svg);
}
console.log('Placeholders generated in game/src/assets/scenes/');
```

**Шаг 4.** Обновить YAML уровней — добавить `ascii_art_path`:
```yaml
# В каждый level_NN.yaml добавить:
ascii_art_path: "level_00.svg"   # level_01.svg, и т.д.
```

**Шаг 5.** Обновить `App.tsx` — передать `imageUrl` в `CutsceneScreen`:
```tsx
// При phase === 'cutscene':
const levelDef = currentLevel.definition;
const imageUrl = levelDef.ascii_art_path
  ? new URL(`./assets/scenes/${levelDef.ascii_art_path}`, import.meta.url).href
  : undefined;

<CutsceneScreen
  imageUrl={imageUrl}
  lines={levelDef.narrative}
  location={levelDef.location}
  onComplete={() => setPhase('playing')}
/>
```

**Шаг 6.** Проверить что `CutsceneScreen` gracefully рендерит когда `imageUrl` undefined — текст занимает полный экран.

---

### V2-03: VictoryScreen — [Enter] key

В `game/src/components/VictoryScreen.tsx` добавить:

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Enter') onNextLevel();
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [onNextLevel]);
```

Убедиться что в footer написано `[ENTER] СЛЕДУЮЩАЯ МИССИЯ` — если текст другой, поправить.

---

### V2-04: import.meta.glob для уровней

В `game/src/levels/index.ts` заменить ручные импорты на glob:

```typescript
// БЫЛО (удалить все):
// import * as raw00 from './level_00_tutorial.yaml?raw';
// import * as raw01 from './level_01_airlock.yaml?raw';
// ...

// СТАЛО:
const rawYamls = import.meta.glob<string>('./level_*.yaml', {
  eager: true,
  query: '?raw',
  import: 'default',
});

// getLevelById использует rawYamls вместо ручного маппинга:
function findRaw(id: LevelId): string {
  const key = Object.keys(rawYamls).find(k => k.includes(id.replace('level_', 'level_')));
  if (!key) throw new LevelLoadError(`Level not found: ${id}`);
  return rawYamls[key];
}

// LEVEL_ORDER и LevelId тип не меняются.
// tryGetLevelById — не меняется.
```

Проверить после изменения:
- `npm run typecheck`
- `npm test` — все тесты проходят
- `npm run build` — нет ошибок

---

### V2-05: WinCondition.contains

В `game/src/engine/WinConditionChecker.ts`:

```typescript
// Добавить lastCommandOutput в CommandContext (types/level.types.ts):
export interface CommandContext {
  // ... существующие поля
  lastCommandOutput?: string;   // stdout последней команды (для contains проверки)
}

// В WinConditionChecker, при type === 'file_read':
if (condition.type === 'file_read') {
  const pathMatch = ctx.lastReadPath === condition.path;
  if (!pathMatch) return false;

  if (condition.contains) {
    return (ctx.lastCommandOutput ?? '').includes(condition.contains);
  }
  return true;
}

// В CommandParser при успешном cat / grep:
ctx.lastCommandOutput = result.lines.map(l => l.text).join('\n');
// При cd / chmod / других командах — не сбрасывать (оставить последний вывод).
```

Добавить тест в `WinConditionChecker.test.ts`:
```typescript
it('file_read with contains: matches when output includes string', () => { ... });
it('file_read with contains: fails when output missing string', () => { ... });
it('file_read without contains: matches on path only', () => { ... });
```

---

### V2-06: main_readme.md

Обновить `main_readme.md`:

1. **Стек:** React 19, Vite 8, Zustand 5, TypeScript strict, xterm.js 5
2. **Уровни:** реализовано 5 (level_00…level_04), roadmap v2: 05–09 (9 миссий итого)
3. **Архитектура:** добавить строки:
   - `hooks/useGameSession.ts` — game loop (executeCommand, win, score, hints)
   - `hooks/useRobotJokes.ts` — idle speech bubbles
   - `components/SectionPlan.tsx` — ASCII floor plan + hotspot tooltips
   - `components/RobotWidget.tsx` — animated ASCII robot R.U.X (5 states)
   - `engine/TabCompletion.ts` — Tab autocomplete
4. **Roadmap:**
   ```
   Этап 1–5: ✅ Завершены
   Этап 6: 🔶 В процессе (pixel art, CI, polish)
   Этап 7: ⬜ Roadmap v2 — уровни 05–09 (турель, связь, двигатель, реактор, сеть)
   ```
5. **Добавить секцию «Как добавить уровень»:**
   ```
   1. Создать game/src/levels/level_NN_name.yaml (по шаблону)
   2. Добавить 'level_NN' в LEVEL_ORDER в levels/index.ts
   3. Добавить 'level_NN' в тип LevelId в types/level.types.ts
   4. node scripts/validate-levels.js — убедиться что YAML валиден
   5. npm test
   ```
6. Добавить CI badge (после V2-01).

---

## СЕССИЯ 2 — Движок v2 (V2-07…V2-10)

> Цель: hasSudo механика, mock processes, новые команды, sequence win.
> Выполнять ПО ПОРЯДКУ — каждый шаг зависит от предыдущего.

### V2-07: hasSudo флаг

**1. gameStore.ts:**
```typescript
// В GameState добавить:
hasSudo: false,

// В GameActions добавить:
setHasSudo: (v: boolean) => set({ hasSudo: v }),

// В resetGame():
hasSudo: false,

// В partialize (persist):
hasSudo: true,   // сохранять между сессиями
```

**2. CommandParser.ts — константа и проверка:**
```typescript
const SUDO_REQUIRED_CMDS = new Set([
  'kill', 'netstat', 'lsof', 'systemctl', 'useradd', 'usermod',
]);

// В executeCommand(), ДО маршрутизации команды:
const { hasSudo } = useGameStore.getState();
const isSudo = parsed.raw.trimStart().startsWith('sudo ');
const effectiveCmd = isSudo ? parsed.raw.replace(/^sudo\s+/, '') : parsed.raw;

if (SUDO_REQUIRED_CMDS.has(parsed.command) && !hasSudo && !isSudo) {
  return [
    { text: `${parsed.command}: Operation not permitted`, kind: 'error' as const },
    { text: `Нет прав. Попробуй: sudo ${parsed.raw}`, kind: 'system' as const },
  ];
}

// Если isSudo: перепарсить effectiveCmd как обычную команду
```

**3. sudo password prompt:**
```typescript
// В CommandParser при isSudo === true:
const level = useGameStore.getState().currentLevel;
const requiredPwd = level?.definition.sudo_password;

// Терминал: показать prompt "[sudo] password for pilot: "
// Маскировать ввод (*), принять пароль
// Если requiredPwd задан — сравнить. Если нет — любой принять.
// После успеха — выполнить effectiveCmd без sudo флага

// В gameStore.ts — добавить state для pending sudo:
sudoPending: false,
sudoPendingCmd: null as string | null,
```

**4. grant_admin.sh — детектирование тега:**
```typescript
// В handleScriptExecution(), после выполнения скрипта:
if (scriptContent.includes('[SUDO_GRANTED]')) {
  useGameStore.getState().setHasSudo(true);
  // Не выводить '[SUDO_GRANTED]' в терминал — только сообщение
}
```

**5. Добавить в `level.types.ts`:**
```typescript
sudo_password?: string;   // в LevelDefinition
```

---

### V2-08: Mock processes

**1. level.types.ts:**
```typescript
export interface MockProcess {
  pid: number;
  user: string;
  cpu: number;       // %CPU
  mem: number;       // %MEM
  command: string;
  port?: number;     // для netstat/lsof
  is_target?: boolean; // этот PID нужно убить для win
}

// В LevelDefinition:
mock_processes?: MockProcess[];
```

**2. gameStore.ts — runtime state для уровня:**
```typescript
// В GameState:
activeProcesses: Map<number, MockProcess>;  // изменяется при kill

// В initLevel():
const processes = level.definition.mock_processes ?? [];
activeProcesses: new Map(processes.map(p => [p.pid, p])),
```

**3. CommandParser.ts — новые обработчики:**

```typescript
// ps aux
function handlePs(args: string[]): OutputLine[] {
  const { activeProcesses } = useGameStore.getState();
  const header = 'USER       PID  %CPU %MEM  COMMAND';
  const rows = [...activeProcesses.values()].map(p =>
    `${p.user.padEnd(10)} ${String(p.pid).padStart(4)}  ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)}  ${p.command}`
  );
  return [header, ...rows].map(text => ({ text, kind: 'output' as const }));
}

// netstat -tlnp
function handleNetstat(args: string[]): OutputLine[] {
  if (!args.includes('-tlnp') && !args.includes('-tlnp')) {
    return [{ text: 'Используй: netstat -tlnp', kind: 'system' }];
  }
  const { activeProcesses } = useGameStore.getState();
  const withPorts = [...activeProcesses.values()].filter(p => p.port != null);
  const header = 'Proto  Local Address          PID/Program';
  const rows = withPorts.map(p =>
    `tcp    0.0.0.0:${String(p.port).padEnd(6)}         ${p.pid}/${p.command}`
  );
  return [header, ...rows].map(text => ({ text, kind: 'output' as const }));
}

// lsof -i :PORT
function handleLsof(args: string[]): OutputLine[] {
  const portArg = args.find(a => a.startsWith(':'));
  const port = portArg ? parseInt(portArg.slice(1)) : NaN;
  const { activeProcesses } = useGameStore.getState();
  const found = [...activeProcesses.values()].filter(p => p.port === port);
  if (!found.length) return [{ text: `lsof: no process on port ${port}`, kind: 'error' }];
  const header = 'COMMAND  PID  USER   TYPE  NODE  NAME';
  const rows = found.map(p =>
    `${p.command.padEnd(8)} ${p.pid}  ${p.user}   TCP   IPv4  *:${port}`
  );
  return [header, ...rows].map(text => ({ text, kind: 'output' as const }));
}

// kill -9 PID
function handleKill(args: string[]): OutputLine[] {
  const pidStr = args.find(a => /^\d+$/.test(a));
  const pid = pidStr ? parseInt(pidStr) : NaN;
  const store = useGameStore.getState();
  const process = store.activeProcesses.get(pid);
  if (!process) return [{ text: `kill: (${pid}) - No such process`, kind: 'error' }];
  // Удалить из Map (иммутабельно):
  const newMap = new Map(store.activeProcesses);
  newMap.delete(pid);
  useGameStore.setState({ activeProcesses: newMap });
  return [{ text: `Process ${pid} (${process.command}) terminated.`, kind: 'output' }];
}
```

**4. Новый win_condition type в WinConditionChecker:**
```typescript
if (condition.type === 'process_killed_and_command') {
  const { activeProcesses, currentLevel } = useGameStore.getState();
  const targets = (currentLevel?.definition.mock_processes ?? [])
    .filter(p => p.is_target);
  const allKilled = targets.every(t => !activeProcesses.has(t.pid));
  if (!allKilled) return false;
  // Затем проверить как обычный command_executed:
  return checkCommandExecuted(condition, ctx);
}
```

---

### V2-09: Новые команды

**df -h:**
```typescript
// YAML:
// disk_usage:
//   - filesystem: "/dev/sda1"
//     size: "500G"
//     used: "487G"
//     avail: "13G"
//     mount: "/"

function handleDf(args: string[]): OutputLine[] {
  const level = useGameStore.getState().currentLevel;
  const entries = level?.definition.disk_usage;
  if (!entries) {
    // Статичный placeholder
    return [
      { text: 'Filesystem      Size  Used Avail  Mounted on', kind: 'output' },
      { text: '/dev/sda1       500G  487G   13G   /',          kind: 'output' },
    ];
  }
  const header = 'Filesystem      Size  Used Avail  Mounted on';
  const rows = entries.map(e =>
    `${e.filesystem.padEnd(15)} ${e.size.padEnd(5)} ${e.used.padEnd(5)} ${e.avail.padEnd(6)}  ${e.mount}`
  );
  return [header, ...rows].map(text => ({ text, kind: 'output' as const }));
}
```

**tail -f:**
```typescript
// YAML:
// tail_stream:
//   - "[01:23:45] coolant_system: OK"
//   - "[01:23:47] reactor_core: initializing..."

async function handleTailF(path: string, writeToTerm: (line: string) => void): Promise<void> {
  // 1. Вывести содержимое файла из VirtualFS (tail последних 10 строк)
  const content = fs.cat(path);
  const lines = content.split('\n').slice(-10);
  lines.forEach(l => writeToTerm(l));

  // 2. Стримить tail_stream из YAML с задержкой
  const stream = level?.definition.tail_stream ?? [];
  for (let i = 0; i < stream.length; i++) {
    await new Promise(r => setTimeout(r, 1500));
    writeToTerm(stream[i]);
  }

  // 3. Автостоп
  await new Promise(r => setTimeout(r, 3000));
  writeToTerm('^C');   // имитация Ctrl+C
}
// tail -f — асинхронная команда: блокирует ввод пока идёт стрим
// После завершения — разблокировать
```

**ip a:**
```typescript
// YAML:
// network:
//   - iface: "eth0"
//     inet: "10.0.0.5/24"
//     status: "UP"

function handleIpA(): OutputLine[] {
  const ifaces = level?.definition.network ?? [
    { iface: 'lo', inet: '127.0.0.1/8', status: 'UP' },
  ];
  const lines: string[] = [];
  ifaces.forEach((n, i) => {
    lines.push(`${i + 1}: ${n.iface}: <${n.status}> mtu 1500`);
    lines.push(`    inet ${n.inet} brd 10.0.0.255 scope global ${n.iface}`);
  });
  return lines.map(text => ({ text, kind: 'output' as const }));
}
```

**ping:**
```typescript
// YAML: reachable_hosts: ["10.0.0.42"]

function handlePing(host: string): OutputLine[] {
  const reachable = level?.definition.reachable_hosts ?? [];
  if (!reachable.includes(host)) {
    return [
      { text: `PING ${host}: 56 data bytes`, kind: 'output' },
      { text: `Request timeout for icmp_seq 0`, kind: 'error' },
      { text: `Request timeout for icmp_seq 1`, kind: 'error' },
      { text: `--- ${host} ping statistics ---`, kind: 'output' },
      { text: `3 packets transmitted, 0 received, 100% packet loss`, kind: 'error' },
    ];
  }
  return [
    { text: `PING ${host}: 56 data bytes`, kind: 'output' },
    { text: `64 bytes from ${host}: icmp_seq=0 ttl=64 time=1.2 ms`, kind: 'output' },
    { text: `64 bytes from ${host}: icmp_seq=1 ttl=64 time=0.8 ms`, kind: 'output' },
    { text: `64 bytes from ${host}: icmp_seq=2 ttl=64 time=1.1 ms`, kind: 'output' },
    { text: `--- ${host} ping statistics ---`, kind: 'output' },
    { text: `3 packets transmitted, 3 received, 0% packet loss`, kind: 'output' },
  ];
}
```

**systemctl (симуляция):**
```typescript
// YAML:
// systemctl_services:
//   - name: "coolant_system"
//     status: "inactive"
//     is_enabled: true

// runtime state в gameStore:
serviceStates: Map<string, 'active' | 'inactive' | 'failed'>

function handleSystemctl(action: string, service: string): OutputLine[] {
  const services = level?.definition.systemctl_services ?? [];
  const svc = services.find(s => s.name === service);
  if (!svc) return [{ text: `Unit ${service}.service could not be found.`, kind: 'error' }];

  const currentStatus = gameStore.serviceStates.get(service) ?? svc.status;

  if (action === 'start') {
    if (!svc.is_enabled) {
      return [{ text: `Failed to start ${service}: Permission denied`, kind: 'error' }];
    }
    gameStore.setServiceState(service, 'active');
    return [{ text: `[  OK  ] Started ${service}.`, kind: 'output' }];
  }
  if (action === 'status') {
    return [
      { text: `● ${service}.service`, kind: 'output' },
      { text: `   Active: ${currentStatus}`, kind: currentStatus === 'active' ? 'output' : 'system' },
    ];
  }
  return [{ text: `Unknown action: ${action}`, kind: 'error' }];
}
```

**Pipe оператор:**
```typescript
// В parseInput(), если input содержит ' | ':
const parts = input.split(' | ');
if (parts.length === 2) {
  const leftResult = executeRaw(parts[0].trim(), ctx);
  const leftText = leftResult.map(l => l.text).join('\n');

  const [rightCmd, ...rightArgs] = parts[1].trim().split(/\s+/);
  if (rightCmd === 'grep') {
    const pattern = rightArgs[0] ?? '';
    const filtered = leftText.split('\n').filter(l => l.includes(pattern));
    return filtered.map(text => ({ text, kind: 'output' as const }));
  }
}
// Для других pipe комбинаций — "not supported" (расширять по мере нужды)
```

**Новые YAML поля — добавить в `level.types.ts`:**
```typescript
disk_usage?: Array<{ filesystem: string; size: string; used: string; avail: string; mount: string }>;
tail_stream?: string[];
systemctl_services?: Array<{ name: string; status: 'active' | 'inactive'; is_enabled: boolean }>;
network?: Array<{ iface: string; inet: string; status: 'UP' | 'DOWN' }>;
reachable_hosts?: string[];
```

---

### V2-10: Sequence win condition

В `level.types.ts`:
```typescript
export interface WinConditionSequence {
  type: 'sequence';
  steps: Array<{
    command: string;
    working_directory: string;
  }>;
}
// Добавить в WinCondition union
```

В `gameStore.ts`:
```typescript
// Runtime state:
sequenceStep: 0,   // текущий шаг sequence win condition
```

В `WinConditionChecker.ts`:
```typescript
if (condition.type === 'sequence') {
  const { sequenceStep } = useGameStore.getState();
  const step = condition.steps[sequenceStep];
  if (!step) return false;

  const cmdMatch = normalizeCmd(ctx.parsed.raw) === normalizeCmd(step.command);
  const dirMatch = ctx.cwd === step.working_directory;

  if (cmdMatch && dirMatch) {
    const nextStep = sequenceStep + 1;
    useGameStore.setState({ sequenceStep: nextStep });
    if (nextStep === condition.steps.length) return true;
    // Не win ещё — показать прогресс:
    ctx.addOutput({ text: `[ШАГ ${nextStep}/${condition.steps.length}] Выполнено. Продолжай.`, kind: 'system' });
  }
  return false;
}
```

---

## СЕССИЯ 3 — Контент: уровни 05–09

> Создавать YAML строго по шаблону из `docs/scenario.md`.  
> После каждого файла: `node scripts/validate-levels.js` и `npm test`.

### V2-11: level_05_turret.yaml

Детали из `docs/scenario.md` раздел "LEVEL 03 — Турельный пост".
SectionPlan из `docs/cursor_prompt_section_plan.md` раздел "Level 03".

Ключевые параметры:
```yaml
id: "level_05"
title: "Миссия 5: Турельный пост"
location: "Турельный пост — Сектор C"
sudo_password: "n0str0m0"
win_condition:
  type: "process_killed_and_command"
  target_pid: 4821
  command: "./disable_turret.sh"
  working_directory: "/emergency"
mock_processes:
  - pid: 4821
    user: "root"
    cpu: 98.7
    mem: 12.4
    command: "turret_daemon"
    port: 4821
    is_target: true
  - pid: 1102
    user: "pilot"
    cpu: 0.0
    mem: 0.2
    command: "sshd"
    port: 22
  - pid: 2205
    user: "pilot"
    cpu: 0.1
    mem: 0.3
    command: "web_monitor"
    port: 8080
```

Не забыть добавить в `LEVEL_ORDER` и `LevelId`.

---

### V2-12: level_06_comms.yaml

Детали из `docs/scenario.md` раздел "LEVEL 04 — Рубка связи".

```yaml
id: "level_06"
title: "Миссия 6: Рубка связи"
win_condition:
  type: "command_executed"
  command: "./activate_beacon.sh"
  working_directory: "/beacon"
# contains используется на промежуточном шаге:
# После grep -r "FREQ" → ctx.lastCommandOutput содержит FREQ=472.88
# Beacon разблокируется только если grep был выполнен (отслеживать флаг)
```

Файловая система содержит 200+ файлов? Нет — достаточно 6–8 реальных, остальные
пустые файлы в /logs/2187-01/ и /logs/2187-02/ (просто упомянуть в нарративе).
Сделать 3–4 файла с контентом, остальные пустые.

---

### V2-13: level_07_engine.yaml

Детали из `docs/scenario.md` раздел "LEVEL 06 — Машинное отделение".

```yaml
id: "level_07"
title: "Миссия 7: Машинное отделение"
sudo_password: "n0str0m0"
win_condition:
  type: "process_killed_and_command"
  target_pid: 1337
  command: "./start_engines.sh"
  working_directory: "/engine"
mock_processes:
  - pid: 1337
    user: "root"
    cpu: 99.9
    mem: 45.2
    command: "legacy_lockd"
    is_target: true
  - pid: 101
    user: "pilot"
    cpu: 0.0
    mem: 0.1
    command: "bash"
disk_usage:
  - filesystem: "/dev/sda1"
    size: "500G"
    used: "487G"
    avail: "13G"
    mount: "/"
  - filesystem: "/dev/sdb1"
    size: "100G"
    used: "2G"
    avail: "98G"
    mount: "/cargo"
```

---

### V2-14: level_08_reactor.yaml

Детали из `docs/scenario.md` раздел "LEVEL 07 — Реактор".

```yaml
id: "level_08"
title: "Миссия 8: Реакторный отсек"
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
  - name: "coolant_pump"
    status: "inactive"
    is_enabled: true
  - name: "reactor_core"
    status: "inactive"
    is_enabled: true
tail_stream:
  - "[01:23:45] coolant_pump: warming up..."
  - "[01:23:47] coolant_pump: OK — temperature nominal"
  - "[01:23:48] reactor_core: standby mode"
  - "[01:23:50] awaiting start_reactor command..."
```

---

### V2-15: level_09_network.yaml (финальный)

Детали из `docs/scenario.md` раздел "LEVEL 08 — Сетевой узел".

```yaml
id: "level_09"
title: "Миссия 9: Сетевой узел — SOS"
location: "Сетевой узел — Телекоммуникационный отсек"
sudo_password: "n0str0m0"
win_condition:
  type: "command_executed"
  command: "./activate_relay.sh"
  working_directory: "/relay"
  requires_ssh: true
  ssh_host: "10.0.0.42"
network:
  - iface: "lo"
    inet: "127.0.0.1/8"
    status: "UP"
  - iface: "eth0"
    inet: "10.0.0.5/24"
    status: "UP"
reachable_hosts:
  - "10.0.0.42"
remote_filesystem:
  host: "10.0.0.42"
  user: "relay_operator"
  filesystem:
    - path: "/"
      type: dir
    - path: "/relay"
      type: dir
    - path: "/relay/activate_relay.sh"
      type: file
      permissions: "750"
      content: |
        #!/bin/bash
        echo "[RELAY] Канал связи активирован."
        echo "[RELAY] SOS TRANSMITTED ✓"
        echo "[SOS_SENT]"
    - path: "/config"
      type: dir
    - path: "/config/relay_config.txt"
      type: file
      permissions: "644"
      content: |
        RELAY NODE 7 — CONFIGURATION
        Channel: SOS_EMERGENCY
        Frequency: 472.88 MHz
        Range: 50 AU
        Status: STANDBY

reward:
  oxygen_bonus: 99
  score: 500
  unlock_log: |
    СИГНАЛ SOS ПРИНЯТ.
    Спасательное судно HYPERION-3 выходит на курс.
    Расчётное время прибытия: 4 часа.
    Ты выжил.
```

---

## СЕССИЯ 4 — Тесты и полировка (V2-16)

### V2-16: Тесты

**Добавить в `CommandParser.test.ts`:**
```typescript
describe('hasSudo mechanic', () => {
  it('kill без sudo → permission denied если !hasSudo', () => { ... });
  it('sudo kill → success после правильного пароля', () => { ... });
  it('kill если hasSudo → success без sudo', () => { ... });
  it('[SUDO_GRANTED] в script output → setHasSudo(true)', () => { ... });
});

describe('mock processes', () => {
  it('ps aux → показывает все процессы', () => { ... });
  it('kill -9 target → удаляет из activeProcesses', () => { ... });
  it('netstat -tlnp → показывает только процессы с port', () => { ... });
  it('pipe: ps aux | grep turret → фильтрует результат', () => { ... });
});

describe('new commands', () => {
  it('df -h → таблица из YAML', () => { ... });
  it('ip a → список интерфейсов', () => { ... });
  it('ping reachable_host → success', () => { ... });
  it('ping unreachable → timeout', () => { ... });
});
```

**Добавить в `WinConditionChecker.test.ts`:**
```typescript
describe('process_killed_and_command', () => {
  it('target alive → false', () => { ... });
  it('target killed + wrong cmd → false', () => { ... });
  it('target killed + correct cmd + correct dir → true', () => { ... });
});

describe('sequence', () => {
  it('step 1 of 3 → false, sequenceStep increments', () => { ... });
  it('all 3 steps → true', () => { ... });
  it('step 2 before step 1 → not counted', () => { ... });
});
```

**Цель: ≥ 55 тестов, все зелёные.**

---

### Полировка (в конце сессии 4)

**Cutscene skip on click:**
```tsx
// CutsceneScreen.tsx: добавить onClick на основной контейнер
<div className="cutscene" onClick={skipTypewriter}>
```
При клике — `cancelled = true` → весь текст выводится мгновенно.

**SEC-02: FAILSAFE_SCHEMA:**
```javascript
// scripts/validate-levels.js:
import { load, FAILSAFE_SCHEMA } from 'js-yaml';
const level = load(content, { schema: FAILSAFE_SCHEMA });
```

**Обновить статус в `docs/cursor_prompt_section_plan.md`:**
Первую строку изменить с `🔜 запланировано` на `✅ реализовано`.

---

## Финальный чеклист спринта

```
СЕССИЯ 1:
  [ ] .github/workflows/ci.yml — CI green
  [ ] assets/scenes/ — placeholder SVG для 5 уровней
  [ ] CutsceneScreen получает imageUrl из YAML
  [ ] VictoryScreen: Enter → следующий уровень
  [ ] import.meta.glob — нет ручных imports в levels/index.ts
  [ ] WinCondition.contains — реализовано + тест
  [ ] main_readme.md — актуализирован
  [ ] npm test — все тесты проходят

СЕССИЯ 2:
  [ ] hasSudo в store + CommandParser + grant_admin detection
  [ ] sudo password prompt работает
  [ ] MockProcess: ps/netstat/lsof/kill
  [ ] df, tail -f, systemctl, ip a, ping
  [ ] pipe: cmd | grep
  [ ] sequence win condition
  [ ] Все новые типы в level.types.ts
  [ ] npm test — все тесты проходят

СЕССИЯ 3:
  [ ] level_05_turret.yaml — валиден, LEVEL_ORDER обновлён
  [ ] level_06_comms.yaml — валиден
  [ ] level_07_engine.yaml — валиден
  [ ] level_08_reactor.yaml — валиден
  [ ] level_09_network.yaml — валиден
  [ ] validate-levels.js — все 9 уровней OK
  [ ] SectionPlan для каждого уровня (из cursor_prompt_section_plan.md)
  [ ] npm run build — нет ошибок

СЕССИЯ 4:
  [ ] ≥ 55 тестов, все зелёные
  [ ] Cutscene skip on click
  [ ] SEC-02 FAILSAFE_SCHEMA
  [ ] cursor_prompt_section_plan.md — статус ✅
  [ ] CI badge в main_readme.md
  [ ] npm run build — финальный bundle OK
```
