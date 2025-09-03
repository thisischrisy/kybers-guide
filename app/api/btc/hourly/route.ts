import { NextResponse } from "next/server";

export const revalidate = 300; // 5분 캐시

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const days = u.searchParams.get("days") ?? "7";
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=hourly`,
      { headers: { accept: "application/json" }, cache: "no-store" }
    );
    if (!r.ok) {
      return NextResponse.json({ error: "coingecko_failed", status: r.status }, { status: 502 });
    }
    const json = await r.json();
    return NextResponse.json(json);
  } catch (e:any) {
    return NextResponse.json({ error: "proxy_error", message: String(e?.message ?? e) }, { status: 500 });
  }
}