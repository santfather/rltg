import type { ArchiveEntry, VirtualNode } from '../types/level.types';

export type FSResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface FSState {
  nodes: VirtualNode[];
  cwd: string;
}

/** Normalizes YAML nodes into runtime VirtualNode array */
export const normalizeNodes = (raw: VirtualNode[]): VirtualNode[] =>
  raw.map((node) => ({
    path: node.path,
    type: node.type,
    content: node.content,
    permissions: node.permissions,
    isArchive: node.isArchive ?? (node as { is_archive?: boolean }).is_archive,
    archiveContents:
      node.archiveContents ??
      (node as { archive_contents?: ArchiveEntry[] }).archive_contents,
  }));

/** Creates initial FS state from level nodes */
export const createFSState = (nodes: VirtualNode[], cwd = '/'): FSState => ({
  nodes: normalizeNodes(nodes),
  cwd: normalizePath(cwd),
});

/** Collapses duplicate slashes and resolves `.` segments */
export function normalizePath(path: string): string {
  if (!path || path === '.') return '/';
  const absolute = path.startsWith('/') ? path : null;
  const parts = path.split('/').filter((p) => p && p !== '.');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  const joined = '/' + stack.join('/');
  if (joined === '//') return '/';
  return absolute !== null ? joined : joined;
}

/** Resolves a path relative to cwd */
export function resolvePath(cwd: string, target: string): string {
  if (target.startsWith('/')) return normalizePath(target);
  if (target === '~' || target.startsWith('~/')) {
    return normalizePath(target.replace(/^~/, ''));
  }
  const base = cwd === '/' ? '' : cwd;
  return normalizePath(`${base}/${target}`);
}

export function getNode(nodes: VirtualNode[], path: string): VirtualNode | undefined {
  const normalized = normalizePath(path);
  return nodes.find((n) => n.path === normalized);
}

export function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === '/') return '/';
  const idx = normalized.lastIndexOf('/');
  return idx <= 0 ? '/' : normalized.slice(0, idx);
}

export function getBaseName(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === '/') return '/';
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

/** Parses permission string to 3-digit octal (user/group/other) */
export function parsePermissions(raw: string | undefined, type: 'file' | 'dir'): string {
  if (!raw) return type === 'dir' ? '755' : '644';
  if (/^[0-7]{3}$/.test(raw)) return raw;
  if (raw === '+x') return type === 'dir' ? '755' : '755';
  return type === 'dir' ? '755' : '644';
}

/** Converts octal permissions to ls -la style string */
export function formatPermissions(octal: string, type: 'file' | 'dir'): string {
  const chars = ['---', '---', '---'];
  for (let i = 0; i < 3; i++) {
    const digit = parseInt(octal[i] ?? '0', 10);
    const idx = i * 3;
    if (digit & 4) chars[idx] = 'r' + chars[idx].slice(1);
    if (digit & 2) chars[idx] = chars[idx][0] + 'w' + chars[idx][2];
    if (digit & 1) chars[idx] = chars[idx].slice(0, 2) + 'x';
  }
  const body = chars.join('');
  return (type === 'dir' ? 'd' : '-') + body;
}

export function canRead(octal: string): boolean {
  return parseInt(octal[0] ?? '0', 10) >= 4 || parseInt(octal[2] ?? '0', 10) >= 4;
}

export function canExecute(node: VirtualNode): boolean {
  const octal = parsePermissions(node.permissions, node.type);
  const userExec = (parseInt(octal[0] ?? '0', 10) & 1) === 1;
  const otherExec = (parseInt(octal[2] ?? '0', 10) & 1) === 1;
  return userExec || otherExec;
}

export function canWrite(octal: string): boolean {
  return (parseInt(octal[0] ?? '0', 10) & 2) === 2;
}

/** Lists directory entries (names only or detailed) */
export function ls(
  state: FSState,
  targetPath?: string,
  flags: { long?: boolean; all?: boolean } = {},
): FSResult<string[]> {
  const dirPath = targetPath ? resolvePath(state.cwd, targetPath) : state.cwd;
  const dirNode = getNode(state.nodes, dirPath);
  if (!dirNode) return { ok: false, error: `ls: cannot access '${dirPath}': No such file or directory` };
  if (dirNode.type !== 'dir') return { ok: false, error: `ls: ${dirPath}: Not a directory` };

  const entries = state.nodes
    .filter((n) => {
      if (n.path === dirPath) return false;
      const parent = getParentPath(n.path);
      return parent === dirPath;
    })
    .filter((n) => flags.all || !getBaseName(n.path).startsWith('.'))
    .sort((a, b) => getBaseName(a.path).localeCompare(getBaseName(b.path)));

  if (!flags.long && !flags.all) {
    return { ok: true, value: entries.map((e) => getBaseName(e.path)) };
  }

  const lines = entries.map((entry) => {
    const octal = parsePermissions(entry.permissions, entry.type);
    const permStr = formatPermissions(octal, entry.type);
    const size = entry.content?.length ?? 0;
    return `${permStr} 1 root root ${String(size).padStart(4)} Mar 14 03:22 ${getBaseName(entry.path)}`;
  });
  return { ok: true, value: lines };
}

/** Changes current working directory */
export function cd(state: FSState, target: string): FSResult<FSState> {
  if (!target || target === '~') {
    return { ok: true, value: { ...state, cwd: '/' } };
  }
  const newPath = resolvePath(state.cwd, target);
  const node = getNode(state.nodes, newPath);
  if (!node) return { ok: false, error: `cd: ${target}: No such file or directory` };
  if (node.type !== 'dir') return { ok: false, error: `cd: ${target}: Not a directory` };
  return { ok: true, value: { ...state, cwd: newPath } };
}

/** Reads file content */
export function cat(state: FSState, target: string): FSResult<{ content: string; path: string }> {
  const filePath = resolvePath(state.cwd, target);
  const node = getNode(state.nodes, filePath);
  if (!node) return { ok: false, error: `cat: ${target}: No such file or directory` };
  if (node.type !== 'file') return { ok: false, error: `cat: ${target}: Is a directory` };
  const octal = parsePermissions(node.permissions, node.type);
  if (!canRead(octal)) return { ok: false, error: `cat: ${target}: Permission denied` };
  return { ok: true, value: { content: node.content ?? '', path: filePath } };
}

/** Applies chmod mode to a file */
export function chmod(state: FSState, mode: string, target: string): FSResult<FSState> {
  const filePath = resolvePath(state.cwd, target);
  const node = getNode(state.nodes, filePath);
  if (!node) return { ok: false, error: `chmod: cannot access '${target}': No such file or directory` };

  let newOctal = parsePermissions(node.permissions, node.type);

  if (mode.startsWith('+') || mode.startsWith('-')) {
    const add = mode.startsWith('+');
    const symbols = mode.slice(1);
    const digits = newOctal.split('').map((d) => parseInt(d, 10));
    for (let i = 0; i < 3; i++) {
      if (symbols.includes('x')) digits[i] = add ? digits[i] | 1 : digits[i] & ~1;
      if (symbols.includes('r')) digits[i] = add ? digits[i] | 4 : digits[i] & ~4;
      if (symbols.includes('w')) digits[i] = add ? digits[i] | 2 : digits[i] & ~2;
    }
    newOctal = digits.map((d) => String(d)).join('');
  } else if (/^[0-7]{3,4}$/.test(mode)) {
    newOctal = mode.slice(-3);
  } else {
    return { ok: false, error: `chmod: invalid mode: '${mode}'` };
  }

  const nodes = state.nodes.map((n) =>
    n.path === filePath ? { ...n, permissions: newOctal } : n,
  );
  return { ok: true, value: { ...state, nodes } };
}

/** Returns script output lines */
export function executeScript(node: VirtualNode): FSResult<string[]> {
  if (node.type !== 'file') return { ok: false, error: 'Not a file' };
  if (!canExecute(node)) return { ok: false, error: `bash: Permission denied` };
  const lines = (node.content ?? '').split('\n').filter((line) => !line.startsWith('#!'));
  return { ok: true, value: lines };
}

/** Creates directory (optionally with parents) */
export function mkdir(state: FSState, target: string, recursive = false): FSResult<FSState> {
  const dirPath = resolvePath(state.cwd, target);
  if (getNode(state.nodes, dirPath)) {
    return { ok: false, error: `mkdir: cannot create directory '${target}': File exists` };
  }

  if (!recursive) {
    const parent = getParentPath(dirPath);
    if (parent !== '/' && !getNode(state.nodes, parent)) {
      return { ok: false, error: `mkdir: cannot create directory '${target}': No such file or directory` };
    }
  } else {
    const parts = dirPath.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current = normalizePath(current + '/' + part);
      if (!getNode(state.nodes, current)) {
        state = {
          ...state,
          nodes: [...state.nodes, { path: current, type: 'dir', permissions: '755' }],
        };
      }
    }
    return { ok: true, value: state };
  }

  return {
    ok: true,
    value: {
      ...state,
      nodes: [...state.nodes, { path: dirPath, type: 'dir', permissions: '755' }],
    },
  };
}

/** Copies a file */
export function cp(state: FSState, src: string, dst: string): FSResult<FSState> {
  const srcPath = resolvePath(state.cwd, src);
  const dstPath = resolvePath(state.cwd, dst);
  const srcNode = getNode(state.nodes, srcPath);
  if (!srcNode) return { ok: false, error: `cp: cannot stat '${src}': No such file or directory` };
  if (srcNode.type !== 'file') return { ok: false, error: `cp: -r not implemented for directories` };
  if (getNode(state.nodes, dstPath)) {
    return { ok: false, error: `cp: cannot create regular file '${dst}': File exists` };
  }
  const newNode: VirtualNode = {
    ...srcNode,
    path: dstPath,
    permissions: srcNode.permissions ?? '644',
  };
  return { ok: true, value: { ...state, nodes: [...state.nodes, newNode] } };
}

/** Moves or renames a file */
export function mv(state: FSState, src: string, dst: string): FSResult<FSState> {
  const srcPath = resolvePath(state.cwd, src);
  const dstPath = resolvePath(state.cwd, dst);
  const srcNode = getNode(state.nodes, srcPath);
  if (!srcNode) return { ok: false, error: `mv: cannot stat '${src}': No such file or directory` };
  if (getNode(state.nodes, dstPath)) {
    return { ok: false, error: `mv: cannot move '${src}' to '${dst}': File exists` };
  }
  const nodes = state.nodes
    .filter((n) => n.path !== srcPath)
    .concat([{ ...srcNode, path: dstPath }]);
  let cwd = state.cwd;
  if (cwd === srcPath) cwd = dstPath;
  return { ok: true, value: { ...state, nodes, cwd } };
}

/** Extracts archive contents into target directory */
export function extractArchive(
  state: FSState,
  archivePath: string,
  targetDir?: string,
): FSResult<FSState> {
  const resolved = resolvePath(state.cwd, archivePath);
  const node = getNode(state.nodes, resolved);
  if (!node) return { ok: false, error: `tar: ${archivePath}: Cannot open: No such file or directory` };
  if (!node.isArchive || !node.archiveContents?.length) {
    return { ok: false, error: `tar: ${archivePath}: Not a valid archive` };
  }

  const dest = targetDir ? resolvePath(state.cwd, targetDir) : state.cwd;
  const destNode = getNode(state.nodes, dest);
  if (!destNode || destNode.type !== 'dir') {
    return { ok: false, error: `tar: ${targetDir ?? dest}: Cannot open: Not a directory` };
  }

  let newState = state;
  for (const entry of node.archiveContents) {
    const entryPath = dest === '/' ? `/${entry.path}` : `${dest}/${entry.path}`;
    const parent = getParentPath(entryPath);
    if (parent !== '/' && !getNode(newState.nodes, parent)) {
      const mkdirResult = mkdir({ ...newState, cwd: '/' }, parent, true);
      if (!mkdirResult.ok) return mkdirResult;
      newState = mkdirResult.value;
    }
    if (getNode(newState.nodes, entryPath)) continue;
    const isScript = entry.path.endsWith('.sh');
    newState = {
      ...newState,
      nodes: [
        ...newState.nodes,
        {
          path: entryPath,
          type: 'file' as const,
          content: entry.content,
          permissions: isScript ? '644' : '644',
        },
      ],
    };
  }
  return { ok: true, value: newState };
}

/** Lists archive contents without extracting */
export function listArchive(state: FSState, archivePath: string): FSResult<string[]> {
  const resolved = resolvePath(state.cwd, archivePath);
  const node = getNode(state.nodes, resolved);
  if (!node) return { ok: false, error: `tar: ${archivePath}: Cannot open: No such file or directory` };
  if (!node.archiveContents?.length) {
    return { ok: false, error: `tar: ${archivePath}: Not a valid archive` };
  }
  return { ok: true, value: node.archiveContents.map((e) => e.path) };
}

/** Greps lines from content */
export function grepLines(
  content: string,
  pattern: string,
  caseInsensitive = false,
): string[] {
  const flags = caseInsensitive ? 'i' : '';
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    return [];
  }
  return content
    .split('\n')
    .map((line, i) => ({ line, num: i + 1 }))
    .filter(({ line }) => regex.test(line))
    .map(({ line, num }) => `${num}:${line}`);
}

/** Recursive grep across directory tree */
export function grepRecursive(
  state: FSState,
  pattern: string,
  dirPath: string,
  caseInsensitive = false,
): string[] {
  const resolved = resolvePath(state.cwd, dirPath);
  const results: string[] = [];
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, caseInsensitive ? 'i' : '');
  } catch {
    return [];
  }
  for (const node of state.nodes) {
    if (node.type !== 'file' || !node.content) continue;
    const inTree =
      resolved === '/'
        ? node.path !== '/'
        : node.path === resolved || node.path.startsWith(resolved + '/');
    if (!inTree) continue;
    for (const line of node.content.split('\n')) {
      if (regex.test(line)) results.push(`${node.path}: ${line}`);
    }
  }
  return results.sort();
}

/** Finds paths matching glob pattern and optional type filter */
export function find(
  state: FSState,
  startDir: string,
  namePattern?: string,
  typeFilter?: 'f' | 'd',
): string[] {
  const root = resolvePath(state.cwd, startDir);
  const results: string[] = [];

  const globMatch = (name: string, pattern: string): boolean => {
    const regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regexStr}$`).test(name);
  };

  for (const node of state.nodes) {
    if (root !== '/' && node.path !== root && !node.path.startsWith(root + '/')) continue;
    if (typeFilter === 'f' && node.type !== 'file') continue;
    if (typeFilter === 'd' && node.type !== 'dir') continue;
    const base = getBaseName(node.path);
    if (namePattern && !globMatch(base, namePattern)) continue;
    if (node.path !== root) results.push(node.path);
  }
  return results.sort();
}

/** Gets active FS state based on context */
export function getActiveFS(
  local: FSState,
  remote: FSState,
  context: 'local' | 'remote',
): FSState {
  return context === 'remote' ? remote : local;
}

/** Writes updated FS back to the correct branch */
export function setActiveFS(
  local: FSState,
  remote: FSState,
  context: 'local' | 'remote',
  updated: FSState,
): { local: FSState; remote: FSState } {
  return context === 'remote'
    ? { local, remote: updated }
    : { local: updated, remote };
}
