// app/api/btc/daily/route.ts (참고용)
import { NextResponse } from "next/server";
export const revalidate = 300;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "450");

  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "coingecko_failed", status: r.status }, { status: 502 });

  const json: any = await r.json();
  const prices: [number, number][] = Array.isArray(json?.prices)
  ? (json.prices as [number, number][])
      .map((p): [number, number] => [Number(p[0]), Number(p[1])])
      .filter((p): p is [number, number] => Number.isFinite(p[1]))
  : [];

  return NextResponse.json({ prices });
}