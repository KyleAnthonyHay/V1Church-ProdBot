// Collapsible "agent thinking" block. Styled after ElevenLabs UI; shimmer from
// https://ui.elevenlabs.io/docs/components/shimmering-text
import { useEffect, useState, type ComponentProps } from "react";
import { ChevronRight, Sparkles } from "lucide-react";

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
};

export function Reasoning({
  text,
  streaming,
  label = "Thinking",
  className,
  ...props
}: ReasoningProps) {
  const [open, setOpen] = useState(streaming);
  // Auto-open while thinking, collapse once the answer is done.
  useEffect(() => {
    setOpen(streaming);
  }, [streaming]);

  const body = text?.trim() ?? "";
  if (!streaming && !body) return null;

  return (
    <div className={cn("text-sm", className)} {...props}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground -ml-1 flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors"
      >
        <Sparkles className="size-3.5" />
        {streaming ? (
          <ShimmeringText text={`${label}…`} startOnView={false} />
        ) : (
          <span>Reasoning</span>
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
        <div className="border-border text-muted-foreground mt-1.5 ml-1.5 max-h-72 overflow-y-auto border-l-2 pl-3 text-[13px] leading-relaxed">
          <Response>{body}</Response>
        </div>
      )}
    </div>
  );
}
