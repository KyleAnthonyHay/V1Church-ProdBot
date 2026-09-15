import type { ReactNode } from "react";

/** Centered dashed placeholder shown where a list or diagram has no items yet. */
export function EmptyState({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-background text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center text-sm">
      {icon}
      {children}
    </div>
  );
}
