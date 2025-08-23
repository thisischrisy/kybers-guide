// app/altcoin/page.tsx
import dynamic from "next/dynamic";
import { AdSlot } from "@/components/AdSlot";

export const revalidate = 600;

// ✅ AltcoinContent는 default export 이므로 아래처럼!
const AltcoinContent = dynamic(() => import("./AltcoinContent"), { ssr: false });

export default function AltcoinPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h2 className="text-xl font-semibold">알트코인 섹터</h2>

      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4 text-sm text-brand-ink/80">
        알트코인 시장의 상승/하락 상위 종목을 한눈에 확인하세요. (24h 기준)
      </div>

      {/* 필터 + 목록 */}
      <AltcoinContent />

      {/* 광고 */}
      <AdSlot id="altcoin-mid" />

      {/* 개발 중 섹션 */}
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        섹터별 Top 3 리스트 및 24h/7d/30d — (추가 예정)
      </div>
    </div>
  );
}