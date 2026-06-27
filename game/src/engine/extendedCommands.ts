import type {
  DiskUsageEntry,
  LevelDefinition,
  MockProcess,
  NetworkIface,
  SystemctlService,
} from '../types/level.types';
import type { OutputLine } from './CommandParser';

function out(text: string): OutputLine {
  return { text, kind: 'output' };
}

function err(text: string): OutputLine {
  return { text, kind: 'error' };
}

function sys(text: string): OutputLine {
  return { text, kind: 'system' };
}

export function formatPsTable(processes: MockProcess[]): OutputLine[] {
  const header = 'USER       PID  %CPU %MEM  COMMAND';
  const rows = processes.map(
    (p) =>
      `${p.user.padEnd(10)} ${String(p.pid).padStart(4)}  ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)}  ${p.command}`,
  );
  return [header, ...rows].map((text) => out(text));
}

export function formatNetstat(processes: MockProcess[]): OutputLine[] {
  const withPorts = processes.filter((p) => p.port != null);
  const header = 'Proto  Local Address          PID/Program';
  const rows = withPorts.map(
    (p) => `tcp    0.0.0.0:${String(p.port).padEnd(6)}         ${p.pid}/${p.command}`,
  );
  return [header, ...rows].map((text) => out(text));
}

export function formatLsof(processes: MockProcess[], port: number): OutputLine[] {
  const found = processes.filter((p) => p.port === port);
  if (!found.length) {
    return [err(`lsof: no process on port ${port}`)];
  }
  const header = 'COMMAND  PID  USER   TYPE  NODE  NAME';
  const rows = found.map(
    (p) => `${p.command.padEnd(8)} ${p.pid}  ${p.user}   TCP   IPv4  *:${port}`,
  );
  return [header, ...rows].map((text) => out(text));
}

export function formatDf(entries?: DiskUsageEntry[]): OutputLine[] {
  const rows = entries ?? [
    { filesystem: '/dev/sda1', size: '500G', used: '487G', avail: '13G', mount: '/' },
  ];
  const header = 'Filesystem      Size  Used Avail  Mounted on';
  const lines = rows.map(
    (e) =>
      `${e.filesystem.padEnd(15)} ${e.size.padEnd(5)} ${e.used.padEnd(5)} ${e.avail.padEnd(6)}  ${e.mount}`,
  );
  return [header, ...lines].map((text) => out(text));
}

export function formatIpA(level: LevelDefinition, fallback: OutputLine[]): OutputLine[] {
  const ifaces: NetworkIface[] = level.network ?? [];
  if (!ifaces.length) return fallback;
  const lines: string[] = [];
  ifaces.forEach((n, i) => {
    lines.push(`${i + 1}: ${n.iface}: <${n.status}> mtu 1500`);
    lines.push(`    inet ${n.inet} scope global ${n.iface}`);
  });
  return lines.map((text) => out(text));
}

export function formatPing(host: string, level: LevelDefinition): OutputLine[] {
  const reachable = level.reachable_hosts ?? [];
  if (reachable.includes(host)) {
    return [
      out(`PING ${host}: 56 data bytes`),
      out(`64 bytes from ${host}: icmp_seq=0 ttl=64 time=1.2 ms`),
      out(`64 bytes from ${host}: icmp_seq=1 ttl=64 time=0.8 ms`),
      out(`64 bytes from ${host}: icmp_seq=2 ttl=64 time=1.1 ms`),
      out(`--- ${host} ping statistics ---`),
      out(`3 packets transmitted, 3 received, 0% packet loss`),
    ];
  }
  return [
    out(`PING ${host}: 56 data bytes`),
    err(`Request timeout for icmp_seq 0`),
    err(`Request timeout for icmp_seq 1`),
    out(`--- ${host} ping statistics ---`),
    err(`3 packets transmitted, 0 received, 100% packet loss`),
  ];
}

export function handleSystemctl(
  action: string,
  service: string,
  services: SystemctlService[],
  serviceStates: Record<string, 'active' | 'inactive' | 'failed'>,
): { lines: OutputLine[]; newStates: Record<string, 'active' | 'inactive' | 'failed'> } {
  const svc = services.find((s) => s.name === service);
  if (!svc) {
    return {
      lines: [err(`Unit ${service}.service could not be found.`)],
      newStates: serviceStates,
    };
  }
  const current = serviceStates[service] ?? svc.status;

  if (action === 'start') {
    if (!svc.is_enabled) {
      return {
        lines: [err(`Failed to start ${service}: Permission denied`)],
        newStates: serviceStates,
      };
    }
    return {
      lines: [out(`[  OK  ] Started ${service}.`)],
      newStates: { ...serviceStates, [service]: 'active' },
    };
  }

  if (action === 'status') {
    return {
      lines: [
        out(`● ${service}.service`),
        current === 'active' ? out(`   Active: active (running)`) : sys(`   Active: ${current}`),
      ],
      newStates: serviceStates,
    };
  }

  return { lines: [err(`Unknown action: ${action}`)], newStates: serviceStates };
}

export function formatTailF(fileContent: string, stream: string[]): OutputLine[] {
  const lines = fileContent.split('\n').filter(Boolean);
  const tail = lines.slice(-10);
  const result = tail.map((l) => out(l));
  for (const line of stream) {
    result.push(out(line));
  }
  result.push(sys('^C'));
  return result;
}

export function killProcess(
  processes: MockProcess[],
  pid: number,
): { ok: true; processes: MockProcess[] } | { ok: false; error: string } {
  const proc = processes.find((p) => p.pid === pid);
  if (!proc) {
    return { ok: false, error: `kill: (${pid}) - No such process` };
  }
  return {
    ok: true,
    processes: processes.filter((p) => p.pid !== pid),
  };
}

export function isTargetKilled(processes: MockProcess[], targets: MockProcess[]): boolean {
  if (!targets.length) return true;
  return targets.every((t) => !processes.some((p) => p.pid === t.pid));
}
