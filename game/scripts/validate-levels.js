import { readFileSync, readdirSync } from 'fs';
import yaml from 'js-yaml';

const REQUIRED_FIELDS = [
  'id',
  'title',
  'location',
  'narrative',
  'filesystem',
  'learning_objectives',
  'win_condition',
  'hints',
  'reward',
];

const WIN_TYPES = [
  'command_executed',
  'file_read',
  'file_created',
  'process_killed_and_command',
  'sequence',
];

const FAILSAFE_SCHEMA = {
  winTypes: WIN_TYPES,
  hintCount: 3,
};

console.log(`ℹ️  FAILSAFE_SCHEMA v1: winTypes=${FAILSAFE_SCHEMA.winTypes.join('|')}, hints=${FAILSAFE_SCHEMA.hintCount}`);

const levelsDir = new URL('../src/levels', import.meta.url).pathname;

const files = readdirSync(levelsDir).filter((f) => f.endsWith('.yaml'));
let hasErrors = false;

if (files.length === 0) {
  console.log('ℹ️  No YAML level files yet — skipping validation.');
  process.exit(0);
}

for (const file of files) {
  let fileHasErrors = false;
  let level;
  try {
    const content = readFileSync(`${levelsDir}/${file}`, 'utf8');
    level = yaml.load(content);
  } catch (e) {
    console.error(`❌ ${file}: YAML parse error — ${e.message}`);
    hasErrors = true;
    continue;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!level[field]) {
      console.error(`❌ ${file}: missing field "${field}"`);
      fileHasErrors = true;
    }
  }

  if (level.hints && level.hints.length !== 3) {
    console.error(`❌ ${file}: hints must contain exactly 3 entries`);
    fileHasErrors = true;
  }

  if (level.section_plan) {
    const { ascii, hotspots } = level.section_plan;
    if (!ascii || !Array.isArray(hotspots)) {
      console.error(`❌ ${file}: section_plan requires ascii and hotspots[]`);
      fileHasErrors = true;
    } else {
      for (const hs of hotspots) {
        if (!hs.label || !ascii.includes(hs.label)) {
          console.error(
            `❌ ${file}: hotspot "${hs.id ?? '?'}" label "${hs.label}" not found in section_plan.ascii`,
          );
          fileHasErrors = true;
        }
      }
    }
  }

  if (level.win_condition && !WIN_TYPES.includes(level.win_condition.type)) {
    console.error(`❌ ${file}: unknown win_condition.type "${level.win_condition.type}"`);
    fileHasErrors = true;
  }

  if (level.win_condition?.type === 'sequence') {
    const steps = level.win_condition.steps;
    if (!Array.isArray(steps) || steps.length === 0) {
      console.error(`❌ ${file}: sequence win_condition requires non-empty steps[]`);
      fileHasErrors = true;
    }
  }

  if (fileHasErrors) {
    hasErrors = true;
  } else {
    console.log(`✅ ${file}`);
  }
}

if (hasErrors) process.exit(1);
