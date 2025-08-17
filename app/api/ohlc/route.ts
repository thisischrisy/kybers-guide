// app/api/ohlc/route.ts
import { NextResponse } from "next/server";

export const revalidate = 900; // 15분 캐시(서버 측 ISR 느낌)

const ALLOWED = new Set(["bitcoin", "ethereum"]);
const ALLOWED_DAYS = new Set(["1", "7", "14", "30", "90", "180", "365"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "bitcoin").toLowerCase();
  const days = (searchParams.get("days") || "180").toLowerCase();

  if (!ALLOWED.has(symbol)) {
    return NextResponse.json({ error: "unsupported symbol" }, { status: 400 });
  }
  const d = ALLOWED_DAYS.has(days) ? days : "180";

  const url = `https://api.coingecko.com/api/v3/coins/${symbol}/ohlc?vs_currency=usd&days=${d}`;

  // 간단 재시도(429 방어)
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store", // 서버에서 직접 fresh 가져오기
    });

    if (res.status === 429) {
      // 지수적으로 짧게 대기: 0.5s, 1s
      await new Promise((r) => setTimeout(r, (attempt + 1) * 500));
      continue;
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: res.statusText, status: res.status },
        { status: res.status }
      );
    }

    const data = await res.json();
    // 정상 응답
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "rate_limited" }, { status: 429 });
}