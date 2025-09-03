import { NextResponse } from "next/server";

export const revalidate = 300; // 5분

type Prices = [number, number][];

async function tryCoingecko(days: number): Promise<Prices | null> {
  // CoinGecko hourly
  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=hourly`;
  const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!r.ok) return null;
  const json: any = await r.json();
  if (!Array.isArray(json?.prices)) return null;
  return (json.prices as [number, number][])
  .map((p): [number, number] => [Number(p[0]), Number(p[1])])
  .filter((p): p is [number, number] => Number.isFinite(p[1]));
}

async function tryCryptoCompare(hours: number): Promise<Prices | null> {
  // histohour: limit= N (returns N+1 points). hours = days*24
  const limit = Math.min(2000, Math.max(24, hours)); // 여유 버퍼
  const url = `https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=${limit}`;
  const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!r.ok) return null;
  const json: any = await r.json();
  if (json?.Response !== "Success" || !Array.isArray(json?.Data?.Data)) return null;
  const arr = json.Data.Data as Array<{ time: number; close: number }>;
  return arr
    .map((row): [number, number] => [row.time * 1000, Number(row.close)])
    .filter((p): p is [number, number] => Number.isFinite(p[1]));
}

async function tryCoinbase(hours: number): Promise<Prices | null> {
  // Coinbase candles granularity=3600 (1h), 최대 300 캔들
  const limit = Math.min(300, Math.max(24, hours));
  const end = Math.floor(Date.now() / 1000);
  const start = end - limit * 3600;
  const url = `https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=3600&start=${start}&end=${end}`;
  const r = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const arr: any[] = await r.json();
  if (!Array.isArray(arr)) return null;
  // Coinbase: [ time, low, high, open, close, volume ] (time: seconds)
  const rows = arr
    .map((k): [number, number] => [Number(k[0]) * 1000, Number(k[4])])
    .filter((p): p is [number, number] => Number.isFinite(p[1]));
  // 시간역순으로 오는 경우가 많으니 정렬
  rows.sort((a, b) => a[0] - b[0]);
  return rows;
}

/** GET /api/btc/hourly?days=7  →  { prices: [[ts_ms, close], ...] } */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.max(1, Math.min(Number(searchParams.get("days") ?? "7"), 60));
  const hours = days * 24;

  // 1) CoinGecko → 2) CryptoCompare → 3) Coinbase
  try {
    let prices: Prices | null = null;

    prices = await tryCoingecko(days);
    if (!prices || prices.length < 10) prices = await tryCryptoCompare(hours);
    if (!prices || prices.length < 10) prices = await tryCoinbase(hours);

    if (!prices || prices.length < 10) {
      return NextResponse.json(
        { error: "all_providers_failed", hint: "coingecko/cryptocompare/coinbase 모두 실패" },
        { status: 502 }
      );
    }

    return NextResponse.json({ prices });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch_failed", message: String(e?.message ?? e) }, { status: 500 });
  }
}