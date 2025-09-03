import { NextResponse } from "next/server";

export const revalidate = 300; // 5분

/** GET /api/btc/hourly?days=7
 *  Binance 1h klines → { prices: [ [ts_ms, close], ... ] }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const daysParam = Number(searchParams.get("days") ?? "7");
  const days = Math.max(1, Math.min(daysParam, 41)); // Binance 1회 1000캔들 상한

  const limit = Math.min(1000, days * 24);
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=${limit}`;

  try {
    const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { error: "binance_failed", status: r.status, message: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const klines: any[] = await r.json();

    // 👇 핵심: map에 튜플 주석, filter에 타입 가드
    const prices = klines
      .map((k): [number, number] => [Number(k[0]), Number(k[4])])
      .filter((p): p is [number, number] => Number.isFinite(p[1]));

    return NextResponse.json({ prices });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch_failed", message: String(e?.message ?? e) }, { status: 500 });
  }
}