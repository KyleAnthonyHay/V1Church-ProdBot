import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Per-campus orb tints, so each campus reads as its own "voice". */
export const ORB_PALETTES = {
  ember: [
    "oklch(0.72 0.19 35)",
    "oklch(0.86 0.14 75)",
    "oklch(0.6 0.22 355)",
    "oklch(0.78 0.13 300)",
  ],
  aurora: [
    "oklch(0.7 0.2 330)",
    "oklch(0.78 0.13 260)",
    "oklch(0.62 0.22 290)",
    "oklch(0.82 0.1 210)",
  ],
  dusk: [
    "oklch(0.45 0.08 30)",
    "oklch(0.62 0.12 20)",
    "oklch(0.35 0.06 300)",
    "oklch(0.55 0.06 250)",
  ],
  lagoon: [
    "oklch(0.78 0.12 180)",
    "oklch(0.88 0.08 120)",
    "oklch(0.7 0.12 230)",
    "oklch(0.9 0.05 90)",
  ],
  citrus: [
    "oklch(0.86 0.15 95)",
    "oklch(0.78 0.17 60)",
    "oklch(0.72 0.14 140)",
    "oklch(0.9 0.06 80)",
  ],
} as const;
export type OrbPalette = keyof typeof ORB_PALETTES;

export function Orb({
  size = 40,
  palette,
  active,
  blur,
  speed,
  className,
  style,
}: {
  size?: number | string;
  palette?: OrbPalette;
  active?: boolean;
  blur?: number;
  speed?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const colors = palette ? ORB_PALETTES[palette] : undefined;
  const vars = {
    width: size,
    height: size,
    ...(colors && {
      "--orb-a": colors[0],
      "--orb-b": colors[1],
      "--orb-c": colors[2],
      "--orb-d": colors[3],
    }),
    ...(blur !== undefined && { "--orb-blur": `${blur}px` }),
    ...(speed !== undefined && { "--orb-speed": `${speed}s` }),
    ...style,
  } as CSSProperties;
  return (
    <div
      aria-hidden
      data-active={active ? "true" : undefined}
      className={cn("orb shrink-0", className)}
      style={vars}
    />
  );
}

/** Stable palette per campus name. */
const CAMPUS_PALETTES: Record<string, OrbPalette> = {
  brooklyn: "ember",
  manhattan: "aurora",
  "long island": "lagoon",
  miami: "citrus",
  indiana: "dusk",
};
export function campusPalette(name: string): OrbPalette {
  const known = CAMPUS_PALETTES[name.trim().toLowerCase()];
  if (known) return known;
  const keys = Object.keys(ORB_PALETTES) as OrbPalette[];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return keys[h % keys.length]!;
}
