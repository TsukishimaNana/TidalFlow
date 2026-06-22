interface ProgressBarProps {
  value: number;
  label?: string;
  color?: keyof typeof COLOR_CLASSES;
}

const COLOR_CLASSES = {
  amber: 'from-amber-400 to-amber-500',
  teal: 'from-teal-400 to-teal-500',
  emerald: 'from-emerald-400 to-emerald-500',
  red: 'from-red-400 to-red-500',
  stone: 'from-stone-400 to-stone-500'
} as const;

function clampProgressValue(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

export default function ProgressBar({ value, label, color = 'amber' }: ProgressBarProps): JSX.Element {
  const normalizedValue = clampProgressValue(value);
  const percentage = Math.round(normalizedValue);
  const colorClass = COLOR_CLASSES[color] ?? COLOR_CLASSES.amber;

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 truncate text-xs font-medium text-stone-600">{label}</div>
      )}
      <div className="flex items-center gap-3">
        <div
          className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-200"
          role="progressbar"
          aria-label={label ?? 'Progress'}
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-[width] duration-300 ease-out`}
            style={{ width: `${normalizedValue}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-stone-500">{percentage}%</span>
      </div>
    </div>
  );
}
