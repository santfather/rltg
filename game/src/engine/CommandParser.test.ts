import { describe, it, expect } from 'vitest';
import { parseCommand } from './WinConditionChecker';
import { createFSState, ls, cd, chmod, canExecute, find } from './FileSystem';
import { executeCommand, createCommandContext } from './CommandParser';
import { loadLevel } from './LevelLoader';
import { completeTabInput } from './TabCompletion';
import level01 from '../levels/level_01_airlock.yaml?raw';
import level04 from '../levels/level_04_comms.yaml?raw';
import level05 from '../levels/level_05_turret.yaml?raw';
import level07 from '../levels/level_07_engine.yaml?raw';
import level08 from '../levels/level_08_reactor.yaml?raw';
import level09 from '../levels/level_09_network.yaml?raw';
import { useGameStore } from '../store/gameStore';

function resetStore(): void {
  useGameStore.setState({
    hasSudo: false,
    activeProcesses: [],
    sequenceStep: 0,
    discoveries: [],
    serviceStates: {},
  });
}

describe('parseCommand', () => {
  it('splits input into tokens', () => {
    expect(parseCommand('ls -la').tokens).toEqual(['ls', '-la']);
  });

  it('returns empty tokens for blank input', () => {
    expect(parseCommand('   ').tokens).toEqual([]);
  });
});

describe('FileSystem', () => {
  const nodes = [
    { path: '/', type: 'dir' as const },
    { path: '/system_core', type: 'dir' as const },
    {
      path: '/system_core/open_door.sh',
      type: 'file' as const,
      permissions: '000',
      content: '#!/bin/bash\necho "DOOR OPEN"',
    },
  ];

  it('lists directory entries', () => {
    const state = createFSState(nodes, '/');
    const result = ls(state, '/system_core');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toContain('open_door.sh');
  });

  it('changes directory', () => {
    const state = createFSState(nodes, '/');
    const result = cd(state, '/system_core');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.cwd).toBe('/system_core');
  });

  it('chmod +x enables script execution', () => {
    let state = createFSState(nodes, '/system_core');
    const chmodResult = chmod(state, '+x', 'open_door.sh');
    expect(chmodResult.ok).toBe(true);
    if (!chmodResult.ok) return;
    state = chmodResult.value;
    const node = state.nodes.find((n) => n.path === '/system_core/open_door.sh');
    expect(node && canExecute(node)).toBe(true);
  });

  it('find returns empty for name pattern with no matches', () => {
    const state = createFSState(nodes, '/');
    const paths = find(state, '/', '*.missing');
    expect(paths).toEqual([]);
  });
});

describe('grep edge cases', () => {
  it('returns no lines for invalid regex pattern', () => {
    const nodes = [
      { path: '/', type: 'dir' as const },
      { path: '/notes.txt', type: 'file' as const, permissions: '644', content: 'hello world' },
    ];
    const loaded = loadLevel(level01);
    const ctx = createCommandContext(loaded.definition, nodes, []);
    const result = executeCommand('grep [invalid notes.txt', ctx);
    expect(result.lines).toEqual([]);
  });
});

describe('tar edge cases', () => {
  it('fails when archive is not valid', () => {
    const nodes = [
      { path: '/', type: 'dir' as const },
      { path: '/broken.tar.gz', type: 'file' as const, content: 'not an archive' },
    ];
    const loaded = loadLevel(level01);
    let ctx = createCommandContext(loaded.definition, nodes, []);
    ctx = executeCommand('cd /', ctx).context;
    const result = executeCommand('tar -xzf broken.tar.gz', ctx);
    expect(result.lines.some((l) => l.kind === 'error')).toBe(true);
  });
});

describe('Level 01 airlock flow', () => {
  const loaded = loadLevel(level01);
  let ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);

  it('denies script execution without chmod', () => {
    ctx = executeCommand('cd /system_core', ctx).context;
    const result = executeCommand('./open_door.sh', ctx);
    expect(result.lines.some((l) => l.text.includes('Permission denied'))).toBe(true);
  });

  it('completes mission after chmod and execute', () => {
    ctx = executeCommand('chmod +x open_door.sh', ctx).context;
    const result = executeCommand('./open_door.sh', ctx);
    expect(result.lines.some((l) => l.text.includes('ДВЕРЬ ОТКРЫТА'))).toBe(true);
    expect(result.context.localFS.cwd).toBe('/system_core');
  });
});

describe('Level 04 SSH flow', () => {
  const loaded = loadLevel(level04);

  it('starts ssh pending state', () => {
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('ssh rescue_op@10.0.0.42', ctx);
    expect(result.context.sshPending).not.toBeNull();
    expect(result.context.sshPending?.expectedPassword).toBe('Jonas-7749-ALPHA');
  });

  it('rejects wrong password', () => {
    let ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    ctx = executeCommand('ssh rescue_op@10.0.0.42', ctx).context;
    const result = executeCommand('wrong-password', ctx);
    expect(result.lines.some((l) => l.text.includes('Permission denied'))).toBe(true);
    expect(result.context.sshPending).toBeNull();
    expect(result.executedCommand).toBeNull();
  });

  it('connects with correct password', () => {
    let ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    ctx = executeCommand('ssh rescue_op@10.0.0.42', ctx).context;
    const result = executeCommand('Jonas-7749-ALPHA', ctx);
    expect(result.context.fsContext).toBe('remote');
    expect(result.context.sshConnectedHost).toBe('10.0.0.42');
  });

  it('returns to local on exit', () => {
    let ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    ctx = executeCommand('ssh rescue_op@10.0.0.42', ctx).context;
    ctx = executeCommand('Jonas-7749-ALPHA', ctx).context;
    const result = executeCommand('exit', ctx);
    expect(result.context.fsContext).toBe('local');
    expect(result.context.sshConnectedHost).toBeNull();
  });
});

describe('hint penalty via executeCommand', () => {
  it('tracks hint usage in context', () => {
    const loaded = loadLevel(level01);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('hint 3', ctx);
    expect(result.context.usedHints).toContain(3);
  });

  it('does not duplicate used hint level', () => {
    const loaded = loadLevel(level01);
    let ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    ctx = executeCommand('hint 3', ctx).context;
    const again = executeCommand('hint 3', ctx);
    expect(again.context.usedHints.filter((h) => h === 3).length).toBe(1);
  });
});

describe('TabCompletion', () => {
  it('completes unique directory prefix for cd', () => {
    const loaded = loadLevel(level01);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = completeTabInput('cd sys', ctx, false);
    expect(result.newInput).toContain('system_core');
    expect(result.bell).toBe(false);
  });

  it('lists matches on showAll', () => {
    const loaded = loadLevel(level01);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = completeTabInput('cd ', ctx, true);
    expect(result.listLines.length).toBeGreaterThan(0);
  });
});

describe('v2 mock processes and sudo', () => {
  beforeEach(() => resetStore());

  it('kill without sudo → permission denied', () => {
    const loaded = loadLevel(level05);
    useGameStore.getState().setActiveProcesses(loaded.definition.mock_processes ?? []);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('kill -9 4821', ctx);
    expect(result.lines.some((l) => l.text.includes('Operation not permitted'))).toBe(true);
  });

  it('sudo netstat prompts for password', () => {
    const loaded = loadLevel(level05);
    useGameStore.getState().setActiveProcesses(loaded.definition.mock_processes ?? []);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('sudo netstat -tlnp', ctx);
    expect(result.context.sudoPending).not.toBeNull();
    expect(result.lines.some((l) => l.text.includes('password for pilot'))).toBe(true);
  });

  it('sudo kill succeeds after correct password', () => {
    const loaded = loadLevel(level05);
    let ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    useGameStore.getState().initLevel(loaded, ctx);
    ctx = useGameStore.getState().commandContext!;
    ctx = executeCommand('sudo kill -9 4821', ctx).context;
    expect(ctx.sudoPending?.effectiveCmd).toBe('kill -9 4821');
    const result = executeCommand('n0str0m0', ctx);
    expect(result.lines.map((l) => l.text)).toContain('Process 4821 (turret_daemon) terminated.');
    expect(useGameStore.getState().activeProcesses.some((p) => p.pid === 4821)).toBe(false);
  });

  it('kill works without sudo when hasSudo', () => {
    const loaded = loadLevel(level05);
    useGameStore.getState().setActiveProcesses(loaded.definition.mock_processes ?? []);
    useGameStore.getState().setHasSudo(true);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('kill -9 4821', ctx);
    expect(result.lines.some((l) => l.text.includes('terminated'))).toBe(true);
  });

  it('ps aux shows mock processes', () => {
    const loaded = loadLevel(level05);
    useGameStore.getState().setActiveProcesses(loaded.definition.mock_processes ?? []);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('ps aux', ctx);
    expect(result.lines.some((l) => l.text.includes('turret_daemon'))).toBe(true);
  });

  it('netstat -tlnp shows port 4821 with sudo', () => {
    const loaded = loadLevel(level05);
    useGameStore.getState().setActiveProcesses(loaded.definition.mock_processes ?? []);
    useGameStore.getState().setHasSudo(true);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('netstat -tlnp', ctx);
    expect(result.lines.some((l) => l.text.includes('4821'))).toBe(true);
  });

  it('lsof -i :4821 finds turret process with sudo', () => {
    const loaded = loadLevel(level05);
    useGameStore.getState().setActiveProcesses(loaded.definition.mock_processes ?? []);
    useGameStore.getState().setHasSudo(true);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('lsof -i :4821', ctx);
    expect(result.lines.some((l) => l.text.includes('turret_daemon'))).toBe(true);
  });

  it('pipe ps aux | grep turret filters output', () => {
    const loaded = loadLevel(level05);
    useGameStore.getState().setActiveProcesses(loaded.definition.mock_processes ?? []);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('ps aux | grep turret', ctx);
    expect(result.lines.every((l) => l.text.includes('turret'))).toBe(true);
    expect(result.executedCommand?.command).toBe('grep');
  });

  it('[SUDO_GRANTED] in script sets hasSudo', () => {
    const nodes = [
      { path: '/', type: 'dir' as const },
      {
        path: '/grant_admin.sh',
        type: 'file' as const,
        permissions: '755',
        content: '#!/bin/bash\necho "[SUDO_GRANTED]"',
      },
    ];
    const loaded = loadLevel(level01);
    const ctx = createCommandContext(loaded.definition, nodes, []);
    const result = executeCommand('./grant_admin.sh', ctx);
    expect(useGameStore.getState().hasSudo).toBe(true);
    expect(result.lines.some((l) => l.text.includes('[SUDO_GRANTED]'))).toBe(false);
  });
});

describe('v2 new commands', () => {
  beforeEach(() => resetStore());

  it('df -h reads disk_usage from YAML', () => {
    const loaded = loadLevel(level07);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('df -h', ctx);
    expect(result.lines.some((l) => l.text.includes('/dev/sdb1'))).toBe(true);
  });

  it('ip a uses network from YAML', () => {
    const loaded = loadLevel(level09);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('ip a', ctx);
    expect(result.lines.some((l) => l.text.includes('10.0.0.5'))).toBe(true);
  });

  it('ping reachable host succeeds', () => {
    const loaded = loadLevel(level09);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('ping 10.0.0.42', ctx);
    expect(result.lines.some((l) => l.text.includes('0% packet loss'))).toBe(true);
  });

  it('ping unreachable host times out', () => {
    const loaded = loadLevel(level09);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('ping 10.0.0.99', ctx);
    expect(result.lines.some((l) => l.kind === 'error')).toBe(true);
  });

  it('tail -f streams YAML tail_stream lines', () => {
    const loaded = loadLevel(level08);
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    const result = executeCommand('tail -f logs/reactor.log', ctx);
    expect(result.lines.some((l) => l.text.includes('coolant_pump'))).toBe(true);
    expect(result.lines.some((l) => l.text.includes('^C'))).toBe(true);
  });

  it('systemctl status reports service state', () => {
    const loaded = loadLevel(level08);
    useGameStore.getState().setServiceState('coolant_pump', 'inactive');
    const ctx = createCommandContext(loaded.definition, loaded.localNodes, loaded.remoteNodes);
    useGameStore.getState().setHasSudo(true);
    const result = executeCommand('systemctl status coolant_pump', ctx);
    expect(result.lines.some((l) => l.text.includes('coolant_pump'))).toBe(true);
  });
});
