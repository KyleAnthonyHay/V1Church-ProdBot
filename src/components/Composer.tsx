import {
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Campus } from "@/App";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CampusMark } from "@/components/Marks";
import { ArrowUp, Loader2 } from "lucide-react";

export function Composer({
  value,
  onChange,
  onSubmit,
  busy,
  placeholder,
  campus,
  status,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  placeholder: string;
  campus: Campus;
  /** Optional status strip docked above the input (e.g. "Answer complete"). */
  status?: ReactNode;
  autoFocus?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
    ref.current?.focus();
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {status && (
        <div className="bg-card/50 border-border text-muted-foreground mx-2 flex items-center gap-2 rounded-t-2xl border border-b-0 px-4 pt-2 pb-4 text-[13px]">
          {status}
        </div>
      )}
      <form
        onSubmit={submit}
        className={cn(
          "bg-card border-border focus-within:border-ring/60 relative flex flex-col rounded-[24px] border shadow-[var(--shadow-soft)] transition-all focus-within:shadow-[0_0_0_4px_color-mix(in_oklch,var(--ring),transparent_82%),var(--shadow-soft)]",
          status && "-mt-2.5",
        )}
      >
        <textarea
          ref={ref}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          aria-label="Message"
          className="placeholder:text-muted-foreground field-sizing-content max-h-52 min-h-[54px] w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[15px] leading-6 outline-none"
        />
        <div className="flex items-center gap-2 px-3 pb-3">
          <span className="border-border/80 text-muted-foreground inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs">
            <CampusMark name={campus.name} size={16} className="-ml-1" />
            {campus.name}
          </span>
          <div className="flex-1" />
          <Button
            type="submit"
            size="icon"
            className="size-9 rounded-full"
            disabled={busy || !value.trim()}
            aria-label="Send message"
            title="Send (Enter)"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
