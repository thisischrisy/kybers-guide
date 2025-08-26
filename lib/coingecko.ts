// lib/coingecko.ts
export type Market = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
  price_change_percentage_24h?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
};

export async function getMarkets(per = 200): Promise<Market[]> {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=usd&order=market_cap_desc&per_page=${per}&page=1` +
    `&price_change_percentage=1h,24h,7d,30d`;

  const res = await fetch(url, {
    headers: { accept: "application/json" },
    // 15분마다 갱신 (원하면 시간 변경 가능)
    next: { revalidate: 900 },
    // 빌드/런타임 어디서든 동작
    cache: "force-cache",
  });

  if (!res.ok) return [];
  return res.json();
}

export async function getGlobal(): Promise<any | null> {
  const res = await fetch("https://api.coingecko.com/api/v3/global", {
    headers: { accept: "application/json" },
    next: { revalidate: 900 },
  });
  if (!res.ok) return null;
  return res.json();
}