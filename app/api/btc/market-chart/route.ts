import { NextResponse } from "next/server";

export const revalidate = 1800; // 30분

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = searchParams.get("days") || "365";
  const interval = Number(days) > 90 ? "daily" : "hourly";

  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=${interval}`;
  const r = await fetch(url, {
    headers: { accept: "application/json" },
    // 서버 캐시 최소화 (SWR과 중복되지만 안전)
    cache: "no-store",
  });
  if (!r.ok) {
    return NextResponse.json({ error: "coingecko_failed" }, { status: 500 });
  }
  const json = await r.json(); // { prices: [[ts, price], ...] }
  return NextResponse.json(json);
}