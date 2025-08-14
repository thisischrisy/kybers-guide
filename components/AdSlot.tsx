// components/AdSlot.tsx
"use client";

import { useEffect } from "react";

interface AdSlotProps {
  id: string; // 광고 단위 ID
}

export function AdSlot({ id }: AdSlotProps) {
  useEffect(() => {
    try {
      // 광고 스크립트가 이미 있으면 재로드
      if (window) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle block text-center"
      style={{ display: "block" }}
      data-ad-client="ca-pub-4907767015127643" // ← 본인 AdSense 게시자 ID
      data-ad-slot="6903531138" // ← 광고 단위 ID
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  );
}