"use client";

import { SECTOR_BADGE, SectorKey } from "@/lib/sectors";

type Props = { sector: SectorKey; small?: boolean };

export function SectorBadge({ sector, small=false }: Props){
  const meta = SECTOR_BADGE[sector] ?? SECTOR_BADGE["All"];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 ${small ? "py-0.5 text-xs" : "py-1 text-sm"} ${meta.className}`}>
      <span>{meta.emoji}</span>
      <span>{sector}</span>
    </span>
  );
}