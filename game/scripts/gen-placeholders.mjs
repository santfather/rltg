import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../src/assets/scenes');

const levels = [
  { file: 'level_00.svg', name: 'ESCAPE POD', color: '#001100' },
  { file: 'level_01.svg', name: 'AIRLOCK', color: '#001a00' },
  { file: 'level_02.svg', name: 'CREW QUARTERS', color: '#001500' },
  { file: 'level_03.svg', name: 'CARGO BAY', color: '#001800' },
  { file: 'level_04.svg', name: 'COMMS BRIDGE', color: '#001200' },
  { file: 'level_05.svg', name: 'TURRET POST', color: '#001400' },
  { file: 'level_06.svg', name: 'COMMS BEACON', color: '#001300' },
  { file: 'level_07.svg', name: 'ENGINE ROOM', color: '#001600' },
  { file: 'level_08.svg', name: 'REACTOR BAY', color: '#001700' },
  { file: 'level_09.svg', name: 'NETWORK HUB', color: '#001900' },
];

mkdirSync(outDir, { recursive: true });

for (const lvl of levels) {
  const missionId = lvl.file.match(/level_(\d+)/)?.[1] ?? '?';
  const svg = `<svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="240" fill="${lvl.color}"/>
  <text x="160" y="100" text-anchor="middle" fill="#00ff41"
        font-family="monospace" font-size="14">NOSTROMO-8</text>
  <text x="160" y="130" text-anchor="middle" fill="#00ff41"
        font-family="monospace" font-size="18">${lvl.name}</text>
  <text x="160" y="160" text-anchor="middle" fill="#003b00"
        font-family="monospace" font-size="11">MISSION ${missionId}</text>
</svg>`;
  writeFileSync(join(outDir, lvl.file), svg);
}

console.log(`Placeholders generated in ${outDir}`);
