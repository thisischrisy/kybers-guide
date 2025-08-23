// app/api/markets/route.ts
import { NextResponse } from "next/server";

export const revalidate = 0; // 항상 최신 (SWR이 주기적으로 다시 불러옵니다)

export async function GET() {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd" +
    "&order=market_cap_desc" +
    "&per_page=100" +
    "&page=1" +
    "&sparkline=false" +
    "&price_change_percentage=24h";

  try {
    const r = await fetch(url, {
      // 일부 네트워크에서 user-agent 없으면 차단되는 경우 대비
      headers: {
        accept: "application/json",
        "user-agent": "kybers-guide/1.0",
      },
      // 서버 라우트는 브라우저 CORS 이슈를 피하기 위해 사용합니다.
      cache: "no-store",
      // Next.js 캐싱을 확실히 끄고 싶다면:
      next: { revalidate: 0 },
    });

    if (!r.ok) {
      return NextResponse.json({ error: "coingecko_failed", status: r.status }, { status: 500 });
    }

    const json = await r.json();
    // 응답이 배열인지 확인
    if (!Array.isArray(json)) {
      return NextResponse.json({ error: "unexpected_response" }, { status: 502 });
    }

    // 클라이언트가 바로 쓰게 필요한 최소 필드만 남기는 것도 방법
    // 여기선 그대로 전달(TopMovers가 market_cap, price_change_percentage_24h를 사용)
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}