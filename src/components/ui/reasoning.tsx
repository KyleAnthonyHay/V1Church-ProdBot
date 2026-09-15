// Collapsible "agent thinking" block. Styled after ElevenLabs UI; shimmer from
// https://ui.elevenlabs.io/docs/components/shimmering-text
import { useEffect, useState, type ComponentProps } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { Response } from "@/components/ui/response";

export type ReasoningProps = Omit<ComponentProps<"div">, "children"> & {
  /** Streamed reasoning summary (markdown). */
  text?: string;
  /** True while the model is still producing its answer. */
  streaming: boolean;
  /** Label shown while streaming. */
  label?: string;
  /** How long the answer took, once finished ("Worked for 22s"). */
  seconds?: number;
};

/** 22 -> "22s", 95 -> "1m 35s". */
function formatDuration(seconds: number) {
  const s = Math.max(1, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

export function Reasoning({
  text,
  streaming,
  label = "Thinking",
  seconds,
  className,
  ...props
}: ReasoningProps) {
  const [open, setOpen] = useState(streaming);
  // Auto-open while thinking, collapse once the answer is done.
  useEffect(() => {
    setOpen(streaming);
  }, [streaming]);

  const body = text?.trim() ?? "";
  const done = !streaming;
  if (done && !body && seconds === undefined) return null;

  return (
    <div className={cn("text-sm", className)} {...props}>
      <button
        type="button"
        onClick={() => body && setOpen((o) => !o)}
        aria-expanded={body ? open : undefined}
        disabled={!body && done}
        className={cn(
          "text-muted-foreground flex items-center gap-1.5 py-1 transition-colors disabled:cursor-default",
          body && "hover:text-foreground",
          // Finished: a divider under "Worked for Ns" separates this answer.
          done && "border-border w-full border-b pb-2.5",
        )}
      >
        {streaming ? (
          <ShimmeringText text={`${label}…`} startOnView={false} />
        ) : (
          <span>
            {seconds !== undefined
              ? `Worked for ${formatDuration(seconds)}`
              : "Reasoning"}
          </span>
        )}
        {body && (
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform",
              open && "rotate-90",
            )}
          />
        )}
      </button>
      {open && body && (
        <div className="border-border text-muted-foreground mt-2 ml-1.5 max-h-72 overflow-y-auto border-l-2 pl-3 text-[13px] leading-relaxed">
          <Response>{body}</Response>
        </div>
      )}
    </div>
  );
}
