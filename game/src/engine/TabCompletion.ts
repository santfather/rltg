import type { CommandContext } from './CommandParser';
import {
  getActiveFS,
  getNode,
  ls,
  resolvePath,
} from './FileSystem';

export interface TabCompletionResult {
  newInput: string;
  listLines: string[];
  bell: boolean;
}

const PATH_COMMANDS = new Set(['ls', 'cd', 'cat', 'chmod']);

function commonPrefix(values: string[]): string {
  if (values.length === 0) return '';
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}

function listDirEntries(ctx: CommandContext, dirPath: string): string[] {
  const fs = getActiveFS(ctx.localFS, ctx.remoteFS, ctx.fsContext);
  const result = ls(fs, dirPath === fs.cwd ? undefined : dirPath);
  if (!result.ok) return [];
  return result.value.map((entry) => {
    if (entry.includes(' ')) return entry;
    const fullPath =
      dirPath === '/'
        ? `/${entry}`
        : dirPath === fs.cwd
          ? resolvePath(fs.cwd, entry)
          : `${dirPath}/${entry}`;
    const node = getNode(fs.nodes, fullPath);
    return node?.type === 'dir' ? `${entry}/` : entry;
  });
}

/** Completes path arguments for ls/cd/cat/chmod and ./ scripts */
export function completeTabInput(
  input: string,
  ctx: CommandContext,
  showAllMatches: boolean,
): TabCompletionResult {
  const trimmed = input.replace(/\s+$/, '');
  const endsWithSpace = input.endsWith(' ') || input.endsWith('\t');
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return { newInput: input, listLines: [], bell: true };
  }

  const cmd = tokens[0].toLowerCase();
  const isScript = tokens[0].startsWith('./');

  if (!PATH_COMMANDS.has(cmd) && !isScript) {
    return { newInput: input, listLines: [], bell: true };
  }

  const fs = getActiveFS(ctx.localFS, ctx.remoteFS, ctx.fsContext);
  let dirPath: string;
  let prefixInDir: string;
  let partial = '';

  if (isScript) {
    prefixInDir = tokens[0].slice(2);
    dirPath = fs.cwd;
  } else if (endsWithSpace || tokens.length === 1) {
    dirPath = fs.cwd;
    prefixInDir = '';
  } else {
    partial = tokens[tokens.length - 1] ?? '';
    if (partial.includes('/')) {
      const idx = partial.lastIndexOf('/');
      const dirPart = partial.slice(0, idx + 1);
      prefixInDir = partial.slice(idx + 1);
      dirPath = resolvePath(fs.cwd, dirPart);
    } else {
      dirPath = fs.cwd;
      prefixInDir = partial;
    }
  }

  const entries = listDirEntries(ctx, dirPath);
  const matches = entries.filter((entry) => entry.startsWith(prefixInDir));

  if (matches.length === 0) {
    return { newInput: input, listLines: [], bell: true };
  }

  if (matches.length === 1 && !showAllMatches) {
    const completed = matches[0];
    let newInput: string;
    if (isScript) {
      newInput = `./${completed}`;
    } else if (endsWithSpace || tokens.length === 1) {
      newInput = `${tokens[0]} ${completed}`;
    } else {
      const dirPart = partial.includes('/') ? partial.slice(0, partial.lastIndexOf('/') + 1) : '';
      newInput = [...tokens.slice(0, -1), `${dirPart}${completed}`].join(' ');
    }
    return { newInput, listLines: [], bell: false };
  }

  if (showAllMatches) {
    return { newInput: input, listLines: matches, bell: false };
  }

  const shared = commonPrefix(matches);
  if (shared.length > prefixInDir.length) {
    let newInput: string;
    if (isScript) {
      newInput = `./${shared}`;
    } else if (endsWithSpace || tokens.length === 1) {
      newInput = `${tokens[0]} ${shared}`;
    } else {
      const dirPart = partial.includes('/') ? partial.slice(0, partial.lastIndexOf('/') + 1) : '';
      newInput = [...tokens.slice(0, -1), `${dirPart}${shared}`].join(' ');
    }
    return { newInput, listLines: [], bell: false };
  }

  return { newInput: input, listLines: matches, bell: false };
}
