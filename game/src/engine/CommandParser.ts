import type { LevelDefinition, VirtualNode } from '../types/level.types';
import { useGameStore } from '../store/gameStore';
import {
  formatDf,
  formatIpA,
  formatLsof,
  formatNetstat,
  formatPing,
  formatPsTable,
  formatTailF,
  handleSystemctl,
  killProcess,
} from './extendedCommands';
import {
  canExecute,
  cat,
  cd,
  chmod,
  cp,
  createFSState,
  executeScript,
  extractArchive,
  find,
  getActiveFS,
  getNode,
  grepLines,
  grepRecursive,
  listArchive,
  ls,
  mkdir,
  mv,
  resolvePath,
  setActiveFS,
  type FSState,
} from './FileSystem';
import { getRemoteConfig } from './LevelLoader';
import { formatHintList, getHintText } from './HintSystem';
import { parseCommand, type ParsedCommand } from './WinConditionChecker';

export type OutputKind = 'input' | 'output' | 'error' | 'system' | 'success';

export interface OutputLine {
  text: string;
  kind: OutputKind;
}

export interface SshPending {
  host: string;
  user: string;
  expectedPassword: string;
}

export interface SudoPending {
  effectiveCmd: string;
  expectedPassword: string;
}

export interface CommandContext {
  localFS: FSState;
  remoteFS: FSState;
  fsContext: 'local' | 'remote';
  level: LevelDefinition;
  sshPending: SshPending | null;
  sudoPending: SudoPending | null;
  /** One-shot privilege after successful sudo password */
  sudoElevated: boolean;
  sshConnectedHost: string | null;
  lastCatPath: string | null;
  /** Combined stdout of the last cat/grep command (for win contains checks) */
  lastCommandOutput: string | null;
  usedHints: number[];
}

export interface CommandResult {
  lines: OutputLine[];
  context: CommandContext;
  clearScreen: boolean;
  executedCommand: ParsedCommand | null;
}

const BLOCKED_PATTERNS = [
  'rm -rf /',
  'rm -rf *',
  'mkfs',
  'dd if=/dev/zero',
  'shutdown',
  'reboot',
];

const BLOCKED_MSG =
  'NOSTROMO-8: Команда заблокирована системой безопасности корабля.';

const HELP_LINES = [
  'Available commands:',
  '  ls [path] [-la]   cd [path]   cat <file>   pwd   clear',
  '  chmod <mode> <file>   ./script.sh',
  '  grep [-r|-i] <pattern> <path>   find <dir> [-name pat] [-type f|d]',
  '  tar -tzf|-xzf <archive> [-C dir]   mkdir [-p] <dir>   cp/mv <src> <dst>',
  '  ps aux   netstat -tlnp   lsof -i :PORT   kill -9 PID',
  '  df -h   tail -f <file>   systemctl start|status <svc>',
  '  ip a   ping <host>   ssh user@host   exit   curl <url>',
  '  sudo <cmd>   help   hint [1|2|3]',
];

const SUDO_REQUIRED_CMDS = new Set([
  'kill',
  'netstat',
  'lsof',
  'systemctl',
]);

/** Creates initial command context for a level */
export const createCommandContext = (
  level: LevelDefinition,
  localNodes: VirtualNode[],
  remoteNodes: VirtualNode[],
): CommandContext => ({
  localFS: createFSState(localNodes, '/'),
  remoteFS: createFSState(remoteNodes, '/'),
  fsContext: 'local',
  level,
  sshPending: null,
  sudoPending: null,
  sudoElevated: false,
  sshConnectedHost: null,
  lastCatPath: null,
  lastCommandOutput: null,
  usedHints: [],
});

function activeFS(ctx: CommandContext): FSState {
  return getActiveFS(ctx.localFS, ctx.remoteFS, ctx.fsContext);
}

function updateFS(ctx: CommandContext, fs: FSState): CommandContext {
  const updated = setActiveFS(ctx.localFS, ctx.remoteFS, ctx.fsContext, fs);
  return { ...ctx, localFS: updated.local, remoteFS: updated.remote };
}

function out(text: string, kind: OutputKind = 'output'): OutputLine {
  return { text, kind };
}

function err(text: string): OutputLine {
  return { text, kind: 'error' };
}

function isBlocked(raw: string): boolean {
  const lower = raw.toLowerCase();
  return BLOCKED_PATTERNS.some((p) => lower.includes(p));
}

function readSshPassword(nodes: VirtualNode[]): string | null {
  const creds = getNode(nodes, '/secrets/ssh_credentials.txt');
  if (!creds?.content) return null;
  const match = creds.content.match(/PASS:\s*(\S+)/);
  return match?.[1] ?? null;
}

function handleSudoPassword(ctx: CommandContext, password: string): CommandResult {
  const pending = ctx.sudoPending;
  if (!pending) {
    return { lines: [], context: ctx, clearScreen: false, executedCommand: null };
  }
  const expected = pending.expectedPassword;
  if (expected && password.trim() !== expected) {
    return {
      lines: [err('Sorry, try again.')],
      context: { ...ctx, sudoPending: null },
      clearScreen: false,
      executedCommand: null,
    };
  }
  const inner = executeCommandInner(pending.effectiveCmd, {
    ...ctx,
    sudoPending: null,
    sudoElevated: true,
  });
  return {
    ...inner,
    context: { ...inner.context, sudoElevated: false },
    executedCommand: parseCommand(`sudo ${pending.effectiveCmd}`),
  };
}

function handleSshPassword(ctx: CommandContext, password: string): CommandResult {
  const pending = ctx.sshPending;
  if (!pending) {
    return { lines: [], context: ctx, clearScreen: false, executedCommand: null };
  }
  const sshCmd = parseCommand(`ssh ${pending.user}@${pending.host}`);
  if (password.trim() !== pending.expectedPassword) {
    return {
      lines: [err('Permission denied, please try again.')],
      context: { ...ctx, sshPending: null },
      clearScreen: false,
      executedCommand: null,
    };
  }
  return {
    lines: [out(`Connected to ${pending.host} as ${pending.user}`, 'system')],
    context: {
      ...ctx,
      fsContext: 'remote',
      remoteFS: createFSState(ctx.remoteFS.nodes, '/'),
      sshPending: null,
      sshConnectedHost: pending.host,
    },
    clearScreen: false,
    executedCommand: sshCmd,
  };
}

function handleExecuteScript(ctx: CommandContext, scriptName: string): CommandResult {
  const fs = activeFS(ctx);
  const clean = scriptName.startsWith('./') ? scriptName.slice(2) : scriptName;
  const scriptPath = resolvePath(fs.cwd, clean);
  const node = getNode(fs.nodes, scriptPath);
  const parsed = parseCommand(scriptName);
  if (!node) {
    return {
      lines: [err(`bash: ${scriptName}: No such file or directory`)],
      context: ctx,
      clearScreen: false,
      executedCommand: parsed,
    };
  }
  if (!canExecute(node)) {
    return {
      lines: [err(`bash: ${scriptName}: Permission denied`)],
      context: ctx,
      clearScreen: false,
      executedCommand: parsed,
    };
  }
  const result = executeScript(node);
  if (!result.ok) {
    return { lines: [err(result.error)], context: ctx, clearScreen: false, executedCommand: parsed };
  }
  const granted = result.value.some((l) => l.includes('[SUDO_GRANTED]'));
  if (granted) {
    useGameStore.getState().setHasSudo(true);
  }
  const lines = result.value
    .filter((l) => !l.includes('[SUDO_GRANTED]'))
    .map((l) => (l.includes('██') ? out(l, 'system') : out(l)));
  if (granted) {
    lines.push(out('Права администратора получены.', 'system'));
  }
  return { lines, context: ctx, clearScreen: false, executedCommand: parsed };
}

function handleLs(ctx: CommandContext, tokens: string[]): CommandResult {
  const fs = activeFS(ctx);
  let path: string | undefined;
  const flags = { long: false, all: false };
  for (const t of tokens.slice(1)) {
    if (t === '-la' || t === '-al') {
      flags.long = true;
      flags.all = true;
    } else if (t === '-l') flags.long = true;
    else if (t === '-a') flags.all = true;
    else if (!t.startsWith('-')) path = t;
  }
  const result = ls(fs, path, flags);
  if (!result.ok) {
    return {
      lines: [err(result.error)],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  return {
    lines: result.value.map((l) => out(l)),
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handleCd(ctx: CommandContext, tokens: string[]): CommandResult {
  const fs = activeFS(ctx);
  const target = tokens[1] ?? '~';
  const result = cd(fs, target);
  if (!result.ok) {
    return {
      lines: [err(result.error)],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  return {
    lines: [],
    context: updateFS(ctx, result.value),
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function outputText(lines: OutputLine[]): string {
  return lines.map((l) => l.text).join('\n');
}

function handleCat(ctx: CommandContext, tokens: string[]): CommandResult {
  const fs = activeFS(ctx);
  const target = tokens[1];
  if (!target) {
    return {
      lines: [err('cat: missing operand')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  const result = cat(fs, target);
  if (!result.ok) {
    return {
      lines: [err(result.error)],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  const contentLines = result.value.content.split('\n').map((l) => out(l));
  return {
    lines: contentLines,
    context: {
      ...ctx,
      lastCatPath: result.value.path,
      lastCommandOutput: result.value.content,
    },
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handleChmod(ctx: CommandContext, tokens: string[]): CommandResult {
  const fs = activeFS(ctx);
  if (tokens.length < 3) {
    return {
      lines: [err('chmod: missing operand')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  const result = chmod(fs, tokens[1], tokens[2]);
  if (!result.ok) {
    return {
      lines: [err(result.error)],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  return {
    lines: [],
    context: updateFS(ctx, result.value),
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handleGrep(ctx: CommandContext, tokens: string[]): CommandResult {
  const fs = activeFS(ctx);
  let recursive = false;
  let caseInsensitive = false;
  const args = tokens.slice(1);
  const filtered: string[] = [];
  for (const a of args) {
    if (a === '-r') recursive = true;
    else if (a === '-i') caseInsensitive = true;
    else filtered.push(a);
  }
  if (filtered.length < 2) {
    return {
      lines: [err('grep: missing pattern or file')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  const [pattern, target] = filtered;
  let lines: string[];
  if (recursive) {
    lines = grepRecursive(fs, pattern, target, caseInsensitive);
  } else {
    const catResult = cat(fs, target);
    if (!catResult.ok) {
      return {
        lines: [err(catResult.error)],
        context: ctx,
        clearScreen: false,
        executedCommand: parseCommand(tokens.join(' ')),
      };
    }
    lines = grepLines(catResult.value.content, pattern, caseInsensitive);
  }
  return {
    lines: lines.length ? lines.map((l) => out(l)) : [],
    context: {
      ...ctx,
      lastCommandOutput: lines.length ? outputText(lines.map((l) => out(l))) : '',
    },
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handleFind(ctx: CommandContext, tokens: string[]): CommandResult {
  const fs = activeFS(ctx);
  const startDir = tokens[1] ?? '.';
  let namePattern: string | undefined;
  let typeFilter: 'f' | 'd' | undefined;
  for (let i = 2; i < tokens.length; i++) {
    if (tokens[i] === '-name' && tokens[i + 1]) {
      namePattern = tokens[++i].replace(/^['"]|['"]$/g, '');
    } else if (tokens[i] === '-type' && tokens[i + 1]) {
      const t = tokens[++i];
      if (t === 'f' || t === 'd') typeFilter = t;
    }
  }
  const paths = find(fs, startDir, namePattern, typeFilter);
  return {
    lines: paths.map((p) => out(p)),
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handleTar(ctx: CommandContext, tokens: string[]): CommandResult {
  const fs = activeFS(ctx);
  const flags = tokens[1] ?? '';
  const archive = tokens[2];
  if (!archive) {
    return {
      lines: [err('tar: You must specify an archive file')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  if (flags === '-tzf') {
    const result = listArchive(fs, archive);
    if (!result.ok) {
      return {
        lines: [err(result.error)],
        context: ctx,
        clearScreen: false,
        executedCommand: parseCommand(tokens.join(' ')),
      };
    }
    return {
      lines: result.value.map((l) => out(l)),
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  if (flags === '-xzf') {
    let targetDir: string | undefined;
    const cIdx = tokens.indexOf('-C');
    if (cIdx >= 0 && tokens[cIdx + 1]) targetDir = tokens[cIdx + 1];
    const result = extractArchive(fs, archive, targetDir);
    if (!result.ok) {
      return {
        lines: [err(result.error)],
        context: ctx,
        clearScreen: false,
        executedCommand: parseCommand(tokens.join(' ')),
      };
    }
    return {
      lines: [],
      context: updateFS(ctx, result.value),
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  return {
    lines: [err(`tar: invalid flag '${flags}'`)],
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handleIpA(ctx: CommandContext): CommandResult {
  const fs = activeFS(ctx);
  const result = cat(fs, '/network/interfaces.conf');
  const fallback: OutputLine[] = [];
  if (result.ok) {
    for (const line of result.value.content.split('\n')) {
      const m = line.match(/^(eth\d+|lo):\s+(\S+)\s+\[([^\]]+)\]/);
      if (m) fallback.push(out(`${m[1]}: ${m[2]} [${m[3]}]`));
    }
  }
  const lines =
    ctx.level.network?.length
      ? formatIpA(ctx.level, fallback)
      : fallback.length
        ? fallback
        : [err('ip: no interfaces configured')];
  return { lines, context: ctx, clearScreen: false, executedCommand: parseCommand('ip a') };
}

function handlePing(ctx: CommandContext, host: string): CommandResult {
  if (ctx.level.reachable_hosts?.length) {
    return {
      lines: formatPing(host, ctx.level),
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(`ping ${host}`),
    };
  }
  const fs = activeFS(ctx);
  const log = getNode(fs.nodes, '/network/ping_log.txt');
  if (log?.content?.includes(host)) {
    const line = log.content.split('\n').find((l) => l.includes(host));
    if (line?.includes('TIMEOUT') || line?.includes('UNREACHABLE')) {
      return {
        lines: [err(`ping: ${host}: Host unreachable`)],
        context: ctx,
        clearScreen: false,
        executedCommand: parseCommand(`ping ${host}`),
      };
    }
    const ms = line?.match(/(\d+)ms/)?.[1] ?? '?';
    const name = line?.match(/\[([^\]]+)\]/)?.[1] ?? host;
    return {
      lines: [out(`PING ${host}: ${ms}ms — ${name} [REACHABLE]`)],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(`ping ${host}`),
    };
  }
  return {
    lines: formatPing(host, ctx.level),
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(`ping ${host}`),
  };
}

function handlePs(ctx: CommandContext): CommandResult {
  const { activeProcesses } = useGameStore.getState();
  return {
    lines: formatPsTable(activeProcesses),
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand('ps aux'),
  };
}

function handleNetstat(ctx: CommandContext, tokens: string[]): CommandResult {
  if (!tokens.includes('-tlnp')) {
    return {
      lines: [out('Используй: netstat -tlnp', 'system')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  const { activeProcesses } = useGameStore.getState();
  return {
    lines: formatNetstat(activeProcesses),
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handleLsof(ctx: CommandContext, tokens: string[]): CommandResult {
  const portArg = tokens.find((a) => a.startsWith(':'));
  const port = portArg ? parseInt(portArg.slice(1), 10) : NaN;
  const { activeProcesses } = useGameStore.getState();
  return {
    lines: formatLsof(activeProcesses, port),
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handleKill(ctx: CommandContext, tokens: string[]): CommandResult {
  const pidStr = tokens.find((a) => /^\d+$/.test(a));
  const pid = pidStr ? parseInt(pidStr, 10) : NaN;
  const { activeProcesses } = useGameStore.getState();
  const result = killProcess(activeProcesses, pid);
  if (!result.ok) {
    return {
      lines: [err(result.error)],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  useGameStore.getState().setActiveProcesses(result.processes);
  const proc = activeProcesses.find((p) => p.pid === pid);
  return {
    lines: [out(`Process ${pid} (${proc?.command ?? 'unknown'}) terminated.`)],
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handleDf(ctx: CommandContext): CommandResult {
  return {
    lines: formatDf(ctx.level.disk_usage),
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand('df -h'),
  };
}

function handleTailF(ctx: CommandContext, tokens: string[]): CommandResult {
  const path = tokens[2];
  if (!path) {
    return {
      lines: [err('tail: missing file operand')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  const fs = activeFS(ctx);
  const result = cat(fs, path);
  if (!result.ok) {
    return {
      lines: [err(result.error)],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  return {
    lines: formatTailF(result.value.content, ctx.level.tail_stream ?? []),
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handleSystemctlCmd(ctx: CommandContext, tokens: string[]): CommandResult {
  const action = tokens[1];
  const service = tokens[2];
  if (!action || !service) {
    return {
      lines: [err('Usage: systemctl start|status <service>')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  const { serviceStates } = useGameStore.getState();
  const { lines, newStates } = handleSystemctl(
    action,
    service,
    ctx.level.systemctl_services ?? [],
    serviceStates,
  );
  for (const [name, status] of Object.entries(newStates)) {
    if (serviceStates[name] !== status) {
      useGameStore.getState().setServiceState(name, status);
    }
  }
  return {
    lines,
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

function handlePipe(ctx: CommandContext, raw: string): CommandResult {
  const parts = raw.split(' | ');
  if (parts.length !== 2) {
    return {
      lines: [err('Pipe: поддерживается только одна команда слева и grep справа')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(raw),
    };
  }
  const leftResult = executeCommandInner(parts[0].trim(), ctx);
  const leftText = leftResult.lines.map((l) => l.text).join('\n');
  const rightTokens = parts[1].trim().split(/\s+/);
  const rightCmd = rightTokens[0]?.toLowerCase();
  if (rightCmd !== 'grep') {
    return {
      lines: [err('Pipe: поддерживается только | grep')],
      context: leftResult.context,
      clearScreen: false,
      executedCommand: parseCommand(raw),
    };
  }
  const pattern = rightTokens[1] ?? '';
  const filtered = leftText.split('\n').filter((l) => l.includes(pattern));
  const pipeCmd = parts[1].trim();
  return {
    lines: filtered.map((text) => out(text)),
    context: {
      ...leftResult.context,
      lastCommandOutput: filtered.join('\n'),
    },
    clearScreen: false,
    executedCommand: parseCommand(pipeCmd),
  };
}

function requiresSudo(cmd: string): boolean {
  return SUDO_REQUIRED_CMDS.has(cmd);
}

function privilegeDenied(cmd: string, ctx: CommandContext): CommandResult {
  return {
    lines: [
      err(`${cmd}: Operation not permitted`),
      out(`Нет прав. Попробуй: sudo ${cmd}`, 'system'),
    ],
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(cmd),
  };
}

function handleSsh(ctx: CommandContext, target: string): CommandResult {
  const match = target.match(/^([^@]+)@(.+)$/);
  if (!match) {
    return {
      lines: [err('ssh: invalid syntax')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(`ssh ${target}`),
    };
  }
  const [, user, host] = match;
  const remoteConfig = getRemoteConfig(ctx.level);
  if (!remoteConfig || remoteConfig.host !== host) {
    return {
      lines: [err(`ssh: connect to host ${host} port 22: Connection refused`)],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(`ssh ${target}`),
    };
  }
  const password = readSshPassword(ctx.localFS.nodes);
  if (!password) {
    return {
      lines: [err('ssh: authentication failed')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(`ssh ${target}`),
    };
  }
  return {
    lines: [out(`Password for ${user}@${host}:`)],
    context: {
      ...ctx,
      sshPending: { host, user, expectedPassword: password },
    },
    clearScreen: false,
    executedCommand: null,
  };
}

function handleCurl(ctx: CommandContext, url: string): CommandResult {
  if (url.includes('10.0.0.42')) {
    return {
      lines: [out('HTTP/1.1 200 OK — relay_bot: ONLINE', 'system')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(`curl ${url}`),
    };
  }
  return {
    lines: [err(`curl: (7) Failed to connect to ${url}`)],
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(`curl ${url}`),
  };
}

function handleHint(ctx: CommandContext, tokens: string[]): CommandResult {
  const hints = ctx.level.hints;
  if (tokens.length === 1) {
    return {
      lines: [out(formatHintList(hints, ctx.usedHints))],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand('hint'),
    };
  }
  const level = parseInt(tokens[1], 10);
  if (level < 1 || level > 3) {
    return {
      lines: [err('hint: level must be 1, 2, or 3')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(tokens.join(' ')),
    };
  }
  const text = getHintText(hints, level);
  const usedHints = ctx.usedHints.includes(level) ? ctx.usedHints : [...ctx.usedHints, level];
  const prefix = ctx.usedHints.includes(level) ? '[уже использована] ' : '';
  return {
    lines: [out(`${prefix}${text}`, 'system')],
    context: { ...ctx, usedHints },
    clearScreen: false,
    executedCommand: parseCommand(tokens.join(' ')),
  };
}

/** Executes a terminal command and returns output lines + updated context */
function executeCommandInner(input: string, ctx: CommandContext): CommandResult {
  const raw = input.trim();
  if (!raw) {
    return { lines: [], context: ctx, clearScreen: false, executedCommand: null };
  }

  if (isBlocked(raw)) {
    return {
      lines: [err(BLOCKED_MSG)],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(raw),
    };
  }

  if (raw.includes(' | ')) {
    return handlePipe(ctx, raw);
  }

  const { hasSudo } = useGameStore.getState();
  const isSudoPrefix = raw.trimStart().startsWith('sudo ');
  let effectiveRaw = raw;
  if (isSudoPrefix) {
    effectiveRaw = raw.replace(/^sudo\s+/, '');
    if (!hasSudo) {
      const requiredPwd = ctx.level.sudo_password ?? '';
      return {
        lines: [out('[sudo] password for pilot:')],
        context: {
          ...ctx,
          sudoPending: { effectiveCmd: effectiveRaw, expectedPassword: requiredPwd },
        },
        clearScreen: false,
        executedCommand: null,
      };
    }
  }

  const tokens = effectiveRaw.split(/\s+/);
  const cmd = tokens[0].toLowerCase();

  if (requiresSudo(cmd) && !hasSudo && !isSudoPrefix && !ctx.sudoElevated) {
    return privilegeDenied(cmd, ctx);
  }

  if (cmd === 'ls') return handleLs(ctx, tokens);
  if (cmd === 'cd') return handleCd(ctx, tokens);
  if (cmd === 'cat') return handleCat(ctx, tokens);
  if (cmd === 'pwd') {
    return {
      lines: [out(activeFS(ctx).cwd)],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(effectiveRaw),
    };
  }
  if (cmd === 'clear') {
    return { lines: [], context: ctx, clearScreen: true, executedCommand: parseCommand(effectiveRaw) };
  }
  if (cmd === 'help') {
    return {
      lines: HELP_LINES.map((l) => out(l, 'system')),
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(effectiveRaw),
    };
  }
  if (cmd === 'hint') return handleHint(ctx, tokens);
  if (cmd === 'chmod') return handleChmod(ctx, tokens);
  if (cmd === 'grep') return handleGrep(ctx, tokens);
  if (cmd === 'find') return handleFind(ctx, tokens);
  if (cmd === 'mkdir') {
    const fs = activeFS(ctx);
    const recursive = tokens.includes('-p');
    const target = tokens.filter((t) => !t.startsWith('-'))[0];
    if (!target) {
      return {
        lines: [err('mkdir: missing operand')],
        context: ctx,
        clearScreen: false,
        executedCommand: parseCommand(effectiveRaw),
      };
    }
    const result = mkdir(fs, target, recursive);
    if (!result.ok) {
      return {
        lines: [err(result.error)],
        context: ctx,
        clearScreen: false,
        executedCommand: parseCommand(effectiveRaw),
      };
    }
    return {
      lines: [],
      context: updateFS(ctx, result.value),
      clearScreen: false,
      executedCommand: parseCommand(effectiveRaw),
    };
  }
  if (cmd === 'cp' && tokens.length >= 3) {
    const result = cp(activeFS(ctx), tokens[1], tokens[2]);
    if (!result.ok) {
      return {
        lines: [err(result.error)],
        context: ctx,
        clearScreen: false,
        executedCommand: parseCommand(effectiveRaw),
      };
    }
    return {
      lines: [],
      context: updateFS(ctx, result.value),
      clearScreen: false,
      executedCommand: parseCommand(effectiveRaw),
    };
  }
  if (cmd === 'mv' && tokens.length >= 3) {
    const result = mv(activeFS(ctx), tokens[1], tokens[2]);
    if (!result.ok) {
      return {
        lines: [err(result.error)],
        context: ctx,
        clearScreen: false,
        executedCommand: parseCommand(effectiveRaw),
      };
    }
    return {
      lines: [],
      context: updateFS(ctx, result.value),
      clearScreen: false,
      executedCommand: parseCommand(effectiveRaw),
    };
  }
  if (cmd === 'tar') return handleTar(ctx, tokens);
  if (cmd === 'ps' && tokens[1] === 'aux') return handlePs(ctx);
  if (cmd === 'netstat') return handleNetstat(ctx, tokens);
  if (cmd === 'lsof') return handleLsof(ctx, tokens);
  if (cmd === 'kill') return handleKill(ctx, tokens);
  if (cmd === 'df' && tokens[1] === '-h') return handleDf(ctx);
  if (cmd === 'tail' && tokens[1] === '-f') return handleTailF(ctx, tokens);
  if (cmd === 'systemctl') return handleSystemctlCmd(ctx, tokens);
  if (cmd === 'ip' && tokens[1] === 'a') return handleIpA(ctx);
  if (cmd === 'ping' && tokens[1]) return handlePing(ctx, tokens[1]);
  if (cmd === 'ssh' && tokens[1]) return handleSsh(ctx, tokens[1]);
  if (cmd === 'curl' && tokens[1]) return handleCurl(ctx, tokens[1]);
  if (cmd === 'exit' || cmd === 'logout') {
    if (ctx.fsContext === 'remote') {
      return {
        lines: [out('Connection closed.', 'system')],
        context: { ...ctx, fsContext: 'local', sshConnectedHost: null },
        clearScreen: false,
        executedCommand: parseCommand(effectiveRaw),
      };
    }
    return {
      lines: [out('logout: not logged in remotely')],
      context: ctx,
      clearScreen: false,
      executedCommand: parseCommand(effectiveRaw),
    };
  }
  if (tokens[0].startsWith('./') || tokens[0].endsWith('.sh')) {
    return handleExecuteScript(ctx, tokens[0]);
  }

  return {
    lines: [err(`bash: ${tokens[0]}: command not found`)],
    context: ctx,
    clearScreen: false,
    executedCommand: parseCommand(effectiveRaw),
  };
}

export const executeCommand = (input: string, ctx: CommandContext): CommandResult => {
  const raw = input.trim();
  if (!raw) {
    return { lines: [], context: ctx, clearScreen: false, executedCommand: null };
  }

  if (ctx.sshPending) {
    return handleSshPassword(ctx, raw);
  }

  if (ctx.sudoPending) {
    return handleSudoPassword(ctx, raw);
  }

  return executeCommandInner(raw, ctx);
};

/** Builds the terminal prompt string for current context */
export const buildPrompt = (ctx: CommandContext): string => {
  const fs = activeFS(ctx);
  const cwd = fs.cwd === '/' ? '' : fs.cwd;
  if (ctx.fsContext === 'remote') {
    const remote = getRemoteConfig(ctx.level);
    const host = remote?.host ?? 'remote';
    const user = remote?.user ?? 'user';
    const hostname = host === '10.0.0.42' ? 'jonas' : host;
    return `${user}@${hostname}:${cwd || '/'}# `;
  }
  return `RETRO-UX:${cwd || '/'}# `;
};
