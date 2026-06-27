import { loadLevel } from '../engine/LevelLoader';
import type { LevelId, LoadedLevel } from '../types/level.types';
import { getNextLevelId as getNextLevelIdFromOrder } from '../types/level.types';

const rawYamls = import.meta.glob<string>('./level_*.yaml', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const levelCache = new Map<LevelId, LoadedLevel>();

function resolveRawYaml(id: LevelId): string {
  const entry = Object.entries(rawYamls).find(([path]) => {
    const file = path.split('/').pop() ?? path;
    return file.startsWith(`${id}_`) || file === `${id}.yaml`;
  });
  if (!entry) {
    throw new LevelLoadError(id, `No YAML file matching "${id}" in levels/`);
  }
  return entry[1];
}

export class LevelLoadError extends Error {
  constructor(
    public readonly levelId: LevelId,
    message: string,
  ) {
    super(`Failed to load level "${levelId}": ${message}`);
    this.name = 'LevelLoadError';
  }
}

/** Loads and caches a level by id; throws LevelLoadError on invalid YAML */
export const getLevelById = (id: LevelId): LoadedLevel => {
  const cached = levelCache.get(id);
  if (cached) return cached;

  let raw: string;
  try {
    raw = resolveRawYaml(id);
  } catch (e) {
    if (e instanceof LevelLoadError) throw e;
    throw new LevelLoadError(id, e instanceof Error ? e.message : 'Unknown resolve error');
  }

  try {
    const loaded = loadLevel(raw);
    levelCache.set(id, loaded);
    return loaded;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown parse error';
    throw new LevelLoadError(id, message);
  }
};

/** Safe loader returning error message instead of throwing */
export const tryGetLevelById = (
  id: LevelId,
): { ok: true; level: LoadedLevel } | { ok: false; error: string } => {
  try {
    return { ok: true, level: getLevelById(id) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to load level',
    };
  }
};

export const getNextLevelId = (current: LevelId): LevelId | null =>
  getNextLevelIdFromOrder(current);

/** All unique learning objective commands across every level */
export function getAllLearningCommands(): string[] {
  const commands = new Set<string>();
  for (const id of Object.keys(rawYamls)) {
    const file = id.split('/').pop() ?? id;
    const levelId = file.match(/^(level_\d+)/)?.[1] as LevelId | undefined;
    if (!levelId) continue;
    const result = tryGetLevelById(levelId);
    if (result.ok) {
      for (const obj of result.level.definition.learning_objectives) {
        commands.add(obj.command);
      }
    }
  }
  return [...commands].sort();
}
