import { NextResponse } from "next/server";

export const revalidate = 600; // 10분 캐시

async function fetchChart(id: string, days = 90) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const r = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`fetch_failed_${id}`);
  return r.json();
}

async function fetchSpot(id: string) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
  const r = await fetch(url, { next: { revalidate: 600 }, headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`spot_failed_${id}`);
  return r.json();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || 90);

    const [usdtChart, usdcChart, usdtSpot, usdcSpot] = await Promise.all([
      fetchChart("tether", days),
      fetchChart("usd-coin", days),
      fetchSpot("tether"),
      fetchSpot("usd-coin"),
    ]);

    const capsUSDT: number[] = (usdtChart?.market_caps || []).map((p: any[]) => p[1] || 0);
    const capsUSDC: number[] = (usdcChart?.market_caps || []).map((p: any[]) => p[1] || 0);
    const len = Math.min(capsUSDT.length, capsUSDC.length);
    const sumCaps = Array.from({ length: len }, (_, i) => (capsUSDT[i] || 0) + (capsUSDC[i] || 0));

    const nowUSDT = usdtSpot?.market_data?.market_cap?.usd ?? null;
    const nowUSDC = usdcSpot?.market_data?.market_cap?.usd ?? null;
    const nowSum = (typeof nowUSDT === "number" ? nowUSDT : 0) + (typeof nowUSDC === "number" ? nowUSDC : 0);

    return NextResponse.json({
      data: {
        days,
        sumCaps,
        now: nowSum || null,
        parts: { usdt: nowUSDT ?? null, usdc: nowUSDC ?? null },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "stables_failed" }, { status: 500 });
  }
}