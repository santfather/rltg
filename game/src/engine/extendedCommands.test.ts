import { describe, it, expect } from 'vitest';
import {
  formatPsTable,
  formatNetstat,
  formatDf,
  formatPing,
  killProcess,
  isTargetKilled,
} from './extendedCommands';
import type { MockProcess } from '../types/level.types';

const sampleProcesses: MockProcess[] = [
  { pid: 4821, user: 'root', cpu: 98.7, mem: 12.4, command: 'turret_daemon', port: 4821, is_target: true },
  { pid: 1102, user: 'pilot', cpu: 0.0, mem: 0.2, command: 'sshd', port: 22 },
];

describe('extendedCommands', () => {
  it('formatPsTable includes header and process rows', () => {
    const lines = formatPsTable(sampleProcesses);
    expect(lines[0].text).toContain('USER');
    expect(lines.some((l) => l.text.includes('4821'))).toBe(true);
  });

  it('formatNetstat lists only processes with ports', () => {
    const lines = formatNetstat(sampleProcesses);
    expect(lines.some((l) => l.text.includes(':4821'))).toBe(true);
    expect(lines.some((l) => l.text.includes('web_monitor'))).toBe(false);
  });

  it('formatDf uses YAML entries', () => {
    const lines = formatDf([
      { filesystem: '/dev/sda1', size: '500G', used: '487G', avail: '13G', mount: '/' },
    ]);
    expect(lines.some((l) => l.text.includes('/dev/sda1'))).toBe(true);
  });

  it('formatPing returns success for reachable host', () => {
    const lines = formatPing('10.0.0.42', {
      reachable_hosts: ['10.0.0.42'],
    } as never);
    expect(lines.some((l) => l.text.includes('0% packet loss'))).toBe(true);
  });

  it('formatPing returns timeout for unreachable host', () => {
    const lines = formatPing('10.0.0.99', {
      reachable_hosts: ['10.0.0.42'],
    } as never);
    expect(lines.some((l) => l.kind === 'error')).toBe(true);
  });

  it('killProcess removes pid from list', () => {
    const result = killProcess(sampleProcesses, 4821);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.processes.some((p) => p.pid === 4821)).toBe(false);
    }
  });

  it('isTargetKilled is false while target alive', () => {
    expect(isTargetKilled(sampleProcesses, sampleProcesses.filter((p) => p.is_target))).toBe(false);
  });

  it('isTargetKilled is true after kill', () => {
    const killed = sampleProcesses.filter((p) => p.pid !== 4821);
    expect(isTargetKilled(killed, sampleProcesses.filter((p) => p.is_target))).toBe(true);
  });
});
