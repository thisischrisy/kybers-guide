// app/api/markets/route.ts
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET() {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd" +
    "&order=market_cap_desc" +
    "&per_page=250" +                // ✅ 100 → 250
    "&page=1" +
    "&sparkline=false" +
    "&price_change_percentage=24h,7d,30d"; // 선택값(있으면 정렬/표시 유리)

  try {
    const r = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "kybers-guide/1.0",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!r.ok) {
      return NextResponse.json({ error: "coingecko_failed", status: r.status }, { status: 500 });
    }

    const json = await r.json();
    if (!Array.isArray(json)) {
      return NextResponse.json({ error: "unexpected_response" }, { status: 502 });
    }
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}