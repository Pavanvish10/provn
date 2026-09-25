export function StatTile({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | string | undefined;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-2xl">{loading ? "—" : (value ?? 0)}</div>
    </div>
  );
}
