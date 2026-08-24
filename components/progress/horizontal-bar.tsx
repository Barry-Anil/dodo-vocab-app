interface Row {
  label: string;
  value: number; // 0-1 fraction, or use `raw` for a plain count instead
  displayValue?: string;
}

export function HorizontalBarList({ rows, emptyMessage }: { rows: Row[]; emptyMessage: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span>{row.label}</span>
            <span className="text-muted-foreground">{row.displayValue ?? `${Math.round(row.value * 100)}%`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${Math.max(2, Math.min(100, row.value * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
