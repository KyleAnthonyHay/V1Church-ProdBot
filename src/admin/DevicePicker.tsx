import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Popover } from "radix-ui";
import { groupDeviceOptions, type WiringNode } from "@shared/wiring";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";

/**
 * Searchable device dropdown, grouped by layer (Keys, Stage I/O, FOH…).
 * Arrow keys move through the matches and Enter picks one.
 */
export function DevicePicker({
  value,
  placeholder,
  ariaLabel,
  groupEnd,
  devices,
  hints,
  defaultOpen,
  onPick,
}: {
  value?: string;
  placeholder: string;
  ariaLabel: string;
  /** The focused group's own IN or OUT, listed above the layers. */
  groupEnd?: { id: string; label: string };
  devices: WiringNode[];
  /** Muted text after a device, e.g. where it sits in the diagram. */
  hints?: Map<string, string>;
  defaultOpen?: boolean;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () => groupDeviceOptions(devices, query),
    [devices, query],
  );
  const showEnd = !!groupEnd && (!q || groupEnd.label.toLowerCase().includes(q));
  const flat = [
    ...(showEnd ? [groupEnd.id] : []),
    ...groups.flatMap((g) => g.nodes.map((n) => n.id)),
  ];
  // Same-named devices are told apart by their id.
  const labelCounts = new Map<string, number>();
  for (const n of devices)
    labelCounts.set(n.label, (labelCounts.get(n.label) ?? 0) + 1);

  const current =
    value === undefined || value === ""
      ? undefined
      : value === groupEnd?.id
        ? groupEnd.label
        : (devices.find((n) => n.id === value)?.label ?? `${value} (missing)`);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function pick(id: string) {
    setOpen(false);
    setQuery("");
    setActive(0);
    onPick(id);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      pick(flat[active]);
    }
  }

  let index = 0;
  const option = (id: string, label: string, hint?: string) => {
    const i = index++;
    return (
      <button
        type="button"
        key={id}
        role="option"
        data-index={i}
        aria-selected={id === value}
        onMouseMove={() => setActive(i)}
        onClick={() => pick(id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none",
          i === active && "bg-muted",
        )}
      >
        <Check
          className={cn(
            "size-3.5 shrink-0",
            id === value ? "opacity-100" : "opacity-0",
          )}
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {hint && (
          <span className="text-muted-foreground max-w-[45%] shrink-0 truncate text-xs">
            {hint}
          </span>
        )}
      </button>
    );
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border bg-transparent px-2 text-left text-sm outline-none focus-visible:ring-3"
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              !current && "text-muted-foreground",
            )}
          >
            {current ?? placeholder}
          </span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="bg-popover text-popover-foreground z-[100] w-(--radix-popover-trigger-width) min-w-64 rounded-lg border shadow-md"
        >
          <div className="relative border-b">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search devices"
              aria-label="Search devices"
              className="placeholder:text-muted-foreground h-9 w-full bg-transparent pr-2 pl-8 text-sm outline-none"
            />
          </div>
          <div
            ref={listRef}
            role="listbox"
            className="max-h-[min(20rem,var(--radix-popover-content-available-height))] overflow-y-auto p-1"
          >
            {showEnd && option(groupEnd.id, groupEnd.label)}
            {groups.map((g) => (
              <div key={g.group} role="group" aria-label={g.label}>
                <div className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">
                  {g.label}
                </div>
                {g.nodes.map((n) =>
                  option(
                    n.id,
                    n.label,
                    [
                      hints?.get(n.id),
                      (labelCounts.get(n.label) ?? 0) > 1 ? n.id : undefined,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined,
                  ),
                )}
              </div>
            ))}
            {flat.length === 0 && (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                No devices match "{query.trim()}".
              </p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
