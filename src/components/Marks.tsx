import { Church } from "lucide-react";
import { cn } from "@/lib/utils";

/** ProdBot's mark: a church glyph on a solid tile. */
export function BrandMark({
  size = 24,
  active,
  className,
}: {
  size?: number;
  /** Gently pulses while ProdBot is working. */
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-foreground text-background inline-flex shrink-0 items-center justify-center",
        active && "animate-pulse",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    >
      <Church
        style={{ width: size * 0.56, height: size * 0.56 }}
        strokeWidth={size >= 40 ? 1.5 : 2}
      />
    </span>
  );
}

const CAMPUS_CODES: Record<string, string> = {
  brooklyn: "BK",
  manhattan: "MH",
  "long island": "LI",
  miami: "MI",
  indiana: "IN",
};

/** Two-letter code for a campus ("Long Island" -> "LI"). */
export function campusCode(name: string) {
  const known = CAMPUS_CODES[name.trim().toLowerCase()];
  if (known) return known;
  const words = name.trim().split(/\s+/);
  return (
    words.length > 1 ? words[0]![0]! + words[1]![0]! : name.slice(0, 2)
  ).toUpperCase();
}

/** A quiet monogram tile for a campus. */
export function CampusMark({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "border-border bg-card text-foreground/80 inline-flex shrink-0 items-center justify-center border font-semibold tracking-[0.02em] tabular-nums",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        fontSize: Math.max(8, size * 0.36),
      }}
    >
      {campusCode(name)}
    </span>
  );
}
