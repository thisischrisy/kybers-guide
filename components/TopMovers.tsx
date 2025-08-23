"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Props = { filter?: string };

function normalize(s: string | undefined) {
  return (s || "").toLowerCase();
}

function isStable(coin: any) {
  const n = normalize(coin.name);
  const sym = normalize(coin.symbol);
  // 자주 쓰는 스테이블 심볼/이름 키워드
  return (
    ["usdt", "usdc", "dai", "tusd", "fdusd", "usde", "usdd", "gusd", "lusd", "susd"].includes(sym) ||
    n.includes("stable") ||
    n.includes("usd")
  );
}

function byAbs24hDesc(a: any, b: any) {
  const ax = Math.abs(a.price_change_percentage_24h ?? 0);
  const bx = Math.abs(b.price_change_percentage_24h ?? 0);
  return bx - ax;
}

function byMcapDesc(a: any, b: any) {
  return (b.market_cap ?? 0) - (a.market_cap ?? 0);
}

// ✅ 섹터별 간단 키워드 규칙(이름/심볼 기반 휴리스틱)
// *무료 MVP 용*이므로 정확도 100%는 아니지만 적절히 동작합니다.
// 추후 Coingecko Category나 자체 매핑 테이블로 고도화 가능.
const RULES: Record<string, (c: any) => boolean> = {
  All: () => true,
  LargeCap: (c) => (c.market_cap ?? 0) > 1_000_000_000,
  Layer1: (c) => {
    const n = normalize(c.name);
    const sym = normalize(c.symbol);
    return [
      "bitcoin","ethereum","solana","cardano","avalanche","polkadot","tron","litecoin","aptos","sui",
      "ton","near","algorand","cosmos","tezos","hedera","kaspa","celestia"
    ].some(k => n.includes(k)) || ["btc","eth","sol","ada","avax","dot","trx","ltc","apt","sui","ton","near","algo","atom","xtz","hbar","kas","tia"].includes(sym);
  },
  Layer2: (c) => {
    const n = normalize(c.name);
    const sym = normalize(c.symbol);
    return ["arbitrum","optimism","base","mantle","scroll","zksync","starknet","linea"].some(k => n.includes(k))
      || ["arb","op","mnt","strk"].includes(sym);
  },
  DeFi: (c) => {
    const n = normalize(c.name);
    const sym = normalize(c.symbol);
    return ["aave","maker","curve","uniswap","sushiswap","balancer","compound","pancake"].some(k => n.includes(k))
      || ["aave","mkr","crv","uni","sushi","bal","comp","cake"].includes(sym);
  },
  Meme: (c) => {
    const n = normalize(c.name);
    return ["doge","shiba","pepe","bonk","floki","wif","memecoin"].some(k => n.includes(k));
  },
  AI: (c) => {
    const n = normalize(c.name);
    return ["ai","gpt","singularity","ocean","render","anchor","compute","graph","arkham"].some(k => n.includes(k))
      || ["rndr","agix","ocean","grt","arkm"].includes(normalize(c.symbol));
  },
  RWA: (c) => {
    const n = normalize(c.name);
    return ["rwa","real world","tokenfi","maple","centrifuge","ondos","polymesh","chainlink"].some(k => n.includes(k))
      || ["ondo","link","mpl","polyx","cfg"].includes(normalize(c.symbol));
  },
  Metaverse: (c) => {
    const n = normalize(c.name);
    return ["metaverse","decentraland","the sandbox","sandbox","somnium","imx","immutable"].some(k => n.includes(k))
      || ["mana","sand","imx"].includes(normalize(c.symbol));
  },
  GameFi: (c) => {
    const n = normalize(c.name);
    return ["game","gaming","axie","gala","illuvium","yield guild"].some(k => n.includes(k))
      || ["axs","gala","ilv","ygf"].includes(normalize(c.symbol));
  },
  Oracles: (c) => {
    const n = normalize(c.name);
    return ["chainlink","band","tellor","api3","pyth"].some(k => n.includes(k))
      || ["link","band","trb","api3","pyth"].includes(normalize(c.symbol));
  },
  PrivacyZK: (c) => {
    const n = normalize(c.name);
    return ["privacy","monero","zcash","mina","zk","aleph zero"].some(k => n.includes(k))
      || ["xmr","zec","mina","azero"].includes(normalize(c.symbol));
  },
  LiquidStaking: (c) => {
    const n = normalize(c.name);
    return ["lido","rocket pool","frxeth","stader","stakewise","puffer","eigen"].some(k => n.includes(k))
      || ["ldo","reth","frxeth","sd","swise"].includes(normalize(c.symbol));
  },
  Stablecoin: (c) => isStable(c),
  Exchange: (c) => {
    const n = normalize(c.name);
    return ["binance","okx","huobi","bybit","kucoin","bitget","crypto.com","gate"].some(k => n.includes(k))
      || ["bnb","ht","kcs","cro","bgb","gt"].includes(normalize(c.symbol));
  },
};

export function TopMovers({ filter = "All" }: Props) {
  const { data, error, isLoading } = useSWR("/api/markets", fetcher, { refreshInterval: 60_000 });

  if (error) return <div>불러오기 실패</div>;
  if (isLoading || !data) return <div>로딩 중…</div>;

  const all: any[] = Array.isArray(data) ? data : [];

  // 1) 기본 후보군(스테이블 제외) + 변동률 내림차순
  const base = all.filter(c => !isStable(c));

  // 2) 섹터 필터
  const rule = RULES[filter] ?? RULES["All"];
  let filtered = base.filter(rule);

  // 3) 정렬: 변동폭 큰 순(24h) → 시총 큰 순 보조
  filtered.sort((a, b) => {
    const p = byAbs24hDesc(a, b);
    return p !== 0 ? p : byMcapDesc(a, b);
  });

  // 4) 최소 5개 보장: 부족하면 All(스테이블 제외)에서 보충
  if (filtered.length < 5) {
    const need = 5 - filtered.length;
    const filler = base
      .filter((c) => !filtered.some((x) => x.id === c.id))
      .sort(byAbs24hDesc)
      .slice(0, need);
    filtered = [...filtered, ...filler];
  }

  // 5) 최종 표시는 12개(PC 3열*4줄 정도)
  const show = filtered.slice(0, 12);

  if (!show.length) {
    return <div className="text-sm text-brand-ink/60">표시할 데이터가 없습니다.</div>;
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {show.map((coin: any) => (
        <Link
          key={coin.id}
          href={`/coin/${coin.id}`}
          className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4 block hover:border-brand-gold/60 transition"
        >
          <div className="font-semibold">
            {coin.name} ({coin.symbol?.toUpperCase()})
          </div>

          <div className="text-sm text-brand-ink/70">
            시총: {coin.market_cap ? `$${Math.round(coin.market_cap / 1e6)}M` : "-"}
          </div>

          <div className={`text-sm ${ (coin.price_change_percentage_24h ?? 0) >= 0 ? "text-green-400" : "text-red-400" }`}>
            24h: {typeof coin.price_change_percentage_24h === "number"
              ? `${coin.price_change_percentage_24h.toFixed(2)}%`
              : "-"}
          </div>
        </Link>
      ))}
    </div>
  );
}