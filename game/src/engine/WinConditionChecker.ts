import type { WinCondition } from '../types/level.types';
import { isTargetKilled } from './extendedCommands';
import { useGameStore } from '../store/gameStore';

export interface ParsedCommand {
  raw: string;
  tokens: string[];
  command: string;
}

export interface WinCheckContext {
  parsed: ParsedCommand;
  cwd: string;
  fsContext: 'local' | 'remote';
  sshConnectedHost: string | null;
  lastCatPath: string | null;
  lastCommandOutput: string | null;
  nodes: { path: string; type: string }[];
  discoveries?: string[];
}

/** Collapses whitespace for command comparison */
export const normalizeCommand = (input: string): string =>
  input.trim().replace(/\s+/g, ' ');

/** Tokenizes a command line */
export const parseCommand = (input: string): ParsedCommand => {
  const raw = input.trim();
  const tokens = raw.split(/\s+/).filter(Boolean);
  return {
    raw,
    tokens,
    command: tokens[0]?.toLowerCase() ?? '',
  };
};

function matchesSshRequirement(
  ctx: WinCheckContext,
  condition: WinCondition,
): boolean {
  if (!condition.requires_ssh) return true;
  if (ctx.fsContext !== 'remote') return false;
  if (!condition.ssh_host) return true;
  return ctx.sshConnectedHost === condition.ssh_host;
}

function matchesCommandExecuted(
  ctx: WinCheckContext,
  condition: WinCondition,
): boolean {
  if (!condition.command) return false;
  const cmdMatch =
    normalizeCommand(ctx.parsed.raw) === normalizeCommand(condition.command);
  const dirMatch =
    !condition.working_directory || ctx.cwd === condition.working_directory;
  if (!cmdMatch || !dirMatch || !matchesSshRequirement(ctx, condition)) {
    return false;
  }
  if (condition.requires_discovery) {
    const discoveries = ctx.discoveries ?? [];
    if (!discoveries.includes(condition.requires_discovery)) return false;
  }
  return true;
}

function targetsKilled(): boolean {
  const { activeProcesses, currentLevelDefinition } = useGameStore.getState();
  const targets = (currentLevelDefinition?.mock_processes ?? []).filter(
    (p) => p.is_target,
  );
  return isTargetKilled(activeProcesses, targets);
}

/** Checks whether the win condition is satisfied after a command */
export const checkWinCondition = (
  ctx: WinCheckContext,
  condition: WinCondition,
): boolean => {
  switch (condition.type) {
    case 'command_executed':
      return matchesCommandExecuted(ctx, condition);

    case 'process_killed_and_command':
      if (!targetsKilled()) return false;
      return matchesCommandExecuted(ctx, condition);

    case 'file_read': {
      const target = condition.file ?? condition.path;
      if (!target) return false;

      const cmd = ctx.parsed.command;
      const pathMatch = cmd === 'cat' && ctx.lastCatPath === target;
      const grepMatch =
        cmd === 'grep' || ctx.parsed.raw.includes('| grep');

      if (condition.contains) {
        const output = ctx.lastCommandOutput ?? '';
        if (!output.includes(condition.contains)) return false;
        if (pathMatch || grepMatch) return true;
        return false;
      }

      return pathMatch;
    }
    case 'file_created': {
      const target = condition.file ?? condition.path;
      if (!target) return false;
      return ctx.nodes.some((n) => n.path === target && n.type === 'file');
    }
    case 'sequence':
      return false;
    default:
      return false;
  }
};

/** Checks if a sequence step matches; returns true when all steps complete */
export const checkSequenceStep = (
  ctx: WinCheckContext,
  condition: WinCondition,
  sequenceStep: number,
): { won: boolean; nextStep: number; progressMessage: string | null } => {
  if (condition.type !== 'sequence' || !condition.steps?.length) {
    return { won: false, nextStep: sequenceStep, progressMessage: null };
  }

  const step = condition.steps[sequenceStep];
  if (!step) {
    return { won: false, nextStep: sequenceStep, progressMessage: null };
  }

  const cmdMatch =
    normalizeCommand(ctx.parsed.raw) === normalizeCommand(step.command);
  const dirMatch = ctx.cwd === step.working_directory;

  if (!cmdMatch || !dirMatch) {
    return { won: false, nextStep: sequenceStep, progressMessage: null };
  }

  const nextStep = sequenceStep + 1;
  if (nextStep === condition.steps.length) {
    return { won: true, nextStep, progressMessage: null };
  }

  return {
    won: false,
    nextStep,
    progressMessage: `[ШАГ ${nextStep}/${condition.steps.length}] Выполнено. Продолжай.`,
  };
};
