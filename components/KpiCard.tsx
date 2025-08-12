
export function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
      <div className="text-xs uppercase tracking-wide text-brand-ink/60">{title}</div>
      <div className="mt-1 text-xl font-semibold text-brand-gold">{value}</div>
    </div>
  );
}
