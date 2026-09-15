import { useState, type ComponentProps } from "react";
import { ancestorsOf, countChildren } from "@shared/wiring";
import { WiringDiagram } from "@/components/WiringDiagram";
import { ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type DiagramProps = ComponentProps<typeof WiringDiagram>;

/**
 * WiringDiagram plus a breadcrumb for nested sub-diagrams. Double-click a
 * device that has devices inside it to open that level; use the breadcrumb to
 * go back up. Focus can be controlled by the parent or kept internally.
 */
export function WiringExplorer({
  focus: controlled,
  onFocusChange,
  showBreadcrumb = true,
  className,
  ...diagram
}: Omit<DiagramProps, "focus" | "onOpen" | "className"> & {
  focus?: string | null;
  onFocusChange?: (id: string | null) => void;
  /** Hide the level bar when the host renders its own (workspace header). */
  showBreadcrumb?: boolean;
  className?: string;
}) {
  const [internal, setInternal] = useState<string | null>(null);
  const focus = controlled !== undefined ? controlled : internal;
  const setFocus = (id: string | null) => {
    setInternal(id);
    onFocusChange?.(id);
  };
  const { graph } = diagram;
  // Show the level bar whenever there is nesting, or we are inside a group
  // that is still empty (just opened for editing).
  const nested = countChildren(graph).size > 0 || focus !== null;
  const trail = focus ? ancestorsOf(graph, focus) : [];
  const current = focus ? graph.nodes.find((n) => n.id === focus) : undefined;
  // Focused node disappeared (deleted, renamed): fall back to the top.
  if (focus && !current) setFocus(null);

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      {nested && showBreadcrumb && (
        <nav
          aria-label="Diagram level"
          className="bg-background/80 text-muted-foreground flex flex-wrap items-center gap-1 border-b px-2 py-1 text-xs"
        >
          <Layers className="size-3.5" />
          <Crumb active={!focus} onClick={() => setFocus(null)}>
            Whole campus
          </Crumb>
          {trail.map((n) => (
            <span key={n.id} className="flex items-center gap-1">
              <ChevronRight className="size-3" />
              <Crumb onClick={() => setFocus(n.id)}>{n.label}</Crumb>
            </span>
          ))}
          {current && (
            <span className="flex items-center gap-1">
              <ChevronRight className="size-3" />
              <Crumb active>{current.label}</Crumb>
            </span>
          )}
        </nav>
      )}
      <div className="min-h-0 flex-1">
        <WiringDiagram
          {...diagram}
          focus={focus}
          onOpen={(id) => setFocus(id)}
        />
      </div>
    </div>
  );
}

function Crumb({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      aria-current={active ? "location" : undefined}
      className={cn(
        "rounded px-1.5 py-0.5",
        active ? "text-foreground font-medium" : "hover:text-foreground hover:underline",
      )}
    >
      {children}
    </button>
  );
}
