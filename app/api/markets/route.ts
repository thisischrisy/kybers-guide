// app/api/markets/route.ts
import { NextResponse } from "next/server";

export const revalidate = 300; // 5분 캐시

export async function GET() {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd&order=market_cap_desc&per_page=100&page=1" +
    "&sparkline=true&price_change_percentage=24h,7d,30d";

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: res.statusText, status: res.status },
        { status: res.status }
      );
    }

    const data = await res.json();
    // data: [{ id, symbol, name, image, current_price, price_change_percentage_24h_in_currency, sparkline_in_7d: { price: [...] }, ... }]

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "fetch_failed" }, { status: 500 });
  }
}