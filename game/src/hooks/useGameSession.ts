import { useCallback } from 'react';
import {
  executeCommand,
  type CommandContext,
  type OutputLine,
} from '../engine/CommandParser';
import {
  checkSequenceStep,
  checkWinCondition,
} from '../engine/WinConditionChecker';
import { getActiveFS } from '../engine/FileSystem';
import { HINT_LEVEL_3_PENALTY } from '../engine/HintSystem';
import { audioSystem } from '../engine/AudioSystem';
import { useGameStore } from '../store/gameStore';
import type { LoadedLevel } from '../types/level.types';

const TRACKED_COMMANDS = [
  'ls',
  'cd',
  'cat',
  'chmod',
  'grep',
  'find',
  'tar',
  'mkdir',
  'cp',
  'mv',
  'ssh',
  'ping',
  'ip',
  'ps',
  'netstat',
  'lsof',
  'kill',
  'df',
  'tail',
  'systemctl',
  'sudo',
];

/** Game loop: command execution, scoring, win detection */
export function useGameSession(level: LoadedLevel, onWin: () => void) {
  const setCommandContext = useGameStore((s) => s.setCommandContext);
  const markCommandUsed = useGameStore((s) => s.markCommandUsed);
  const addScore = useGameStore((s) => s.addScore);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const refillOxygen = useGameStore((s) => s.refillOxygen);
  const setLastCommand = useGameStore((s) => s.setLastCommand);
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const phase = useGameStore((s) => s.phase);
  const setRobotState = useGameStore((s) => s.setRobotState);
  const addDiscovery = useGameStore((s) => s.addDiscovery);
  const setSequenceStep = useGameStore((s) => s.setSequenceStep);
  const sequenceStep = useGameStore((s) => s.sequenceStep);

  const submitCommand = useCallback(
    (line: string, ctx: CommandContext): { lines: OutputLine[]; clearScreen: boolean; won: boolean; context: CommandContext } => {
      const trimmed = line.trim();
      if (!trimmed) {
        return { lines: [], clearScreen: false, won: false, context: ctx };
      }

      setRobotState('thinking');
      const prevUsedHints = ctx.usedHints;
      const result = executeCommand(line, ctx);
      const newCtx = result.context;
      const extraLines: OutputLine[] = [];

      const hasError = result.lines.some((l) => l.kind === 'error');
      if (hasError) audioSystem.errorBuzz();
      else audioSystem.successBeep();
      setRobotState(hasError ? 'error' : 'success');
      setCommandContext(newCtx);

      if (result.executedCommand) {
        setLastCommand(result.executedCommand.raw);
        const cmd = result.executedCommand.command;
        const trackCmd = result.executedCommand.raw.startsWith('./')
          ? result.executedCommand.raw.split(' ')[0]
          : cmd === 'sudo'
            ? result.executedCommand.raw.replace(/^sudo\s+/, '').split(' ')[0]
            : cmd;
        if (TRACKED_COMMANDS.includes(cmd) || result.executedCommand.raw.startsWith('./')) {
          markCommandUsed(trackCmd);
        }
      }

      if (
        result.executedCommand?.command === 'hint' &&
        result.executedCommand.tokens[1] === '3' &&
        !prevUsedHints.includes(3)
      ) {
        addScore(-HINT_LEVEL_3_PENALTY);
      }

      let won = false;
      const fs = getActiveFS(newCtx.localFS, newCtx.remoteFS, newCtx.fsContext);
      const discoveryToken = level.definition.win_condition.requires_discovery;
      const output = newCtx.lastCommandOutput ?? '';

      if (discoveryToken && output.includes(discoveryToken)) {
        addDiscovery(discoveryToken);
      }

      if (result.executedCommand && phase === 'playing') {
        const winCtx = {
          parsed: result.executedCommand,
          cwd: fs.cwd,
          fsContext: newCtx.fsContext,
          sshConnectedHost: newCtx.sshConnectedHost,
          lastCatPath: newCtx.lastCatPath,
          lastCommandOutput: newCtx.lastCommandOutput,
          nodes: fs.nodes,
          discoveries: useGameStore.getState().discoveries,
        };

        const condition = level.definition.win_condition;

        if (condition.type === 'sequence') {
          const seq = checkSequenceStep(winCtx, condition, sequenceStep);
          if (seq.progressMessage) {
            extraLines.push({ text: seq.progressMessage, kind: 'system' });
          }
          if (seq.nextStep !== sequenceStep) {
            setSequenceStep(seq.nextStep);
          }
          won = seq.won;
        } else {
          won = checkWinCondition(winCtx, condition);
        }

        if (won) {
          completeLevel(currentLevelId);
          addScore(level.definition.reward.score);
          refillOxygen(level.definition.reward.oxygen_bonus);
          setRobotState('win');
          audioSystem.winFanfare();
          onWin();
        }
      }

      return {
        lines: [...result.lines, ...extraLines],
        clearScreen: result.clearScreen,
        won,
        context: newCtx,
      };
    },
    [
      level,
      onWin,
      phase,
      setCommandContext,
      markCommandUsed,
      addScore,
      completeLevel,
      refillOxygen,
      setLastCommand,
      currentLevelId,
      setRobotState,
      addDiscovery,
      setSequenceStep,
      sequenceStep,
    ],
  );

  return { submitCommand };
}
