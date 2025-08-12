
export default function BTCPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h2 className="text-xl font-semibold">비트코인 단기 분석</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">가격 캔들 (추가 예정)</div>
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">RSI / MACD</div>
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">MVRV — TBD</div>
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">Funding / Whale — TBD</div>
      </div>
    </div>
  );
}
