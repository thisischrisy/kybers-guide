// lib/stats.ts
export function quantiles(values: number[], qs: number[]) {
  const arr = [...values].filter(v => Number.isFinite(v)).sort((a,b)=>a-b);
  if (arr.length === 0) return qs.map(() => NaN);
  return qs.map(q => {
    const i = (arr.length - 1) * q;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    if (lo === hi) return arr[lo];
    const w = i - lo;
    return arr[lo] * (1 - w) + arr[hi] * w;
  });
}