// components/Badge.tsx
export function Badge({ tone, children }: { tone: "buy" | "sell" | "neutral"; children: React.ReactNode }) {
  const map = {
    buy: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    sell: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    // ⚠️ 중립을 회색→노랑(amber)으로 변경
    neutral: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  } as const;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${map[tone]}`}>
      {children}
    </span>
  );
}