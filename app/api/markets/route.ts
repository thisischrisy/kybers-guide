// app/api/markets/route.ts
import { NextResponse } from "next/server";

export const revalidate = 300; // 5분 캐시(서버 빌트인 캐시)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const per = searchParams.get("per") || "200";

  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=usd&order=market_cap_desc&per_page=${per}&page=1` +
    `&sparkline=false&price_change_percentage=24h,7d,30d`;

  try {
    const r = await fetch(url, {
      headers: { accept: "application/json" },
      // 외부 API는 변동이 잦으니 서버 캐시만 사용
      next: { revalidate: 300 },
    });
    if (!r.ok) {
      return NextResponse.json({ error: "coingecko_failed" }, { status: 500 });
    }
    const json = await r.json();
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}