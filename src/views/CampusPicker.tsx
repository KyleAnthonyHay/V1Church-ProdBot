import type { Campus } from "@/App";
import { MapPin } from "lucide-react";

/** Landing page: pick the campus you are working in. */
export function CampusPicker({
  campuses,
  onSelect,
}: {
  campuses: Campus[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="font-serif text-5xl leading-none tracking-tight md:text-6xl">
            Which campus are you at?
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            ProdBot answers from that campus's wiring, pitfalls, and runbook.
            You can switch later from the top right.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          {campuses.map((c) => (
            <button
              key={c._id}
              onClick={() => onSelect(c._id)}
              className="bg-card border-border hover:border-ring/50 hover:bg-accent/40 focus-visible:ring-ring/50 flex items-center gap-3 rounded-2xl border px-5 py-4 text-left text-base font-medium transition-colors outline-none focus-visible:ring-2"
            >
              <span className="bg-secondary text-secondary-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-full">
                <MapPin className="size-4" />
              </span>
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
