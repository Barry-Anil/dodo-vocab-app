interface Bucket {
  label: string;
  count: number;
}

export function WeeklyBarChart({ data }: { data: Bucket[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{d.count > 0 ? d.count : ""}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-sm bg-primary/70 transition-all"
              style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
