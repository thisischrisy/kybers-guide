"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = {
  /** 간편심볼: 미지정 시 BINANCE:BTCUSDT 매핑 */
  symbol?: "bitcoin" | "ethereum";
  /** TradingView 심볼 직접 지정 (예: "BINANCE:BTCUSDT") */
  tvSymbol?: string;
  /** 위젯 간격 */
  interval?: "15" | "30" | "60" | "120" | "240" | "D";
  height?: number;

  /** MA 길이(순서대로 그려짐). 기본 [50,200,400] */
  maInputs?: number[];
  /** RSI 표시 여부 (기본 true) */
  showRsi?: boolean;
  /** RSI 기간(기본 14) */
  rsiLength?: number;

  /** 문제 파악용 콘솔/패널 로깅 */
  debug?: boolean;
};

declare global {
  interface Window {
    TradingView?: any;
    __tvScriptAppended?: boolean;
  }
}

export function TvChart({
  symbol = "bitcoin",
  tvSymbol,
  interval = "D",
  height = 420,
  maInputs = [50, 200, 400],
  showRsi = true,
  rsiLength = 14,
  debug = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const containerId = useId().replace(/[:]/g, "-");
  const [dbg, setDbg] = useState<string[]>([]);

  const log = (...args: any[]) => {
    if (!debug) return;
    const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    // 콘솔과 화면 패널 둘 다 남깁니다.
    // eslint-disable-next-line no-console
    console.log("[TvChart]", msg);
    setDbg(prev => [...prev, msg].slice(-20));
  };

  const map: Record<string, string> = {
    bitcoin: "BINANCE:BTCUSDT",
    ethereum: "BINANCE:ETHUSDT",
  };
  const finalSymbol = tvSymbol || map[symbol] || "BINANCE:BTCUSDT";

  useEffect(() => {
    if (!hostRef.current) return;

    // 컨테이너 초기화
    hostRef.current.innerHTML = "";
    const container = document.createElement("div");
    container.id = containerId;
    container.style.width = "100%";
    container.style.height = "100%";
    hostRef.current.appendChild(container);

    const buildWithStudiesOption = () => {
      // 생성자 단계에서 studies를 강제 세팅(백업 플랜)
      // 이름은 TradingView 공개 위젯에서 통용되는 식별자 사용
      const studiesList: string[] = [];
      // 기본 이동평균 3개
      for (let i = 0; i < maInputs.length; i++) {
        // "Moving Average@tv-basicstudies" 를 여러 번 넣고,
        // 값은 studies_overrides로 각각 지정
        studiesList.push("Moving Average@tv-basicstudies");
      }
      if (showRsi) studiesList.push("RSI@tv-basicstudies");

      // 각 인스턴스의 인풋 오버라이드 키는 인덱스가 붙습니다.
      // 예: "Moving Average@tv-basicstudies.length" 에서
      // 생성자 studies 배열의 0,1,2번째에 대해 각각 "#0","#1","#2" suffix
      const studies_overrides: Record<string, any> = {};
      maInputs.forEach((len, idx) => {
        studies_overrides[`Moving Average@tv-basicstudies#${idx}.length`] = len;
        // 필요 시 소스, 색상 등도 지정 가능:
        // studies_overrides[`Moving Average@tv-basicstudies#${idx}.source`] = "close";
      });
      if (showRsi) {
        // RSI는 마지막 슬롯(=maInputs.length)의 #index가 됩니다.
        studies_overrides[`RSI@tv-basicstudies#0.length`] = rsiLength;
      }

      return { studiesList, studies_overrides };
    };

    const createWidget = (mode: "createStudy" | "studiesOption") => {
      if (!window.TradingView) return;
      const { studiesList, studies_overrides } = buildWithStudiesOption();

      log("createWidget mode:", mode);

      const baseOptions = {
        autosize: true,
        symbol: finalSymbol,
        interval,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "rgba(0,0,0,0)",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        allow_symbol_change: false,
        container_id: containerId,
      } as any;

      if (mode === "studiesOption") {
        baseOptions.studies = studiesList;
        baseOptions.studies_overrides = studies_overrides;
      }

      // 위젯 생성
      const widget = new window.TradingView.widget(baseOptions);

      widget.onChartReady(() => {
        log("chart ready. mode:", mode);
        const chart = widget.chart();

        if (mode === "createStudy") {
          // 1차 시도: 런타임에서 createStudy 사용
          try {
            const ids: any[] = [];
            maInputs.forEach((len) => {
              try {
                const id = chart.createStudy("Moving Average", false, false, [len]);
                ids.push(id);
                log("MA createStudy ok len=", String(len), "id=", String(id));
              } catch (e: any) {
                log("MA createStudy fail len=", String(len), "err=", String(e?.message || e));
              }
            });

            if (showRsi) {
              try {
                const id = chart.createStudy("Relative Strength Index", false, false, [rsiLength]);
                ids.push(id);
                log("RSI createStudy ok len=", String(rsiLength), "id=", String(id));
              } catch (e: any) {
                log("RSI createStudy fail err=", String(e?.message || e));
              }
            }

            // 차트에 실제로 스터디가 붙었는지 확인
            try {
              const all = chart.getAllStudies?.() || [];
              log("getAllStudies length:", String(all.length));
              if (all.length === 0) {
                // createStudy가 막힌 환경인 경우 → 생성자 옵션 방식으로 재시도 권유
                log("no studies after createStudy. will suggest studiesOption.");
              }
            } catch (e: any) {
              log("getAllStudies not available:", String(e?.message || e));
            }
          } catch (e: any) {
            log("createStudy stage error:", String(e?.message || e));
          }
        } else {
          // 2차 시도: 생성자 옵션(studies + studies_overrides)로 주입된 상태
          log("studiesOption mode: studies injected at constructor.");
        }
      });

      return widget;
    };

    const boot = () => {
      if (!window.TradingView) return;

      // 1차: createStudy 방식
      const widget1 = createWidget("createStudy");

      // 2~3초 후에도 스터디가 하나도 없으면, 생성자 방식으로 재생성
      if (debug) {
        setTimeout(() => {
          try {
            // @ts-ignore
            const anyStudies =
              // @ts-ignore
              (widget1?.chart?.getAllStudies && widget1.chart.getAllStudies().length > 0);
            if (!anyStudies) {
              log("fallback to constructor studiesOption mode...");
              if (hostRef.current) hostRef.current.innerHTML = "";
              const container = document.createElement("div");
              container.id = containerId;
              container.style.width = "100%";
              container.style.height = "100%";
              hostRef.current?.appendChild(container);
              createWidget("studiesOption");
            }
          } catch (e: any) {
            log("fallback check failed:", String(e?.message || e));
          }
        }, 2500);
      }
    };

    if (window.TradingView) {
      log("tv.js ready. building widget…");
      boot();
    } else {
      log("tv.js not yet. appending script…");
      if (!window.__tvScriptAppended) {
        const s = document.createElement("script");
        s.src = "https://s3.tradingview.com/tv.js";
        s.async = true;
        s.onload = () => {
          log("tv.js loaded.");
          boot();
        };
        document.body.appendChild(s);
        window.__tvScriptAppended = true;
      } else {
        const t = setInterval(() => {
          if (window.TradingView) {
            clearInterval(t);
            log("tv.js became available.");
            boot();
          }
        }, 100);
      }
    }

    return () => {
      try {
        if (hostRef.current) hostRef.current.innerHTML = "";
      } catch {}
    };
  }, [finalSymbol, interval, containerId, maInputs, showRsi, rsiLength, debug]);

  return (
    <div
      className="relative w-full rounded-lg border border-brand-line/30 bg-brand-card/60"
      style={{ height }}
    >
      <div ref={hostRef} className="absolute inset-0" />
      {debug && (
        <div className="absolute left-2 bottom-2 max-w-[70%] rounded-md bg-black/60 px-2 py-1 text-[10px] leading-4 text-brand-ink/80">
          <div className="font-semibold mb-1">TvChart Debug</div>
          {dbg.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-words opacity-80">
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}