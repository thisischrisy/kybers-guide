export function sma(values: number[], period: number) {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) { out.push(NaN); continue; }
    const slice = values.slice(i + 1 - period, i + 1);
    out.push(slice.reduce((a,b)=>a+b,0) / period);
  }
  return out;
}

export function rsi(closes: number[], period = 14) {
  let gains = 0, losses = 0;
  const rsis: number[] = Array(closes.length).fill(NaN);
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i-1];
    if (i <= period) {
      if (diff >= 0) gains += diff; else losses -= diff;
      if (i === period) {
        const rs = gains / (losses || 1e-9);
        rsis[i] = 100 - 100 / (1 + rs);
      }
    } else {
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      gains = (gains*(period-1) + gain)/period;
      losses = (losses*(period-1) + loss)/period;
      const rs = gains / (losses || 1e-9);
      rsis[i] = 100 - 100 / (1 + rs);
    }
  }
  return rsis;
}
