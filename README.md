# RLTG — Retro Linux Terminal Game

![CI](https://github.com/santfather/rltg/actions/workflows/ci.yml/badge.svg)

**NOSTROMO-8 // RETRO-UX v3.11** — браузерная обучающая игра в стиле CRT-терминала. Выживите на борту повреждённого корабля, осваивая реальные команды Linux через псевдо-shell.

Репозиторий: [github.com/santfather/rltg](https://github.com/santfather/rltg)

---

## Быстрый старт

```bash
git clone git@github.com:santfather/rltg.git
cd rltg/game
npm ci
npm run dev
```

Откройте [http://localhost:5173](http://localhost:5173) → главное меню → **[N] НОВАЯ ИГРА**.

### Требования

- Node.js 20+
- Desktop-браузер + клавиатура (мобильные не поддерживаются)

---

## Что внутри

| Раздел | Описание |
|--------|----------|
| `game/` | React + TypeScript + Vite — весь код игры |
| `game/src/levels/` | 10 YAML-миссий (`level_00` … `level_09`) |
| `game/src/engine/` | Парсер команд, виртуальная FS, win-conditions |
| `docs/` | Сценарий, UI-гайд, Cursor-промпты для разработки |
| `main_readme.md` | Полная техническая документация для разработчиков и ИИ-агентов |

---

## Игровой цикл

```
Главное меню → Загрузка миссии → Катсцена → Терминал (gameplay)
  → Победа → Следующая миссия … → Финальный эпилог
  → O₂ = 0 → Game Over
```

**10 миссий:** от tutorial (`ls`, `cd`, `cat`) до финальной сети (`ssh`, `ping`, relay).  
**Механики:** таймер кислорода, подсказки `hint 1/2/3`, карта корабля `[M]`, звук Web Audio API, сохранение в `localStorage`.

---

## Команды разработки

Из каталога `game/`:

```bash
npm run dev              # dev-сервер
npm run build            # production-сборка
npm test                 # unit-тесты (Vitest)
npm run test:coverage    # coverage engine/
npm run test:e2e         # Playwright smoke-тests
npm run typecheck        # TypeScript
npm run lint             # ESLint
npm run validate:levels  # валидация YAML-уровней
```

CI (GitHub Actions): typecheck → lint → tests → coverage → E2E → validate levels → build.

---

## Документация

| Файл | Назначение |
|------|------------|
| [main_readme.md](./main_readme.md) | Архитектура, стек, правила для агентов |
| [docs/scenario.md](./docs/scenario.md) | Сюжет, геймплей, описание миссий |
| [docs/UI_designer.md](./docs/UI_designer.md) | CRT-дизайн, CSS-токены, wireframes |
| [docs/rules.md](./docs/rules.md) | Cursor Rules, роли, git-хуки |
| [docs/todo_list.md](./docs/todo_list.md) | Roadmap и чеклисты |
| [docs/audit_review.md](./docs/audit_review.md) | Аудит состояния проекта |

---

## Стек

React 19 · TypeScript (strict) · Vite 8 · xterm.js · Zustand · js-yaml · Tailwind CSS v4 · Vitest · Playwright

---

## Лицензия

Private / all rights reserved (уточните при публикации).

*Последнее обновление: 27.06.2026 — Sprint v3 (меню, эпилог, карта корабля, звук, E2E).*
