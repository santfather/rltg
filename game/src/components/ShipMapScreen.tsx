import { useEffect } from 'react';
import { getNodeStatus, statusSymbol } from '../data/shipMap';
import type { LevelId } from '../types/level.types';

interface ShipMapScreenProps {
  currentLevelId: LevelId;
  completedLevels: LevelId[];
  onClose: () => void;
}

function sym(id: LevelId, current: LevelId, completed: LevelId[]): string {
  return statusSymbol(getNodeStatus(id, current, completed));
}

/** ASCII ship map overlay — completed/current/locked compartments */
export default function ShipMapScreen({
  currentLevelId,
  completedLevels,
  onClose,
}: ShipMapScreenProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const c = completedLevels;
  const cur = currentLevelId;

  const mapLines = [
    '  ╔══════╗  ╔══════════╗  ╔════════╗  ╔═══════╗',
    `  ║ POD  ║══║ AIRLOCK  ║══║ BRIDGE ║══║ CREW  ║`,
    `  ║  ${sym('level_00', cur, c).padEnd(2)}  ║  ║    ${sym('level_01', cur, c).padEnd(2)}     ║  ║   ${sym('level_02', cur, c).padEnd(2)}   ║  ║   ${sym('level_03', cur, c).padEnd(2)}  ║`,
    '  ╚══════╝  ╚══════════╝  ╚════════╝  ╚═══════╝',
    '                                              ║',
    '  ╔══════════╗  ╔══════════╗           ╔═══╩═══╗',
    `  ║  CARGO   ║══║  COMMS   ║           ║TURRET ║`,
    `  ║    ${sym('level_06', cur, c).padEnd(2)}    ║  ║    ${sym('level_04', cur, c).padEnd(2)}     ║           ║  ${sym('level_05', cur, c).padEnd(2)}  ║`,
    '  ╚══════════╝  ╚══════════╝           ╚═══════╝',
    '                                              ║',
    '              ╔════════╗  ╔═══════╗  ╔════════╩═╗  ╔═══════╗',
    `              ║ ENGINE ║══║REACTOR║══║  NETWORK ║  ║  SOS  ║`,
    `              ║   ${sym('level_07', cur, c).padEnd(2)}    ║  ║  ${sym('level_08', cur, c).padEnd(2)}    ║  ║    ${sym('level_09', cur, c).padEnd(2)}     ║  ║  …    ║`,
    '              ╚════════╝  ╚═══════╝  ╚══════════╝  ╚═══════╝',
  ];

  return (
    <div className="ship-map-overlay" role="dialog" aria-label="Карта корабля">
      <div className="ship-map">
        <p className="ship-map__header">NOSTROMO-8 // КАРТА КОРАБЛЯ                           [ESC]</p>
        <pre className="ship-map__ascii">{mapLines.join('\n')}</pre>
        <p className="ship-map__current ship-map__node--current">
          ТЕКУЩИЙ ОТСЕК: {currentLevelId.replace('level_', 'МИССИЯ ')}
        </p>
        <p className="ship-map__legend">
          ✓ ПРОЙДЕНО   ██ ТЕКУЩИЙ   … ЗАБЛОКИРОВАНО      [ESC] ЗАКРЫТЬ
        </p>
        <button type="button" className="ship-map__close" onClick={onClose}>
          [ESC] ЗАКРЫТЬ
        </button>
      </div>
    </div>
  );
}
