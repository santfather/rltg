import type { LevelId } from '../types/level.types';

export interface ShipNode {
  id: LevelId;
  label: string;
  row: number;
  col: number;
}

export const SHIP_MAP_NODES: ShipNode[] = [
  { id: 'level_00', label: 'POD', row: 0, col: 0 },
  { id: 'level_01', label: 'AIRLOCK', row: 0, col: 1 },
  { id: 'level_02', label: 'BRIDGE', row: 0, col: 2 },
  { id: 'level_03', label: 'CREW', row: 0, col: 3 },
  { id: 'level_04', label: 'COMMS', row: 1, col: 1 },
  { id: 'level_05', label: 'TURRET', row: 1, col: 3 },
  { id: 'level_06', label: 'CARGO', row: 1, col: 0 },
  { id: 'level_07', label: 'ENGINE', row: 2, col: 0 },
  { id: 'level_08', label: 'REACTOR', row: 2, col: 1 },
  { id: 'level_09', label: 'NETWORK', row: 2, col: 2 },
];

export type NodeStatus = 'done' | 'current' | 'locked';

export function getNodeStatus(
  id: LevelId,
  currentLevelId: LevelId,
  completedLevels: LevelId[],
): NodeStatus {
  if (id === currentLevelId) return 'current';
  if (completedLevels.includes(id)) return 'done';
  return 'locked';
}

export function statusSymbol(status: NodeStatus): string {
  switch (status) {
    case 'done':
      return '✓';
    case 'current':
      return '██';
    case 'locked':
      return '…';
  }
}
