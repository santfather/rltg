# Документация RLTG

Индекс документов проекта **Retro Linux Terminal Game (NOSTROMO-8)**.

## Для игроков и обзора

| Документ | Содержание |
|----------|------------|
| [../README.md](../README.md) | Быстрый старт, команды, обзор |
| [scenario.md](./scenario.md) | Сюжет, 10 миссий, нарратив, примеры YAML |

## Для разработки

| Документ | Содержание |
|----------|------------|
| [../main_readme.md](../main_readme.md) | **Главный техдок** — архитектура, стек, anti-patterns |
| [UI_designer.md](./UI_designer.md) | CRT-токены, экраны, wireframes |
| [rules.md](./rules.md) | Cursor Rules, роли агентов |
| [todo_list.md](./todo_list.md) | Roadmap и задачи |
| [audit_review.md](./audit_review.md) | Аудит кодовой базы (27.06.2026) |

## Cursor-промпты (история спринтов)

| Документ | Спринт |
|----------|--------|
| [cursor_prompt_scenes_01_to_05.md](./cursor_prompt_scenes_01_to_05.md) | Катсцены, уровни 01–05 |
| [cursor_prompt_sprint_v2.md](./cursor_prompt_sprint_v2.md) | Sprint v2 |
| [cursor_prompt_sprint_v3.md](./cursor_prompt_sprint_v3.md) | Sprint v3 — финализация UX |
| [cursor_prompt_section_plan.md](./cursor_prompt_section_plan.md) | ASCII-план отсека |
| [cursor_prompt_robot_*.md](./cursor_prompt_robot_widget.md) | R.U.X robot widget |

## Ключевые пути в коде

```
game/src/types/level.types.ts   — схема уровня (source of truth)
game/src/levels/*.yaml          — контент миссий
game/src/engine/                — игровая логика (без React)
game/src/store/gameStore.ts     — Zustand + persist
```
