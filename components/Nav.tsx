
import Link from "next/link";

export function Nav() {
  const item = "px-3 py-1.5 rounded-lg hover:bg-brand-card/60 transition";
  return (
    <nav className="flex items-center gap-1 text-sm text-brand-ink/85">
      <Link className={item} href="/">홈</Link>
      <Link className={item} href="/overview">시장 개요</Link>
      <Link className={item} href="/btc">BTC 단기</Link>
      <Link className={item} href="/altcoin">알트 섹터</Link>
      <Link className={item} href="/insight">매크로 인사이트</Link>
    </nav>
  );
}
