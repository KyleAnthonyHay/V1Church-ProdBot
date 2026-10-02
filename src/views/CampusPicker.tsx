import type { Campus } from "@/App";
import { Orb, campusPalette } from "@/components/Orb";
import { ArrowRight } from "lucide-react";

/** Landing page: pick the campus you are working in. */
export function CampusPicker({
  campuses,
  onSelect,
}: {
  campuses: Campus[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center px-5 py-4">
        <a href="/" className="flex items-center gap-2.5">
          <Orb size={24} blur={4} />
          <span className="text-[15px] font-semibold tracking-tight">
            ProdBot
          </span>
        </a>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <div className="flex w-full max-w-3xl flex-col items-center gap-10">
          <div className="animate-in fade-in slide-in-from-bottom-2 text-center duration-700">
            <h1 className="text-4xl font-medium tracking-[-0.035em] md:text-5xl">
              Which campus are{" "}
              <span className="font-serif text-[1.12em] font-normal tracking-normal italic">
                you
              </span>{" "}
              at?
            </h1>
            <p className="text-muted-foreground mt-3 text-[15px]">
              ProdBot answers from that campus's wiring, pitfalls, and runbook.
              You can switch any time.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campuses.map((c, i) => (
              <button
                key={c._id}
                onClick={() => onSelect(c._id)}
                style={{ animationDelay: `${120 + i * 60}ms` }}
                className="group bg-card border-border hover:border-ring/40 focus-visible:ring-ring/50 animate-in fade-in slide-in-from-bottom-3 fill-mode-both flex items-center gap-4 rounded-2xl border p-4 text-left shadow-[var(--shadow-soft)] transition-all duration-300 outline-none hover:-translate-y-0.5 focus-visible:ring-2"
              >
                <Orb
                  size={44}
                  blur={6}
                  palette={campusPalette(c.name)}
                  className="transition-transform duration-500 group-hover:scale-110"
                />
                <span className="flex-1">
                  <span className="block text-base font-medium">{c.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    V1 Church
                  </span>
                </span>
                <ArrowRight className="text-muted-foreground size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
