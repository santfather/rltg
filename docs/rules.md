# Cursor: Настройка ролей, хуков и Best Practices
# Проект: Retro Terminal Linux Game
# Стратегия: максимум локальных LLM через Ollama

---

## Часть 1: Структура файлов конфигурации Cursor

```
.cursor/
├── rules/
│   ├── 00_global.mdc          # Глобальные правила для всего проекта
│   ├── 01_architect.mdc       # Роль: Архитектор (deepseek-analyst)
│   ├── 02_generator.mdc       # Роль: Генератор кода (qwen-generator)
│   ├── 03_ui_designer.mdc     # Роль: UI/визуал (ui-designer)
│   ├── 04_reviewer.mdc        # Роль: Ревьюер (deepseek-r1:7b)
│   └── 05_yaml_editor.mdc     # Роль: Контент-редактор уровней
└── mcp.json                   # Конфигурация MCP-серверов (опционально)
```

> Файлы `.mdc` — это Cursor Rules. Создаются через:
> `Cursor Settings → Rules → New Rule` или вручную в `.cursor/rules/`

---

## Часть 2: Глобальные правила — `.cursor/rules/00_global.mdc`

```markdown
---
description: Глобальные правила проекта. Применяются всегда.
alwaysApply: true
---

# Retro Terminal Linux Game — Global Rules

## Стек проекта
- React 18 + TypeScript
- Vite (сборщик)
- xterm.js (терминал)
- Zustand (состояние)
- js-yaml (парсинг уровней)
- Tailwind CSS

## Структура директорий
- `src/engine/` — логика игры, НЕ содержит React-компонентов
- `src/components/` — только React-компоненты, без бизнес-логики
- `src/levels/` — YAML-файлы уровней, НЕ трогать в коде
- `src/store/` — только Zustand stores

## Жёсткие правила
1. НИКОГДА не смешивать бизнес-логику и UI в одном файле
2. Все строки с текстом игры берутся ТОЛЬКО из YAML-файлов уровней
3. TypeScript strict mode — no `any`, всегда явные типы
4. Каждая функция > 20 строк должна иметь JSDoc-комментарий
5. Не использовать `useEffect` для логики — только для side effects (подписки, DOM)
6. Виртуальная файловая система (`FileSystem.ts`) — иммутабельная: возвращает новый стейт

## Стиль кода
- Именование: camelCase для переменных/функций, PascalCase для компонентов/типов
- Экспорты: именованные (не default) для утилит и хуков, default для компонентов
- Тесты: файл `*.test.ts` рядом с модулем

## Язык ответов
- Комментарии в коде: английский
- Объяснения в чате: русский
```

---

## Часть 3: Роли и их правила

### Роль 1: Архитектор — `.cursor/rules/01_architect.mdc`

```markdown
---
description: Архитектурные решения, анализ кода, рефакторинг. Активируй когда нужно спроектировать модуль или проанализировать существующий код.
globs: ["src/engine/**", "src/store/**", "src/types/**"]
---

# Роль: Архитектор (deepseek-analyst)

## Модель
Используй: `deepseek-analyst:latest` через Ollama (localhost:11434)

## Задачи этой роли
- Проектирование новых модулей (`engine/`, `store/`, `types/`)
- Анализ зависимостей и потенциальных race conditions
- Рефакторинг: поиск нарушений принципов SOLID
- Code review с фокусом на архитектуру

## Как активировать в Cursor
Напиши в чате: `@architect` или открой файл из `src/engine/`

## Шаблон запроса к этой роли
```
Проанализируй модуль [название].
Найди: нарушения single responsibility, лишние зависимости, проблемы с типами.
Предложи рефакторинг с сохранением текущего API.
```

## Best practices для этой роли
- Всегда рисуй зависимости модулей в ASCII перед написанием кода
- Предлагай минимум 2 варианта архитектуры с trade-offs
- Помечай `// TODO:` всё, что отложено на потом
- Используй паттерн Command для обработки команд терминала
- Виртуальная FS строится как иммутабельное дерево (как Redux state)
```

---

### Роль 2: Генератор кода — `.cursor/rules/02_generator.mdc`

```markdown
---
description: Написание нового кода по спецификации. Активируй для реализации конкретных функций, компонентов, хуков.
globs: ["src/components/**", "src/engine/**/*.ts"]
---

# Роль: Генератор кода (qwen-generator)

## Модель
Используй: `qwen-generator:latest` через Ollama (localhost:11434)

## Задачи этой роли
- Реализация функций по готовой спецификации
- Написание хуков (`useTerminal`, `useOxygen`, `useLevelLoader`)
- Генерация TypeScript-типов из YAML-структуры
- Написание unit-тестов (Vitest)

## Как активировать
Напиши: `@generator` или используй Cursor Autocomplete в `src/`

## Шаблон запроса
```
Реализуй функцию [название] со следующим контрактом:
- Input: [типы входных данных]
- Output: [тип возвращаемого значения]
- Побочные эффекты: [есть/нет, какие]
- Граничные случаи: [список edge cases]
```

## Обязательные хуки проекта (реализовать в порядке приоритета)

### useTerminal.ts
```typescript
// Управляет xterm.js инстансом
// Методы: write(text), writeLine(text), clear(), onInput(cb)
// Эффект печатания: writeTyping(text, delayMs = 50)
```

### useLevelLoader.ts
```typescript
// Загружает YAML-файл уровня
// Возвращает: { level, isLoading, error }
// При загрузке инициализирует VirtualFS
// При win_condition → вызывает onLevelComplete()
```

### useOxygen.ts
```typescript
// Глобальный таймер кислорода
// Убывает: 1% каждые 30 секунд
// Методы: refill(amount), pause(), resume()
// При 0: dispatch('GAME_OVER')
```

### useHints.ts
```typescript
// Управляет системой подсказок
// Команда 'hint N' → показывает hints[N-1] из YAML
// Применяет штраф к score через gameStore
// Отслеживает: какие подсказки уже использованы
```

## Best practices
- Хуки возвращают только то, что нужно компоненту (не весь store)
- Чистые функции в `engine/` — без хуков, без React
- Каждый обработчик команды — отдельная функция, не switch-case монолит
```

---

### Роль 3: UI Designer — `.cursor/rules/03_ui_designer.mdc`

```markdown
---
description: CRT-визуал, анимации, CSS, компоненты интерфейса. Активируй для всего, что связано с внешним видом.
globs: ["src/components/**/*.tsx", "src/**/*.css", "tailwind.config.*"]
---

# Роль: UI Designer (ui-designer)

## Модель
Используй: `ui-designer:latest` через Ollama (localhost:11434)

## Задачи этой роли
- CRT-эффекты (scanlines, flicker, glow)
- Компонент терминала (Terminal.tsx)
- OxygenBar с анимацией
- ASCII-арт заставки миссий
- Адаптивная типографика для моноширинного текста

## Дизайн-токены проекта (использовать строго)

```css
:root {
  /* Цвета */
  --crt-green: #00ff41;
  --crt-amber: #ffb000;
  --crt-red: #ff3131;
  --crt-dim: #003b00;
  --bg-deep: #060606;
  --bg-terminal: #0a0f0a;

  /* Типографика */
  --font-terminal: 'VT323', 'Courier New', monospace;
  --font-size-base: 16px;
  --font-size-large: 20px;
  --line-height: 1.4;

  /* Свечение */
  --glow-green: 0 0 8px rgba(0, 255, 65, 0.8);
  --glow-amber: 0 0 8px rgba(255, 176, 0, 0.8);
  --glow-red: 0 0 12px rgba(255, 49, 49, 0.9);

  /* Анимации */
  --flicker-duration: 0.15s;
  --scanline-opacity: 0.03;
}
```

## CRT-эффекты (обязательный CSS)

```css
/* Scanlines */
.crt-overlay::before {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, var(--scanline-opacity)) 2px,
    rgba(0, 0, 0, var(--scanline-opacity)) 4px
  );
  pointer-events: none;
  z-index: 9999;
}

/* Мерцание */
@keyframes flicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.97; }
  94% { opacity: 1; }
  96% { opacity: 0.98; }
}

.terminal-screen {
  animation: flicker 8s infinite;
}

/* Виньетка */
.crt-overlay::after {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(0, 0, 0, 0.7) 100%
  );
  pointer-events: none;
  z-index: 9998;
}
```

## Компоненты и их визуальные требования

**OxygenBar:**
- Горизонтальная полоса вверху экрана, высота 4px
- Цвет: зелёный > 40%, янтарный 20–40%, красный < 20%
- Пульсация при < 20%: `animation: pulse 1s infinite`
- Текст рядом: `O2: 87%` моноширинным шрифтом

**MissionLog (боковая панель):**
- Правая панель, ширина 280px, отделена `border-left: 1px solid var(--crt-dim)`
- Команды с галочками: `[ ]` / `[✓]` — зелёным при выполнении
- Заголовок миссии мигает 2 секунды при загрузке нового уровня

**Terminal:**
- Занимает оставшееся пространство
- Курсор: мигающий блок `█`, не стандартный `_`
- Промпт: `RETRO-UX:~$` зелёным, команда пользователя — янтарным
- Ошибки — красным с `var(--glow-red)`

## Best practices
- Никаких transition/animation на элементах с большим z-index (лаги)
- `will-change: opacity` только для flicker-анимации
- Не использовать box-shadow на > 50 элементах одновременно
- prefers-reduced-motion: все анимации отключаются
```

---

### Роль 4: Ревьюер — `.cursor/rules/04_reviewer.mdc`

```markdown
---
description: Code review, поиск багов, проверка типов. Активируй перед коммитом или когда что-то работает странно.
globs: ["src/**/*.ts", "src/**/*.tsx"]
---

# Роль: Ревьюер (deepseek-r1:7b)

## Модель
Используй: `deepseek-r1:7b` — лучшая локальная модель для reasoning и поиска багов

## Когда активировать
- Перед каждым git commit
- Когда появляется неочевидный баг
- После написания нового модуля engine/

## Чеклист ревью (модель проходит по каждому пункту)

```
□ TypeScript: нет any, все типы явные
□ Memory leaks: useEffect имеет cleanup функцию
□ Race conditions: async операции защищены
□ Edge cases: что если YAML невалидный? уровень не загрузился?
□ Тесты: покрыты ли критические пути?
□ Производительность: нет ли ненужных re-renders
□ Безопасность: нет ли eval(), innerHTML без санитизации
```

## Шаблон запроса
```
Проведи review файла [путь].
Фокус: [баги / типы / производительность / архитектура].
Формат ответа: список проблем с указанием строки и предложением исправления.
```
```

---

### Роль 5: Контент-редактор уровней — `.cursor/rules/05_yaml_editor.mdc`

```markdown
---
description: Работа с YAML-файлами уровней. Активируй когда нужно создать или изменить уровень игры.
globs: ["src/levels/**/*.yaml"]
---

# Роль: Контент-редактор (qwen-generator / qwen2.5-coder:7b)

## Задачи
- Создание новых YAML-уровней по шаблону
- Написание нарративных текстов для `narrative:` секции
- Генерация виртуальной файловой системы уровня
- Балансировка сложности команд

## Обязательная структура YAML (валидация при загрузке)

Движок (`LevelLoader.ts`) проверяет наличие всех полей.
Если поле отсутствует — уровень не загрузится, в консоли ошибка.

```yaml
# ОБЯЗАТЕЛЬНЫЕ поля:
id: string                    # уникальный ID, формат: "level_NN"
title: string                 # заголовок миссии
location: string              # название локации
narrative: string[]           # массив строк (минимум 3)
filesystem: FileNode[]        # минимум 2 узла (/ и хотя бы 1 файл)
learning_objectives:          # минимум 1 команда
  - command: string
    description: string
    example: string
win_condition:
  type: string                # "command_executed" | "file_created" | "file_read"
  command: string
hints:                        # ровно 3 подсказки
  - level: 1
    text: string
  - level: 2
    text: string
  - level: 3
    text: string
reward:
  oxygen_bonus: number        # 0–50
  score: number
```

## Типы win_condition

```yaml
# Тип 1: команда выполнена в конкретной директории
win_condition:
  type: "command_executed"
  command: "./open_door.sh"
  working_directory: "/system_core"

# Тип 2: файл создан
win_condition:
  type: "file_created"
  path: "/output/sos_signal.txt"

# Тип 3: файл прочитан (для обучения cat/grep)
win_condition:
  type: "file_read"
  path: "/logs/secret_code.log"
  contains: "ACCESS_GRANTED"   # опционально: проверить содержимое вывода
```

## Быстрая генерация нового уровня
Напиши в Cursor Chat:
```
@yaml_editor Создай уровень level_06 для локации "Медицинский отсек".
Команды для изучения: awk, sed, wc.
Сюжет: найти в медлоге пациента с критическим состоянием.
Сложность: средняя.
```
```

---

## Часть 4: Конфигурация Ollama в Cursor

### Настройка в Cursor Settings

```
Cursor Settings → Models → Add Model

Для каждой модели:
┌─────────────────────────────────────────────────────┐
│ Model Name: qwen-generator                          │
│ API Base URL: http://localhost:11434/v1             │
│ API Key: ollama  (любая строка, Ollama не проверяет)│
│ Model ID: qwen-generator:latest                     │
└─────────────────────────────────────────────────────┘
```

Добавить все 3 основные роли:

| Имя в Cursor        | Model ID                  | Роль                    |
|---------------------|---------------------------|-------------------------|
| qwen-generator      | qwen-generator:latest     | Написание кода          |
| deepseek-analyst    | deepseek-analyst:latest   | Архитектура, анализ     |
| ui-designer         | ui-designer:latest        | UI, CSS, визуал         |
| deepseek-r1-local   | deepseek-r1:7b            | Code review, отладка    |
| qwen-coder          | qwen2.5-coder:7b          | Автодополнение          |
| kimi-k2-cloud       | kimi-k2.7-code:cloud      | Сложные задачи (облако) |

---

## Часть 5: Стратегия выбора модели

```
Задача                          → Модель
─────────────────────────────────────────────────────
Спроектировать новый модуль     → deepseek-analyst:latest
Написать функцию/хук по spec    → qwen-generator:latest
Сверстать компонент с CSS       → ui-designer:latest
Найти баг в сложной логике      → deepseek-r1:7b (думает дольше, точнее)
Написать/отредактировать YAML   → qwen-generator:latest
Автодополнение в редакторе      → qwen2.5-coder:7b (быстрый)
Архитектура > 3 модулей сразу   → kimi-k2.7-code:cloud (облако)
Embeddings для семантики        → nomic-embed-text:latest
```

### Когда использовать kimi-k2 (облако)
Только для задач, где локальных моделей не хватает:
- Рефакторинг > 5 файлов одновременно
- Написание сложных TypeScript generics
- Генерация всей системы уровней сразу

---

## Часть 6: `.cursorrules` в корне проекта (legacy формат, для совместимости)

Создай файл `.cursorrules` в корне проекта:

```
You are working on a Retro Terminal Linux Game built with React + TypeScript + xterm.js.

MODELS AVAILABLE (Ollama localhost:11434):
- Architecture & analysis: deepseek-analyst:latest
- Code generation: qwen-generator:latest
- UI/CSS/Visual: ui-designer:latest
- Code review & debugging: deepseek-r1:7b
- Fast autocomplete: qwen2.5-coder:7b

STRICT RULES:
1. Never mix business logic and UI components
2. All game text comes from YAML level files only
3. TypeScript strict mode, no `any`
4. Virtual filesystem is immutable — always return new state
5. Commands are parsed in CommandParser.ts, not in components

PROJECT STRUCTURE:
src/engine/    — pure TypeScript logic (no React)
src/components/ — React components only
src/levels/    — YAML level files (content only)
src/store/     — Zustand stores

When asked to create a new level, generate a complete YAML file
following the schema in src/types/level.types.ts.

Respond in Russian when explaining, use English in code and comments.
```

---

## Часть 7: Git хуки (pre-commit)

Создай файл `.husky/pre-commit` (установи husky: `npx husky init`):

```bash
#!/bin/sh
# Pre-commit hook: запускает проверки перед каждым коммитом

echo "🔍 Запуск проверок..."

# TypeScript
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript ошибки. Коммит отменён."
  exit 1
fi

# Линтер
npx eslint src/ --ext .ts,.tsx --max-warnings 0
if [ $? -ne 0 ]; then
  echo "❌ ESLint предупреждения. Коммит отменён."
  exit 1
fi

# Тесты
npx vitest run
if [ $? -ne 0 ]; then
  echo "❌ Тесты не прошли. Коммит отменён."
  exit 1
fi

# Валидация YAML-уровней
node scripts/validate-levels.js
if [ $? -ne 0 ]; then
  echo "❌ Невалидные YAML-уровни. Коммит отменён."
  exit 1
fi

echo "✅ Все проверки пройдены."
```

### Скрипт валидации YAML (`scripts/validate-levels.js`)

```javascript
// Запускается pre-commit хуком
// Проверяет все YAML в src/levels/ на соответствие схеме

import { readFileSync, readdirSync } from 'fs';
import { parse } from 'js-yaml';

const REQUIRED_FIELDS = [
  'id', 'title', 'location', 'narrative',
  'filesystem', 'learning_objectives',
  'win_condition', 'hints', 'reward'
];

const levelsDir = './src/levels';
const files = readdirSync(levelsDir).filter(f => f.endsWith('.yaml'));
let hasErrors = false;

for (const file of files) {
  const content = readFileSync(`${levelsDir}/${file}`, 'utf8');
  const level = parse(content);

  for (const field of REQUIRED_FIELDS) {
    if (!level[field]) {
      console.error(`❌ ${file}: отсутствует поле "${field}"`);
      hasErrors = true;
    }
  }

  if (level.hints && level.hints.length !== 3) {
    console.error(`❌ ${file}: hints должен содержать ровно 3 подсказки`);
    hasErrors = true;
  }

  if (!hasErrors) console.log(`✅ ${file}`);
}

if (hasErrors) process.exit(1);
```

---

## Часть 8: Первые команды для старта в Cursor

```bash
# 1. Создать проект
npm create vite@latest retro-terminal -- --template react-ts
cd retro-terminal

# 2. Установить зависимости
npm install xterm @xterm/addon-fit zustand js-yaml
npm install -D tailwindcss @types/js-yaml vitest husky

# 3. Инициализировать Tailwind
npx tailwindcss init -p

# 4. Инициализировать Husky
npx husky init

# 5. Создать структуру папок
mkdir -p src/engine src/components src/store src/levels src/types scripts
mkdir -p .cursor/rules

# 6. Проверить что Ollama запущена
curl http://localhost:11434/api/tags
# Должны появиться все твои модели

# 7. Открыть Cursor и выбрать модель
# Settings → Models → выбрать qwen-generator как default
```

---

## Часть 9: Рекомендуемые дополнительные модели

Если понадобятся задачи, которые текущий набор не покрывает:

| Задача                              | Скачать                                    |
|-------------------------------------|--------------------------------------------|
| Генерация звуков / аудио-описания   | `ollama pull llava:13b` (мультимодальная)  |
| Очень быстрое автодополнение        | `ollama pull codellama:7b`                 |
| Русскоязычный нарратив (лучше)      | уже есть `t-tech/T-pro-it-2.0` — использовать для текстов игры |
| Документация / README               | `qwen-generator` справится               |

**T-pro-it-2.0 (19GB)** — твоя лучшая модель для русскоязычного контента.
Используй её для написания нарративных текстов в YAML (`narrative:` секция).
В Cursor добавь как `t-pro-russian` и вызывай через `@yaml_editor` для текстов.