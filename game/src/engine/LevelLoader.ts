import yaml from 'js-yaml';
import type {
  FileNodeYaml,
  LevelDefinition,
  LoadedLevel,
  RemoteFilesystem,
  VirtualNode,
} from '../types/level.types';
import { normalizeNodes } from './FileSystem';

const REQUIRED_FIELDS: (keyof LevelDefinition)[] = [
  'id',
  'title',
  'location',
  'narrative',
  'filesystem',
  'learning_objectives',
  'win_condition',
  'hints',
  'reward',
];

/** Converts YAML file nodes to VirtualNode array */
export const yamlNodesToVirtual = (nodes: FileNodeYaml[]): VirtualNode[] =>
  normalizeNodes(
    nodes.map((n) => ({
      path: n.path,
      type: n.type,
      content: n.content,
      permissions: n.permissions,
      isArchive: n.is_archive,
      archiveContents: n.archive_contents,
    })),
  );

/** Parses raw YAML string into LevelDefinition with validation */
export const parseLevelYaml = (raw: string): LevelDefinition => {
  const parsed = yaml.load(raw) as LevelDefinition & {
    remote_filesystem?: RemoteFilesystem | VirtualNode[];
  };

  for (const field of REQUIRED_FIELDS) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(`Level is missing required field: ${field}`);
    }
  }

  if (parsed.hints.length !== 3) {
    throw new Error('Level hints must contain exactly 3 entries');
  }

  return parsed;
};

/** Extracts remote FS nodes from level definition */
export const extractRemoteNodes = (level: LevelDefinition): VirtualNode[] => {
  const remote = level.remote_filesystem;
  if (!remote) return [];
  if ('filesystem' in remote && Array.isArray(remote.filesystem)) {
    return yamlNodesToVirtual(remote.filesystem);
  }
  if (Array.isArray(remote)) {
    return yamlNodesToVirtual(remote as unknown as FileNodeYaml[]);
  }
  return [];
};

/** Gets SSH config from level */
export const getRemoteConfig = (
  level: LevelDefinition,
): { host: string; user: string } | null => {
  const remote = level.remote_filesystem;
  if (!remote || Array.isArray(remote)) return null;
  if ('host' in remote && 'user' in remote) {
    return { host: remote.host, user: remote.user };
  }
  return null;
};

/** Loads and prepares a level for gameplay */
export const loadLevel = (raw: string): LoadedLevel => {
  const definition = parseLevelYaml(raw);
  const localNodes = yamlNodesToVirtual(definition.filesystem);
  const remoteNodes = extractRemoteNodes(definition);
  const oxygenEnabled = definition.id !== 'level_00';

  return {
    definition,
    localNodes,
    remoteNodes,
    oxygenEnabled,
  };
};
