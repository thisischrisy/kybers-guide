
import "../styles/globals.css";
import { Brand } from "@/components/Brand";
import { Nav } from "@/components/Nav";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata = {
  title: "Kyber’s Guide | Crypto Insight Dashboard",
  description: "시장 감정자와 가능성 가정자를 위한 최고의 조명 대시보드"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-brand-bg text-brand-ink">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-brand-line/40 sticky top-0 backdrop-blur bg-brand-bg/75 z-50">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
              <Brand />
              <Nav />
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <Disclaimer />
          <footer className="border-t border-brand-line/40">
            <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-brand-ink/70 flex flex-col sm:flex-row gap-2 sm:gap-6">
              <div>© {new Date().getFullYear()} Kyber’s Guide</div>
              <div className="opacity-70">데이터 출처: CoinGecko, DeFiLlama, Alternative.me, FRED</div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
