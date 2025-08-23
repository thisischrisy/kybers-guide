// app/api/btc/market-chart/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = searchParams.get("days") || "120";

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      { next: { revalidate: 300 } } // 5분 캐싱
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch from CoinGecko" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Unexpected error", detail: String(e) }, { status: 500 });
  }
}