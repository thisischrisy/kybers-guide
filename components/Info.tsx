export function Info({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-brand-ink/70" title={tip}>
      {label}
      <span className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-brand-line/40">i</span>
    </span>
  );
}