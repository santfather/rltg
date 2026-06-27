import { describe, it, expect } from 'vitest';
import {
  checkWinCondition,
  checkSequenceStep,
  normalizeCommand,
  parseCommand,
} from './WinConditionChecker';
import { useGameStore } from '../store/gameStore';

describe('normalizeCommand', () => {
  it('collapses extra whitespace', () => {
    expect(normalizeCommand('  ls   -la  ')).toBe('ls -la');
  });
});

describe('checkWinCondition command_executed', () => {
  const base = {
    parsed: parseCommand('./open_door.sh'),
    cwd: '/system_core',
    fsContext: 'local' as const,
    sshConnectedHost: null,
    lastCatPath: null,
    lastCommandOutput: null,
    nodes: [],
  };

  it('returns false for wrong command', () => {
    expect(
      checkWinCondition(base, {
        type: 'command_executed',
        command: './other.sh',
        working_directory: '/system_core',
      }),
    ).toBe(false);
  });

  it('returns false for wrong working directory', () => {
    expect(
      checkWinCondition(base, {
        type: 'command_executed',
        command: './open_door.sh',
        working_directory: '/',
      }),
    ).toBe(false);
  });

  it('returns true for matching command and directory', () => {
    expect(
      checkWinCondition(base, {
        type: 'command_executed',
        command: './open_door.sh',
        working_directory: '/system_core',
      }),
    ).toBe(true);
  });

  it('ignores extra whitespace in command match', () => {
    expect(
      checkWinCondition(
        { ...base, parsed: parseCommand('  ./open_door.sh  ') },
        {
          type: 'command_executed',
          command: './open_door.sh',
          working_directory: '/system_core',
        },
      ),
    ).toBe(true);
  });

  it('requires remote context when requires_ssh is set', () => {
    expect(
      checkWinCondition(base, {
        type: 'command_executed',
        command: './open_door.sh',
        requires_ssh: true,
      }),
    ).toBe(false);
  });

  it('passes requires_ssh in remote context with matching host', () => {
    expect(
      checkWinCondition(
        {
          ...base,
          fsContext: 'remote',
          sshConnectedHost: '10.0.0.42',
          cwd: '/relay',
          parsed: parseCommand('./activate_relay.sh'),
        },
        {
          type: 'command_executed',
          command: './activate_relay.sh',
          working_directory: '/relay',
          requires_ssh: true,
          ssh_host: '10.0.0.42',
        },
      ),
    ).toBe(true);
  });
});

describe('checkWinCondition file_read', () => {
  const baseCtx = {
    cwd: '/',
    fsContext: 'local' as const,
    sshConnectedHost: null,
    lastCommandOutput: 'SOS FREQUENCY SET: FREQ=472.88',
    nodes: [] as { path: string; type: string }[],
  };

  it('returns true when cat path matches', () => {
    expect(
      checkWinCondition(
        {
          ...baseCtx,
          parsed: parseCommand('cat /secrets/log.txt'),
          lastCatPath: '/secrets/log.txt',
          lastCommandOutput: 'file content',
        },
        { type: 'file_read', file: '/secrets/log.txt' },
      ),
    ).toBe(true);
  });

  it('returns false for non-cat command', () => {
    expect(
      checkWinCondition(
        {
          ...baseCtx,
          parsed: parseCommand('ls'),
          lastCatPath: '/secrets/log.txt',
        },
        { type: 'file_read', file: '/secrets/log.txt' },
      ),
    ).toBe(false);
  });

  it('file_read with contains: matches when output includes string', () => {
    expect(
      checkWinCondition(
        {
          ...baseCtx,
          parsed: parseCommand('grep -r FREQ logs/'),
          lastCatPath: null,
          lastCommandOutput: 'logs/emergency.log: FREQ=472.88',
        },
        {
          type: 'file_read',
          path: '/logs/2187-03/emergency.log',
          contains: 'FREQ=472.88',
        },
      ),
    ).toBe(true);
  });

  it('file_read with contains: fails when output missing string', () => {
    expect(
      checkWinCondition(
        {
          ...baseCtx,
          parsed: parseCommand('grep -r FREQ logs/'),
          lastCatPath: null,
          lastCommandOutput: 'no matches',
        },
        {
          type: 'file_read',
          path: '/logs/2187-03/emergency.log',
          contains: 'FREQ=472.88',
        },
      ),
    ).toBe(false);
  });

  it('file_read without contains: matches on cat path only', () => {
    expect(
      checkWinCondition(
        {
          ...baseCtx,
          parsed: parseCommand('cat /system/mission_briefing.txt'),
          lastCatPath: '/system/mission_briefing.txt',
          lastCommandOutput: 'briefing body',
        },
        { type: 'file_read', file: '/system/mission_briefing.txt' },
      ),
    ).toBe(true);
  });
});

describe('checkWinCondition file_created', () => {
  it('returns true when file exists in nodes', () => {
    expect(
      checkWinCondition(
        {
          parsed: parseCommand('touch foo'),
          cwd: '/',
          fsContext: 'local',
          sshConnectedHost: null,
          lastCatPath: null,
          lastCommandOutput: null,
          nodes: [{ path: '/tmp/foo', type: 'file' }],
        },
        { type: 'file_created', path: '/tmp/foo' },
      ),
    ).toBe(true);
  });
});

describe('process_killed_and_command', () => {
  beforeEach(() => {
    useGameStore.setState({
      activeProcesses: [
        { pid: 4821, user: 'root', cpu: 99, mem: 10, command: 'turret_daemon', is_target: true },
      ],
      currentLevelDefinition: {
        mock_processes: [
          { pid: 4821, user: 'root', cpu: 99, mem: 10, command: 'turret_daemon', is_target: true },
        ],
      } as never,
    });
  });

  it('target alive → false', () => {
    expect(
      checkWinCondition(
        {
          parsed: parseCommand('./disable_turret.sh'),
          cwd: '/emergency',
          fsContext: 'local',
          sshConnectedHost: null,
          lastCatPath: null,
          lastCommandOutput: null,
          nodes: [],
        },
        {
          type: 'process_killed_and_command',
          command: './disable_turret.sh',
          working_directory: '/emergency',
        },
      ),
    ).toBe(false);
  });

  it('target killed + wrong cmd → false', () => {
    useGameStore.getState().setActiveProcesses([]);
    expect(
      checkWinCondition(
        {
          parsed: parseCommand('ls'),
          cwd: '/emergency',
          fsContext: 'local',
          sshConnectedHost: null,
          lastCatPath: null,
          lastCommandOutput: null,
          nodes: [],
        },
        {
          type: 'process_killed_and_command',
          command: './disable_turret.sh',
          working_directory: '/emergency',
        },
      ),
    ).toBe(false);
  });

  it('target killed + correct cmd + dir → true', () => {
    useGameStore.getState().setActiveProcesses([]);
    expect(
      checkWinCondition(
        {
          parsed: parseCommand('./disable_turret.sh'),
          cwd: '/emergency',
          fsContext: 'local',
          sshConnectedHost: null,
          lastCatPath: null,
          lastCommandOutput: null,
          nodes: [],
        },
        {
          type: 'process_killed_and_command',
          command: './disable_turret.sh',
          working_directory: '/emergency',
        },
      ),
    ).toBe(true);
  });
});

describe('requires_discovery on command_executed', () => {
  it('fails win without discovery token', () => {
    expect(
      checkWinCondition(
        {
          parsed: parseCommand('./activate_beacon.sh'),
          cwd: '/beacon',
          fsContext: 'local',
          sshConnectedHost: null,
          lastCatPath: null,
          lastCommandOutput: null,
          nodes: [],
          discoveries: [],
        },
        {
          type: 'command_executed',
          command: './activate_beacon.sh',
          working_directory: '/beacon',
          requires_discovery: 'FREQ=472.88',
        },
      ),
    ).toBe(false);
  });

  it('wins when discovery token present', () => {
    expect(
      checkWinCondition(
        {
          parsed: parseCommand('./activate_beacon.sh'),
          cwd: '/beacon',
          fsContext: 'local',
          sshConnectedHost: null,
          lastCatPath: null,
          lastCommandOutput: null,
          nodes: [],
          discoveries: ['FREQ=472.88'],
        },
        {
          type: 'command_executed',
          command: './activate_beacon.sh',
          working_directory: '/beacon',
          requires_discovery: 'FREQ=472.88',
        },
      ),
    ).toBe(true);
  });
});

describe('checkSequenceStep', () => {
  const condition = {
    type: 'sequence' as const,
    steps: [
      { command: './start_coolant.sh', working_directory: '/reactor' },
      { command: './start_core.sh', working_directory: '/reactor' },
      { command: './start_reactor.sh', working_directory: '/reactor' },
    ],
  };

  it('step 1 of 3 → not won, advances step', () => {
    const result = checkSequenceStep(
      {
        parsed: parseCommand('./start_coolant.sh'),
        cwd: '/reactor',
        fsContext: 'local',
        sshConnectedHost: null,
        lastCatPath: null,
        lastCommandOutput: null,
        nodes: [],
      },
      condition,
      0,
    );
    expect(result.won).toBe(false);
    expect(result.nextStep).toBe(1);
    expect(result.progressMessage).toContain('ШАГ 1/3');
  });

  it('all 3 steps → won', () => {
    const result = checkSequenceStep(
      {
        parsed: parseCommand('./start_reactor.sh'),
        cwd: '/reactor',
        fsContext: 'local',
        sshConnectedHost: null,
        lastCatPath: null,
        lastCommandOutput: null,
        nodes: [],
      },
      condition,
      2,
    );
    expect(result.won).toBe(true);
    expect(result.nextStep).toBe(3);
  });

  it('step 2 before step 1 → not counted', () => {
    const result = checkSequenceStep(
      {
        parsed: parseCommand('./start_core.sh'),
        cwd: '/reactor',
        fsContext: 'local',
        sshConnectedHost: null,
        lastCatPath: null,
        lastCommandOutput: null,
        nodes: [],
      },
      condition,
      0,
    );
    expect(result.won).toBe(false);
    expect(result.nextStep).toBe(0);
  });
});
