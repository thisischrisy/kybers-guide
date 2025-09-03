// app/btc/market-chart/route.ts
import { NextResponse } from "next/server";

export const revalidate = 300; // 5분

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = searchParams.get("days") || "450";
  const interval = searchParams.get("interval") || (Number(days) > 90 ? "daily" : "hourly");
  const id = searchParams.get("id") || "bitcoin";

  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`;

  async function hit() {
    const r = await fetch(url, {
      headers: { accept: "application/json" },
      // 서버 사이드 캐시 + ISR
      next: { revalidate: 300 },
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`coingecko_${r.status}:${text.slice(0, 120)}`);
    }
    return r.json();
  }

  try {
    try {
      const json = await hit();
      return NextResponse.json(json);
    } catch {
      // 짧게 한 번 더
      const json = await hit();
      return NextResponse.json(json);
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: "coingecko_failed", detail: String(e?.message || e) },
      { status: 502 }
    );
  }
}