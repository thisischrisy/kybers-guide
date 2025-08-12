
export function AdSlot({ id, className }: { id: string; className?: string }) {
  return (
    <div
      id={id}
      className={
        "rounded-xl border border-brand-line/30 bg-brand-card/50 shadow-card min-h-[90px] flex items-center justify-center text-xs text-brand-ink/60 " +
        (className ?? "")
      }
    >
      {/* 여기에 AdSense 또는 Coinzilla 스크립트를 붙입니다 */}
      광고 영역: {id}
    </div>
  );
}
