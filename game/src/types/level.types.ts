/** Archive entry stored inside a tar node */
export interface ArchiveEntry {
  path: string;
  content: string;
}

/** Virtual filesystem node (runtime + YAML source) */
export interface VirtualNode {
  path: string;
  type: 'file' | 'dir';
  content?: string;
  permissions?: string;
  isArchive?: boolean;
  archiveContents?: ArchiveEntry[];
}

/** Remote SSH filesystem config from level YAML */
export interface RemoteFilesystem {
  host: string;
  user: string;
  filesystem: VirtualNode[];
}

/** Simulated OS process for ps / netstat / kill */
export interface MockProcess {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  command: string;
  port?: number;
  is_target?: boolean;
}

/** df -h row from YAML */
export interface DiskUsageEntry {
  filesystem: string;
  size: string;
  used: string;
  avail: string;
  mount: string;
}

/** systemctl service definition */
export interface SystemctlService {
  name: string;
  status: 'active' | 'inactive' | 'failed';
  is_enabled: boolean;
}

/** Network interface for ip a */
export interface NetworkIface {
  iface: string;
  inet: string;
  status: 'UP' | 'DOWN';
}

/** Sequence win step */
export interface WinSequenceStep {
  command: string;
  working_directory: string;
}

/** Learning objective entry */
export interface LearningObjective {
  command: string;
  description: string;
  example: string;
}

/** Hint entry (exactly 3 per level) */
export interface Hint {
  level: 1 | 2 | 3;
  text: string;
}

/** Win condition — parsed from level YAML */
export interface WinCondition {
  type:
    | 'command_executed'
    | 'file_read'
    | 'file_created'
    | 'process_killed_and_command'
    | 'sequence';
  command?: string;
  file?: string;
  path?: string;
  working_directory?: string;
  contains?: string;
  requires_ssh?: boolean;
  ssh_host?: string;
  target_pid?: number;
  /** Must appear in grep output before win (e.g. FREQ=472.88) */
  requires_discovery?: string;
  steps?: WinSequenceStep[];
}

/** Level reward on completion */
export interface LevelReward {
  oxygen_bonus: number;
  score: number;
  unlock_log?: string;
}

/** Interactive hotspot in section ASCII plan */
export interface SectionHotspot {
  id: string;
  label: string;
  tooltip: string;
  detail?: string;
  nudge?: string;
}

/** ASCII section plan with hover hotspots */
export interface SectionPlan {
  ascii: string;
  hotspots: SectionHotspot[];
}

/** Raw file node as it appears in level YAML */
export interface FileNodeYaml {
  path: string;
  type: 'dir' | 'file';
  permissions?: string;
  content?: string;
  is_archive?: boolean;
  archive_contents?: ArchiveEntry[];
}

/** Full level definition parsed from YAML */
export interface LevelDefinition {
  id: string;
  title: string;
  location: string;
  narrative: string[];
  filesystem: FileNodeYaml[];
  learning_objectives: LearningObjective[];
  win_condition: WinCondition;
  hints: [Hint, Hint, Hint];
  reward: LevelReward;
  ascii_art?: string;
  /** Scene image filename in src/assets/scenes/ (e.g. level_01.svg) */
  ascii_art_path?: string;
  section_plan?: SectionPlan;
  remote_filesystem?: RemoteFilesystem;
  sudo_password?: string;
  mock_processes?: MockProcess[];
  disk_usage?: DiskUsageEntry[];
  tail_stream?: string[];
  systemctl_services?: SystemctlService[];
  network?: NetworkIface[];
  reachable_hosts?: string[];
}

/** Loaded level ready for gameplay */
export interface LoadedLevel {
  definition: LevelDefinition;
  localNodes: VirtualNode[];
  remoteNodes: VirtualNode[];
  oxygenEnabled: boolean;
}

/** Ordered level IDs for progression */
export const LEVEL_ORDER = [
  'level_00',
  'level_01',
  'level_02',
  'level_03',
  'level_04',
  'level_05',
  'level_06',
  'level_07',
  'level_08',
  'level_09',
] as const;

export type LevelId = (typeof LEVEL_ORDER)[number];

/** Returns the next level id after `current`, or null if at the end */
export function getNextLevelId(current: LevelId): LevelId | null {
  const idx = LEVEL_ORDER.indexOf(current);
  if (idx < 0 || idx >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1];
}

/** First level not yet in `completed`, or level_00 if all done */
export function getFirstIncompleteLevel(completed: LevelId[]): LevelId {
  const set = new Set(completed);
  return LEVEL_ORDER.find((id) => !set.has(id)) ?? LEVEL_ORDER[0];
}
