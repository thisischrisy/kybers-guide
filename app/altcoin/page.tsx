import dynamic from "next/dynamic";
import { AdSlot } from "@/components/AdSlot";

const AltTopMovers = dynamic(
  () => import("@/components/AltTopMovers").then((m) => m.AltTopMovers),
  { ssr: false }
);

export const revalidate = 600; // 10분

export default function AltcoinPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h2 className="text-xl font-semibold">알트코인 섹터</h2>

      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4 text-sm text-brand-ink/80">
        알트코인 시장의 상승/하락 상위 종목을 한눈에 확인하세요. (24h 기준)
      </div>

      {/* ✅ Top Movers (24h) */}
      <AltTopMovers />

      {/* 광고 */}
      <AdSlot id="altcoin-mid" />

      {/* 추후: 섹터 분류/신호 (개발 중 안내) */}
      <div className="rounded-xl border border-brand-line/20 bg-brand-card/40 p-6 text-sm text-brand-ink/70">
        섹터별 Top 3, RSI/MA 신호, Altcoin Season 지수는 업데이트 예정입니다.
      </div>
    </div>
  );
}