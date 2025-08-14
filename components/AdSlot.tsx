// components/AdSlot.tsx
"use client";

import { useEffect } from "react";

interface AdSlotProps {
  id: string;            // 광고 단위 ID (data-ad-slot)
  className?: string;    // ✅ 선택: 스타일 커스터마이즈용
}

export function AdSlot({ id, className }: AdSlotProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("AdSense load:", err);
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client="ca-pub-여기에_당신_게시자ID"  // ← 본인 게시자 ID로 교체되어 있어야 합니다
      data-ad-slot={id}                              // ← 광고 단위 ID
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}