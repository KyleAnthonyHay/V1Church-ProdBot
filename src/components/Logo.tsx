import { AudioLines } from "lucide-react";
import { cn } from "@/lib/utils";

/** Brand mark: a rounded tile with the audio-lines glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-foreground text-background inline-flex size-6 shrink-0 items-center justify-center rounded-md",
        className,
      )}
      aria-hidden
    >
      <AudioLines className="size-3.5" />
    </span>
  );
}
