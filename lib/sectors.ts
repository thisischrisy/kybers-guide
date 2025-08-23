// lib/sectors.ts
export type SectorKey =
  | "All" | "LargeCap" | "Layer1" | "Layer2" | "DeFi" | "Meme" | "AI" | "RWA"
  | "Metaverse" | "GameFi" | "Oracles" | "PrivacyZK" | "LiquidStaking" | "Stablecoin" | "Exchange";

export const SECTORS: SectorKey[] = [
  "All","LargeCap","Layer1","Layer2","DeFi","Meme","AI","RWA",
  "Metaverse","GameFi","Oracles","PrivacyZK","LiquidStaking","Stablecoin","Exchange",
];

function n(s?: string){ return (s||"").toLowerCase(); }

export function isStable(c:any){
  const name = n(c.name), sym = n(c.symbol);
  return (
    ["usdt","usdc","dai","tusd","fdusd","usde","usdd","gusd","lusd","susd"].includes(sym) ||
    name.includes("stable") || name.includes("usd")
  );
}

export const RULES: Record<SectorKey, (c:any)=>boolean> = {
  All: () => true,
  LargeCap: (c) => (c.market_cap ?? 0) > 1_000_000_000,
  Layer1: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return [
      "bitcoin","ethereum","solana","cardano","avalanche","polkadot","tron","litecoin","aptos","sui",
      "ton","near","algorand","cosmos","tezos","hedera","kaspa","celestia"
    ].some(k=>name.includes(k)) || ["btc","eth","sol","ada","avax","dot","trx","ltc","apt","sui","ton","near","algo","atom","xtz","hbar","kas","tia"].includes(sym);
  },
  Layer2: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return ["arbitrum","optimism","base","mantle","scroll","zksync","starknet","linea"].some(k=>name.includes(k))
      || ["arb","op","mnt","strk"].includes(sym);
  },
  DeFi: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return ["aave","maker","curve","uniswap","sushiswap","balancer","compound","pancake"].some(k=>name.includes(k))
      || ["aave","mkr","crv","uni","sushi","bal","comp","cake"].includes(sym);
  },
  Meme: (c) => n(c.name).match(/doge|shib|pepe|bonk|floki|memecoin|wif/)!==null,
  AI: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return ["ai","gpt","singularity","ocean","render","graph","arkham","compute"].some(k=>name.includes(k))
      || ["rndr","agix","ocean","grt","arkm"].includes(sym);
  },
  RWA: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return ["rwa","real world","tokenfi","maple","centrifuge","ondos","polymesh"].some(k=>name.includes(k))
      || ["ondo","mpl","polyx","cfg"].includes(sym);
  },
  Metaverse: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return ["metaverse","decentraland","the sandbox","sandbox","immutable"].some(k=>name.includes(k))
      || ["mana","sand","imx"].includes(sym);
  },
  GameFi: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return ["game","gaming","axie","gala","illuvium","yield guild"].some(k=>name.includes(k))
      || ["axs","gala","ilv"].includes(sym);
  },
  Oracles: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return ["chainlink","band","tellor","api3","pyth"].some(k=>name.includes(k))
      || ["link","band","trb","api3","pyth"].includes(sym);
  },
  PrivacyZK: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return ["privacy","monero","zcash","mina","zk","aleph zero"].some(k=>name.includes(k))
      || ["xmr","zec","mina","azero"].includes(sym);
  },
  LiquidStaking: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return ["lido","rocket pool","frxeth","stader","stakewise","puffer","eigen"].some(k=>name.includes(k))
      || ["ldo","reth","frxeth","sd","swise"].includes(sym);
  },
  Stablecoin: (c) => isStable(c),
  Exchange: (c) => {
    const name=n(c.name), sym=n(c.symbol);
    return ["binance","okx","huobi","bybit","kucoin","bitget","crypto.com","gate"].some(k=>name.includes(k))
      || ["bnb","ht","kcs","cro","bgb","gt"].includes(sym);
  },
};

export const SECTOR_BADGE: Record<SectorKey,{emoji:string; className:string}> = {
  All: { emoji:"🧭", className:"bg-brand-card/50 border-brand-line/40 text-brand-ink/80" },
  LargeCap: { emoji:"🏦", className:"bg-emerald-900/30 border-emerald-700/40 text-emerald-200" },
  Layer1: { emoji:"🧱", className:"bg-cyan-900/30 border-cyan-700/40 text-cyan-200" },
  Layer2: { emoji:"🪜", className:"bg-sky-900/30 border-sky-700/40 text-sky-200" },
  DeFi: { emoji:"💧", className:"bg-indigo-900/30 border-indigo-700/40 text-indigo-200" },
  Meme: { emoji:"🤣", className:"bg-pink-900/30 border-pink-700/40 text-pink-200" },
  AI: { emoji:"🤖", className:"bg-purple-900/30 border-purple-700/40 text-purple-200" },
  RWA: { emoji:"🏢", className:"bg-amber-900/30 border-amber-700/40 text-amber-200" },
  Metaverse: { emoji:"🕶️", className:"bg-fuchsia-900/30 border-fuchsia-700/40 text-fuchsia-200" },
  GameFi: { emoji:"🎮", className:"bg-rose-900/30 border-rose-700/40 text-rose-200" },
  Oracles: { emoji:"🔗", className:"bg-teal-900/30 border-teal-700/40 text-teal-200" },
  PrivacyZK: { emoji:"🕵️", className:"bg-slate-900/30 border-slate-700/40 text-slate-200" },
  LiquidStaking: { emoji:"💧⛓️", className:"bg-lime-900/30 border-lime-700/40 text-lime-200" },
  Stablecoin: { emoji:"💵", className:"bg-yellow-900/30 border-yellow-700/40 text-yellow-200" },
  Exchange: { emoji:"🏛️", className:"bg-orange-900/30 border-orange-700/40 text-orange-200" },
};