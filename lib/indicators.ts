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

export function macd(closes: number[], fast=12, slow=26, signal=9) {
  const ema = (period: number) => {
    const k = 2/(period+1);
    const out: number[] = [];
    let prev: number | null = null;
    for (let i=0;i<closes.length;i++){
      const price = closes[i];
      prev = prev == null ? price : (price - prev)*k + prev;
      out.push(prev);
    }
    return out;
  };
  const emaFast = ema(fast);
  const emaSlow = ema(slow);
  const macdLine = emaFast.map((v,i)=> v - emaSlow[i]);
  // signal on macdLine
  const k = 2/(signal+1);
  const signalLine: number[] = [];
  let prev: number | null = null;
  for (let i=0;i<macdLine.length;i++){
    const m = macdLine[i];
    prev = prev == null ? m : (m - prev)*k + prev;
    signalLine.push(prev);
  }
  const hist = macdLine.map((v,i)=> v - signalLine[i]);
  return { macdLine, signalLine, hist };
}