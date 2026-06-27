# Cursor Prompt — SectionPlan: планы отсеков + интерактивные объекты

> **Статус:** ✅ реализовано — `SectionPlan.tsx`, `section_plan` во всех 10 YAML, интеграция в `MissionLog`.  
> **Роль:** @ui-designer + @generator  
> **Читай перед началом:** `docs/UI_designer.md`, `docs/scenario.md`, `game/src/types/level.types.ts`, `game/src/components/MissionLog.tsx`, `game/src/App.tsx`  
> **Принцип:** все действия игрока — только в терминале. Планы отсеков — декоратив + подсказки окружения. Никаких кликабельных команд.

---

## Концепция

В правой панели, над роботом R.U.X, отображается статичный ASCII-план
текущего отсека корабля. В плане есть **объекты** — при наведении курсора
они «приближаются»: появляется деталь-попап с лором или намёком на решение.
Это не замена системе `hint 1/2/3` — это атмосферные подсказки окружения.

```
┌──────────────────────────────────────────┬──────────────────────┐
│  O2 ██████████████░░░  74%   SCORE: 0320 │  ← TopBar            │
├──────────────────────────────────────────┤                      │
│                                          │  ┌── SECTION PLAN ──┐│
│                                          │  │ .================.││
│   ТЕРМИНАЛ (xterm.js)                    │  │ | AIRLOCK - A    |││  ← план отсека
│                                          │  │ |[NOTE]  [PANEL] |││  ← объекты
│   RETRO-UX:/system_core$ _               │  │ |  [sys_core/]   |││
│                                          │  │ |   [DOOR >>>]   |││
│                                          │  │ '================'││
│                                          │  └────────────────────┘│
│                                          │  ┌── R.U.X ──────────┐│
│                                          │  │  _(\    |@@|       ││  ← робот
│                                          │  │ (__/\__ \--/ __    ││
│                                          │  └────────────────────┘│
│                                          │  ┌── ЦЕЛИ МИССИИ ────┐│
│                                          │  │ [✓] ls -la         ││  ← mission log
│                                          │  │ [✓] chmod +x       ││
│                                          │  │ [ ] ./open_door.sh ││
│                                          │  └────────────────────┘│
└──────────────────────────────────────────┴──────────────────────┘
```

---

## Задача 1 — YAML-схема: секция `section_plan`

Добавить опциональное поле `section_plan` в каждый уровень.

```yaml
section_plan:
  # ASCII-план отсека: строго 20 символов ширина, 8 строк высота
  # Использовать символы: . | - + [ ] / \ ( ) > < = ' " пробел
  # Готовые планы для level_00…level_04 — см. Задачу 5 ниже
  ascii: |
    .==================.
    |  AIRLOCK - A     |
    |                  |
    |[README] [LOGS/]  |
    |   .        .     |
    | [system_core/]   |
    | open_door.sh     |
    |   [DOOR >>>]     |
    '=================='

  # label = точная подстрока из ascii (для tokenize)
  hotspots:
    - id: "readme"
      label: "[README]"
      tooltip: "README в system_core/\nПодсказка про chmod +x."
      detail: |
        .-----------.
        | README    |
        | chmod +x  |
        | ./script  |
        '-----------'
      nudge: "Прочти README в терминале"

    - id: "door"
      label: "[DOOR >>>]"
      tooltip: "Гермодверь. Закрыта.\nРядом лежит open_door.sh"
      nudge: "Скрипт уже есть — осталось выдать права и запустить"
```

### Обновить `level.types.ts`

```typescript
export interface SectionHotspot {
  id: string;
  label: string;        // подстрока, которую ищем в ascii
  tooltip: string;      // показывается при hover
  detail?: string;      // опциональный ASCII-зум
  nudge?: string;       // строка-направление (не спойлер)
}

export interface SectionPlan {
  ascii: string;        // 20×8 ASCII art
  hotspots: SectionHotspot[];
}

// Добавить в LevelDefinition (game/src/types/level.types.ts):
export interface LevelDefinition {
  // ... существующие поля
  section_plan?: SectionPlan;
}
```

После добавления типа — обновить `LevelLoader.ts` (pass-through поля) и `validate-levels.js` (опциональная валидация hotspots).

---

## Задача 2 — Компонент `SectionPlan.tsx`

**Путь:** `game/src/components/SectionPlan.tsx`

### Принцип рендера

ASCII-план разбивается на токены. Каждый `label` из `hotspots`
оборачивается в `<span>` с hover-обработчиком. Остальной текст — plain text.

```typescript
/**
 * Tokenize ASCII plan string.
 * Returns array of { text, hotspot? } segments.
 */
function tokenize(ascii: string, hotspots: SectionHotspot[]): Token[] {
  // Для каждой строки ascii ищем все label подстроки.
  // Сортируем hotspots по длине label (длиннее — приоритет).
  // Разбиваем строку на сегменты: plain | hotspot.
  // Сохраняем переносы строк как отдельный токен.
}
```

### JSX структура

```tsx
import { useState } from 'react';
import type { SectionPlan as SectionPlanType, SectionHotspot } from '../types/level.types';

interface Props {
  plan: SectionPlanType;
}

export default function SectionPlan({ plan }: Props) {
  const [activeHotspot, setActiveHotspot] = useState<SectionHotspot | null>(null);
  const tokens = tokenize(plan.ascii, plan.hotspots);

  return (
    <div className="section-plan">
      <div className="section-plan__header">ПЛАН ОТСЕКА</div>

      <div className="section-plan__map-wrapper">
        {/* ASCII план с интерактивными токенами */}
        <pre className="section-plan__map">
          {tokens.map((token, i) =>
            token.hotspot ? (
              <span
                key={i}
                className="section-plan__hotspot"
                onMouseEnter={() => setActiveHotspot(token.hotspot!)}
                onMouseLeave={() => setActiveHotspot(null)}
                data-id={token.hotspot.id}
              >
                {token.text}
              </span>
            ) : (
              <span key={i}>{token.text}</span>
            )
          )}
        </pre>

        {/* Тултип — появляется при hover */}
        {activeHotspot && (
          <div
            className="section-plan__tooltip"
            role="tooltip"
            aria-live="polite"
          >
            {/* Детальный ASCII-зум (если есть) */}
            {activeHotspot.detail && (
              <pre className="section-plan__detail">
                {activeHotspot.detail}
              </pre>
            )}

            {/* Лор-описание */}
            <p className="section-plan__tooltip-text">
              {activeHotspot.tooltip}
            </p>

            {/* Направление (nudge) */}
            {activeHotspot.nudge && (
              <p className="section-plan__nudge">
                &gt; {activeHotspot.nudge}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Задача 3 — CSS (`index.css`)

```css
/* ── SectionPlan ─────────────────────────────── */

.section-plan {
  padding: 6px 8px 4px;
  border-bottom: 1px solid var(--crt-dim);
  position: relative;   /* для позиционирования тултипа */
}

.section-plan__header {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--crt-dim);
  text-transform: uppercase;
  margin-bottom: 4px;
  text-align: center;
}

/* ASCII карта */
.section-plan__map {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.25;
  color: var(--crt-green);
  opacity: 0.65;
  white-space: pre;
  margin: 0;
  user-select: none;
}

/* Интерактивный объект */
.section-plan__hotspot {
  color: var(--crt-amber);
  cursor: crosshair;
  transition: color 0.1s, text-shadow 0.1s;
  text-decoration: none;
}

.section-plan__hotspot:hover {
  color: var(--crt-amber);
  text-shadow: var(--glow-amber);
  /* Лёгкое мигание при наведении */
  animation: hotspot-blink 0.4s steps(2) 1;
}

@keyframes hotspot-blink {
  0%   { opacity: 1; }
  50%  { opacity: 0.3; }
  100% { opacity: 1; }
}

/* Тултип */
.section-plan__tooltip {
  position: absolute;
  left: calc(100% + 8px);  /* справа от плана */
  top: 0;
  width: 180px;
  background: var(--bg-deep);
  border: 1px solid var(--crt-amber);
  box-shadow: 0 0 12px rgba(255, 176, 0, 0.25);
  padding: 8px;
  z-index: 100;
  pointer-events: none;

  /* Появление */
  animation: tooltip-appear 0.12s ease-out forwards;
}

@keyframes tooltip-appear {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Детальный ASCII-зум внутри тултипа */
.section-plan__detail {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.2;
  color: var(--crt-amber);
  white-space: pre;
  margin: 0 0 6px 0;
  text-shadow: var(--glow-amber);
}

/* Лор-текст */
.section-plan__tooltip-text {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.4;
  color: var(--crt-green);
  margin: 0 0 4px 0;
  white-space: pre-line;
}

/* Направление (nudge) */
.section-plan__nudge {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--crt-dim);
  margin: 4px 0 0 0;
  opacity: 0.8;
  font-style: italic;
}

/* Если тултип не влезает справа — перевернуть */
@media (max-width: 900px) {
  .section-plan__tooltip {
    left: auto;
    right: calc(100% + 8px);
  }
}

/* prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .section-plan__hotspot:hover { animation: none; }
  .section-plan__tooltip       { animation: none; }
}
```

---

## Задача 4 — Интеграция в `MissionLog.tsx`

### Порядок в правой панели (сверху вниз):

```tsx
// game/src/components/MissionLog.tsx
import SectionPlan from './SectionPlan';
import RobotWidget from './RobotWidget';

interface MissionLogProps {
  objectives: LearningObjective[];
  completedCommands: string[];
  sectionPlan?: SectionPlanType;  // из level.definition.section_plan
}

export default function MissionLog({ objectives, completedCommands, sectionPlan }: MissionLogProps) {
  return (
    <aside className="mission-sidebar">
      {/* 1. План отсека (если задан в YAML) */}
      {sectionPlan && <SectionPlan plan={sectionPlan} />}

      {/* 2. Робот R.U.X */}
      <RobotWidget />

      {/* 3. Цели миссии */}
      <div className="mission-objectives">...</div>
    </aside>
  );
}
```

В `App.tsx` передать `sectionPlan={level.definition.section_plan}`.

### CSS sidebar

Использовать существующий класс `.mission-sidebar` в `game/src/index.css` (ширина 210px).
Добавить только стили `.section-plan*` — не дублировать `.sidebar`.

---

## Задача 5 — ASCII-планы для уровней

> Ширина: 20 символов (внутри рамки). Высота: 8 строк. Рамка: `.====.` / `'====='`  
> **§5.1–5.5** — готовы к добавлению в существующие YAML (`level_00` … `level_04`).  
> **§5.6–5.9** — roadmap v2 (уровни ещё не созданы), см. `docs/scenario.md`.

| ID | YAML-файл | Локация |
|----|-----------|---------|
| `level_00` | `level_00_tutorial.yaml` | Аварийная капсула |
| `level_01` | `level_01_airlock.yaml` | Внешний шлюз |
| `level_02` | `level_02_crew_quarters.yaml` | Жилой отсек экипажа |
| `level_03` | `level_03_cargo_bay.yaml` | Грузовой отсек |
| `level_04` | `level_04_comms.yaml` | Рубка связи |

### Level 00 — Аварийная капсула (`level_00_tutorial.yaml`)

```yaml
section_plan:
  ascii: |
    .==================.
    |  ESCAPE POD      |
    |                  |
    |[DOCS]  [SYSTEM]  |
    |   .         .    |
    | emergency_       |
    | protocol.txt     |
    | [BRIEFING >>>]   |
    '=================='
  hotspots:
    - id: "docs"
      label: "[DOCS]"
      tooltip: "Папка /docs/\nПротокол аварийного выживания."
      detail: |
        .---------.
        |/docs/   |
        |emergency|
        |_protocol|
        |.txt     |
        '---------'
      nudge: "cat /docs/emergency_protocol.txt"

    - id: "system"
      label: "[SYSTEM]"
      tooltip: "Системная директория /system/\nТам брифинг миссии."
      nudge: "cd /system"

    - id: "briefing"
      label: "[BRIEFING >>>]"
      tooltip: "mission_briefing.txt\nФинал обучающего уровня."
      detail: |
        .---------.
        | mission |
        |_briefing|
        |.txt     |
        |WIN ✓   |
        '---------'
      nudge: "cat /system/mission_briefing.txt"
```

---

### Level 01 — Внешний шлюз (`level_01_airlock.yaml`)

```yaml
section_plan:
  ascii: |
    .==================.
    |  AIRLOCK - A     |
    |                  |
    |[README] [LOGS/]  |
    |   .        .     |
    | [system_core/]   |
    | open_door.sh     |
    |   [DOOR >>>]     |
    '=================='
  hotspots:
    - id: "readme"
      label: "[README]"
      tooltip: "README.txt в system_core/\nПодсказка про chmod."
      detail: |
        .---------.
        | README  |
        |.txt     |
        |chmod +x |
        |./script |
        '---------'
      nudge: "cat /system_core/README.txt"

    - id: "logs"
      label: "[LOGS/]"
      tooltip: "Журнал доступа.\nПрава сброшены после столкновения."
      nudge: "cat /logs/access.log"

    - id: "core"
      label: "[system_core/]"
      tooltip: "Системный блок шлюза.\nСкрипт open_door.sh внутри."
      detail: |
        .---------.
        |system_  |
        |core/    |
        |000 perms|
        |chmod!   |
        '---------'
      nudge: "cd /system_core && ls -la"

    - id: "door"
      label: "[DOOR >>>]"
      tooltip: "Гермодверь.\nНужен chmod +x и ./open_door.sh"
      detail: |
        .---------.
        |  DOOR   |
        | LOCKED  |
        |open_door|
        |  .sh    |
        '---------'
      nudge: "chmod +x open_door.sh && ./open_door.sh"
```

---

### Level 02 — Жилой отсек (`level_02_crew_quarters.yaml`)

```yaml
section_plan:
  ascii: |
    .==================.
    | CREW QUARTERS    |
    |                  |
    |[CREW/] [SYSTEM/] |
    |   .        .     |
    | grep MED-?       |
    | [MED_BAY >>>]    |
    | activate script  |
    '=================='
  hotspots:
    - id: "crew"
      label: "[CREW/]"
      tooltip: "Личные файлы экипажа.\nКапитан спрятал намёк на код."
      detail: |
        .---------.
        |/crew/   |
        |dallas/  |
        |personal |
        |.log     |
        '---------'
      nudge: "grep -r 'MED-' /crew/"

    - id: "system"
      label: "[SYSTEM/]"
      tooltip: "Системные конфиги.\nКод авторизации в med_access.conf"
      detail: |
        .---------.
        |/system/ |
        |config/  |
        |AUTH_CODE|
        |MED-4891 |
        '---------'
      nudge: "grep -r 'AUTH_CODE' /system/"

    - id: "medbay"
      label: "[MED_BAY >>>]"
      tooltip: "Медицинский отсек заблокирован.\nСкрипт в /system/scripts/"
      detail: |
        .---------.
        | activate|
        |_med_bay  |
        |.sh      |
        |chmod +x |
        '---------'
      nudge: "chmod +x /system/scripts/activate_med_bay.sh"
```

---

### Level 03 — Грузовой отсек (`level_03_cargo_bay.yaml`)

```yaml
section_plan:
  ascii: |
    .==================.
    |   CARGO BAY      |
    |                  |
    |[MANIF] [NAV_AR/] |
    |   .        .     |
    | navigation       |
    |  .tar.gz         |
    | [BEACON/DATA/]   |
    '=================='
  hotspots:
    - id: "manifest"
      label: "[MANIF]"
      tooltip: "Грузовой манифест.\nУказывает на nav-архив."
      nudge: "cat /cargo/manifest.txt"

    - id: "nav_archive"
      label: "[NAV_AR/]"
      tooltip: "nav_archive/\nnavigation_data.tar.gz"
      detail: |
        .---------.
        |nav_     |
        |archive/ |
        |.tar.gz  |
        |tar -xzf |
        '---------'
      nudge: "tar -tzf /cargo/nav_archive/navigation_data.tar.gz"

    - id: "beacon"
      label: "[BEACON/DATA/]"
      tooltip: "Сюда распаковать архив\nи запустить beacon_protocol.sh"
      detail: |
        .---------.
        |/beacon/ |
        |data/    |
        |beacon_  |
        |protocol |
        '---------'
      nudge: "tar -xzf ... -C /beacon/data/"
```

---

### Level 04 — Рубка связи (`level_04_comms.yaml`)

```yaml
section_plan:
  ascii: |
    .==================.
    |  COMMS BRIDGE    |
    |                  |
    |[NETWORK][SECRET] |
    |   .        .     |
    | ssh 10.0.0.42    |
    | [RELAY remote]   |
    |  rescue_op       |
    '=================='
  hotspots:
    - id: "network"
      label: "[NETWORK]"
      tooltip: "Сетевые конфиги.\nIP бота «Йонас» в interfaces.conf"
      detail: |
        .---------.
        |/network/|
        |eth1:    |
        |10.0.0.1 |
        |.42=bot  |
        '---------'
      nudge: "cat /network/interfaces.conf"

    - id: "secret"
      label: "[SECRET]"
      tooltip: "SSH credentials.\nФайл с правами 600."
      detail: |
        .---------.
        |/secrets/|
        |ssh_cred |
        |.txt     |
        |rescue_op|
        '---------'
      nudge: "cat /secrets/ssh_credentials.txt"

    - id: "relay"
      label: "[RELAY remote]"
      tooltip: "Ретранслятор на боте «Йонас».\nSSH → ./activate_relay.sh"
      detail: |
        .---------.
        |ssh      |
        |rescue_op|
        |@10.0.0. |
        |42       |
        '---------'
      nudge: "ssh rescue_op@10.0.0.42"
```

---

## Задача 5 (Roadmap v2) — ASCII-планы для уровней 02–08

> Уровни ещё не созданы. Нумерация — из расширенного сценария `docs/scenario.md`,  
> **не совпадает** с текущими `level_02`…`level_04` в репозитории.

### Level 02 — Рубка управления (roadmap)

```yaml
section_plan:
  ascii: |
    .==================.
    |     BRIDGE       |
    |                  |
    |[LOG]    [CHAIR]  |
    |  .         .     |
    |[admin/] [systems]|
    |  !ВАЖНО!         |
    |  [CONSOLE >>>]   |
    '=================='
  hotspots:
    - id: "log"
      label: "[LOG]"
      tooltip: "Журнал капитана Вейл.\nСодержит инструкции по правам."
      detail: |
        .---------.
        |captain  |
        |_log.txt |
        |grant    |
        |admin!   |
        '---------'
      nudge: "cat captain_log.txt — обязательно прочти"

    - id: "admin"
      label: "[admin/]"
      tooltip: "Папка admin/\nТам скрипт grant_admin.sh"
      detail: |
        .---------.
        | admin/  |
        |grant_   |
        |admin.sh |
        | ← RUN  |
        '---------'
      nudge: "chmod +x admin/grant_admin.sh"

    - id: "chair"
      label: "[CHAIR]"
      tooltip: "Капитанское кресло.\nПусто. Плохой знак."
      detail: |
        .---------.
        | CAPTAIN |
        | CHAIR   |
        | vacant  |
        '---------'

    - id: "console"
      label: "[CONSOLE >>>]"
      tooltip: "Главная консоль.\nSystems/ — финальный шаг."
      nudge: "cd systems && ./init_systems.sh"
```

---

### Level 03 — Турельный пост (roadmap)

```yaml
section_plan:
  ascii: |
    .==================.
    | TURRET CONTROL   |
    |                  |
    |[MNL]  [SCREEN]   |
    |  .       .       |
    |  PID:4821        |
    |  99%CPU [EMRGNCY]|
    |   [BARREL >>>]   |
    '=================='
  hotspots:
    - id: "manual"
      label: "[MNL]"
      tooltip: "Руководство безопасности.\nПорт 4821, нужен kill."
      detail: |
        .---------.
        |security |
        |_manual  |
        |.txt     |
        |port 4821|
        '---------'
      nudge: "cat security_manual.txt"

    - id: "screen"
      label: "[SCREEN]"
      tooltip: "Экран мониторинга.\nВидно процессы системы."
      detail: |
        .---------.
        |netstat  |
        |-tlnp    |
        | :4821   |
        |PID=4821 |
        '---------'
      nudge: "netstat -tlnp | grep 4821"

    - id: "emergency"
      label: "[EMRGNCY]"
      tooltip: "Аварийный отсек.\ndisable_turret.sh — финал."
      detail: |
        .---------.
        |emergency|
        |/disable |
        |_turret  |
        |.sh      |
        '---------'
      nudge: "chmod +x emergency/disable_turret.sh"

    - id: "barrel"
      label: "[BARREL >>>]"
      tooltip: "Дуло турели смотрит\nна вход. Торопись."
      detail: |
        .---------.
        | TURRET  |
        | ACTIVE  |
        | O2: -1.5|
        | /30s    |
        '---------'
```

---

### Level 04 — Рубка связи / grep (roadmap, ≠ `level_04_comms.yaml`)

```yaml
section_plan:
  ascii: |
    .==================.
    |   COMMS ROOM     |
    |                  |
    |[DISH]  [LOGS/]   |
    |  .        .      |
    | 200+ files       |
    |[BEACON/] [FREQ?] |
    |  [MANUAL]        |
    '=================='
  hotspots:
    - id: "dish"
      label: "[DISH]"
      tooltip: "Спутниковая антенна.\nОтключена. Нужна частота."
      detail: |
        .---------.
        | DISH    |
        | OFFLINE |
        | need    |
        | FREQ=?  |
        '---------'

    - id: "logs"
      label: "[LOGS/]"
      tooltip: "Папка logs/\n200+ файлов. Используй grep."
      detail: |
        .---------.
        | logs/   |
        |2187-03/ |
        |emergency|
        |.log←key |
        '---------'
      nudge: "grep -r \"FREQ\" logs/"

    - id: "freq"
      label: "[FREQ?]"
      tooltip: "Частота сигнала SOS\nзашифрована в логах."
      detail: |
        .---------.
        |FREQ=??? |
        |grep -r  |
        |\"FREQ\"  |
        |logs/    |
        '---------'
      nudge: "grep -r \"FREQ\" logs/"

    - id: "beacon"
      label: "[BEACON/]"
      tooltip: "Папка beacon/\nactivate_beacon.sh — финал."
      nudge: "chmod +x beacon/activate_beacon.sh"
```

---

### Level 05 — Грузовой отсек (roadmap, ≈ `level_03_cargo_bay.yaml`)

```yaml
section_plan:
  ascii: |
    .==================.
    |    CARGO BAY     |
    |                  |
    |[CRATE] [MANIFEST]|
    |   .        .     |
    |[NAV.TAR.GZ]      |
    | ← extract        |
    |  [BEACON/DATA/]  |
    '=================='
  hotspots:
    - id: "crate"
      label: "[CRATE]"
      tooltip: "Грузовой контейнер.\nВнутри — архив с данными."
      detail: |
        .---------.
        |nav_arch |
        |ive/     |
        |.tar.gz  |
        |tar -xzf |
        '---------'
      nudge: "tar -tzf nav_archive/navigation_data.tar.gz"

    - id: "manifest"
      label: "[MANIFEST]"
      tooltip: "Грузовой манифест.\nСодержит список архивов."
      nudge: "cat cargo_manifest.txt"

    - id: "archive"
      label: "[NAV.TAR.GZ]"
      tooltip: "Архив навигационных данных.\nРаспакуй в новую папку."
      detail: |
        .---------.
        |mkdir    |
        |nav_extr |
        |tar -xzf |
        | *.tar.gz|
        '---------'
      nudge: "mkdir nav_extracted && tar -xzf ..."

    - id: "beacon_data"
      label: "[BEACON/DATA/]"
      tooltip: "Сюда нужно скопировать\nраспакованные .dat файлы."
      nudge: "cp nav_extracted/*.dat /beacon/data/"
```

---

### Level 06 — Машинное отделение (roadmap)

```yaml
section_plan:
  ascii: |
    .==================.
    | ENGINE ROOM      |
    |                  |
    |[MANUAL] [LOGS/]  |
    |   .        .     |
    |PID 1337          |
    |99%CPU [ZOMBIE]   |
    |  [ENGINE/ >>>]   |
    '=================='
  hotspots:
    - id: "manual"
      label: "[MANUAL]"
      tooltip: "Руководство инженера.\nПроцесс-зомби блокирует старт."
      nudge: "cat engine_manual.txt"

    - id: "zombie"
      label: "[ZOMBIE]"
      tooltip: "legacy_lockd, PID 1337.\n99% CPU. Убей его."
      detail: |
        .---------.
        |ps aux   |
        || grep   |
        |legacy   |
        |kill -9  |
        '---------'
      nudge: "ps aux | grep legacy_lockd"

    - id: "engine"
      label: "[ENGINE/ >>>]"
      tooltip: "Двигательный отсек.\nstart_engines.sh — финал."
      detail: |
        .---------.
        |chmod +x |
        |engine/  |
        |start_   |
        |engines  |
        '---------'
      nudge: "chmod +x engine/start_engines.sh"
```

---

### Level 07 — Реактор (roadmap)

```yaml
section_plan:
  ascii: |
    .==================.
    |    REACTOR       |
    |                  |
    |[COOLANT][CORE]   |
    |    .      .      |
    |  step 1→ step 2  |
    |[REACTOR/] [LOG]  |
    |  (step 3)        |
    '=================='
  hotspots:
    - id: "coolant"
      label: "[COOLANT]"
      tooltip: "Система охлаждения.\nЗапускается первой."
      detail: |
        .---------.
        |start_   |
        |coolant  |
        |.sh      |
        |step 1   |
        '---------'
      nudge: "chmod +x reactor/start_coolant.sh"

    - id: "core"
      label: "[CORE]"
      tooltip: "Ядро реактора.\nВторой шаг после coolant."
      detail: |
        .---------.
        |start_   |
        |core.sh  |
        |step 2   |
        |↑coolant |
        '---------'
      nudge: "./reactor/start_core.sh"

    - id: "reactor"
      label: "[REACTOR/]"
      tooltip: "Финальный запуск.\nТолько после coolant + core."
      detail: |
        .---------.
        |start_   |
        |reactor  |
        |.sh      |
        |step 3   |
        '---------'
      nudge: "./reactor/start_reactor.sh"

    - id: "log"
      label: "[LOG]"
      tooltip: "Лог реактора в реальном времени.\ntail -f покажет прогресс."
      nudge: "tail -f logs/reactor.log"
```

---

### Level 08 — Сетевой узел (roadmap, ≈ `level_04_comms.yaml`)

```yaml
section_plan:
  ascii: |
    .==================.
    |  NETWORK HUB     |
    |                  |
    |[NETLOG] [SECRET] |
    |   .        .     |
    |  ssh 10.0.0.42   |
    |[RELAY/] [>>SPACE]|
    | remote node      |
    '=================='
  hotspots:
    - id: "netlog"
      label: "[NETLOG]"
      tooltip: "Сетевой журнал.\nАдрес ретранслятора."
      nudge: "cat network_log.txt"

    - id: "secret"
      label: "[SECRET]"
      tooltip: "Файл secrets/\nСодержит SSH credentials."
      detail: |
        .---------.
        |secrets/ |
        |ssh_cred |
        |.txt     |
        |perm: 600|
        '---------'
      nudge: "sudo cat secrets/ssh_credentials.txt"

    - id: "relay"
      label: "[RELAY/]"
      tooltip: "Ретранслятор — удалённая машина.\nSSH → activate_relay.sh"
      detail: |
        .---------.
        |ssh      |
        |relay_op |
        |@10.0.0. |
        |42       |
        '---------'
      nudge: "ssh relay_operator@10.0.0.42"

    - id: "space"
      label: "[>>SPACE]"
      tooltip: "Спасательная станция.\nСигнал ждёт твоей команды."
      detail: |
        .---------.
        | SOS     |
        | WAITING |
        |activate |
        |_relay   |
        '---------'
```

---

## Задача 6 — `tokenize()` — детальная реализация

```typescript
interface Token {
  text: string;
  hotspot?: SectionHotspot;
}

export function tokenize(ascii: string, hotspots: SectionHotspot[]): Token[] {
  const result: Token[] = [];

  // Сортируем hotspots: длиннее label — выше приоритет
  const sorted = [...hotspots].sort((a, b) => b.label.length - a.label.length);

  // Обрабатываем строку посимвольно
  let remaining = ascii;

  while (remaining.length > 0) {
    let matched = false;

    for (const hs of sorted) {
      if (remaining.startsWith(hs.label)) {
        result.push({ text: hs.label, hotspot: hs });
        remaining = remaining.slice(hs.label.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Добавить один символ к последнему plain-токену
      const last = result[result.length - 1];
      if (last && !last.hotspot) {
        last.text += remaining[0];
      } else {
        result.push({ text: remaining[0] });
      }
      remaining = remaining.slice(1);
    }
  }

  return result;
}
```

---

## Задача 7 — Чеклист

- [ ] `SectionPlan.tsx` создан в `game/src/components/`
- [ ] `section_plan` добавлено в `level.types.ts` и парсится в `LevelLoader.ts`
- [ ] `tokenize()` покрыт unit-тестами (`tokenize.test.ts`)
- [ ] `section_plan` добавлено в YAML `level_00` … `level_04` (§5.1–5.5)
- [ ] `MissionLog.tsx` рендерит SectionPlan **над** RobotWidget
- [ ] Тултип позиционируется справа от sidebar, не уходит за экран
- [ ] Хотспоты подсвечиваются `--crt-amber` при hover
- [ ] Detail-попап показывается только если `detail` задан в YAML
- [ ] Nudge-строка читается как подсказка, не как команда (нет кнопки «выполнить»)
- [ ] `section_plan` опциональное — если не задан в YAML, компонент не рендерится
- [ ] Скролл в `.mission-sidebar` работает когда всё не влезает
- [ ] `prefers-reduced-motion` — анимации отключены
- [ ] `npm run typecheck` — 0 ошибок
- [ ] `npm run lint` — 0 warnings

---

## Дополнительно: физические подсказки в терминале

Помимо визуальных объектов в плане, некоторые файлы в виртуальной FS
уровня намеренно «говорящие» — они дают контекстный намёк при `cat`:

```
RETRO-UX:/system_core$ cat README.txt

  ┌───────────────────────────────────────────────────┐
  │ СИСТЕМНЫЙ БЛОК — ДОКУМЕНТАЦИЯ                      │
  │                                                   │
  │   Скрипты требуют прав на исполнение.              │
  │   chmod +x <скрипт>  →  ./<скрипт>                │
  │                                                   │
  └───────────────────────────────────────────────────┘
```

Такой формат (`cat` возвращает не просто текст, а ASCII-рамку) задаётся
прямо в YAML через `content: |`. Движок выводит содержимое as-is.
Это усиливает атмосферу и обучает без прямой инструкции.
