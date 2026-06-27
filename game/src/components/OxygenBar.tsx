interface OxygenBarProps {
  oxygen: number;
}

/** Global oxygen meter in the top HUD */
export default function OxygenBar({ oxygen }: OxygenBarProps) {
  const color =
    oxygen > 40 ? 'var(--crt-green)' : oxygen >= 20 ? 'var(--crt-amber)' : 'var(--crt-red)';

  return (
    <div className="flex items-center gap-2 font-[family-name:var(--font-terminal)] text-sm">
      <span>O2</span>
      <div className="h-1 w-32 bg-[var(--crt-dim)]">
        <div
          className="h-full transition-all"
          style={{ width: `${oxygen}%`, backgroundColor: color }}
        />
      </div>
      <span style={{ color }}>{oxygen}%</span>
    </div>
  );
}
