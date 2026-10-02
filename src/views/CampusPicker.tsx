import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Campus } from "@/App";
import { BrandMark, CampusMark } from "@/components/Marks";
import { ArrowRight, Loader2, LogOut, Plus } from "lucide-react";

/** Pick the campus you are working in. */
export function CampusPicker({
  church,
  campuses,
  onSelect,
  onSignOut,
}: {
  church: string;
  campuses: Campus[];
  onSelect: (id: string) => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between px-5 py-4">
        <a href="/" className="flex items-center gap-2.5">
          <BrandMark size={24} />
          <span className="text-[15px] font-semibold tracking-tight">
            ProdBot
          </span>
        </a>
        <button
          onClick={onSignOut}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
        >
          <LogOut className="size-3.5" /> Sign out
        </button>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <div className="flex w-full max-w-3xl flex-col items-center gap-10">
          <div className="animate-in fade-in slide-in-from-bottom-2 text-center duration-700">
            <div className="text-muted-foreground mb-3 text-sm">{church}</div>
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
                <CampusMark
                  name={c.name}
                  size={40}
                  className="group-hover:border-foreground/30 transition-colors duration-300"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium">
                    {c.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {church}
                  </span>
                </span>
                <ArrowRight className="text-muted-foreground size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </button>
            ))}
            <AddCampus />
          </div>
        </div>
      </div>
    </div>
  );
}

function AddCampus() {
  const addCampus = useMutation(api.orgs.addCampus);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await addCampus({ name });
      setName("");
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error && /already exists/.test(err.message)
          ? "That campus already exists."
          : "Couldn't add that campus.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="border-border text-muted-foreground hover:text-foreground hover:border-ring/40 flex items-center gap-4 rounded-2xl border border-dashed p-4 text-left transition-colors"
      >
        <span className="border-border inline-flex size-10 items-center justify-center rounded-[11px] border border-dashed">
          <Plus className="size-4" />
        </span>
        <span className="text-sm font-medium">Add a campus</span>
      </button>
    );
  return (
    <form
      onSubmit={submit}
      className="bg-card border-border flex flex-col justify-center gap-1.5 rounded-2xl border p-3"
    >
      <div className="flex items-center gap-2">
        <input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Campus name"
          aria-label="Campus name"
          className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-primary text-primary-foreground inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium"
        >
          {busy && <Loader2 className="size-3 animate-spin" />}
          Add
        </button>
      </div>
      {error && <p className="text-destructive px-1 text-xs">{error}</p>}
    </form>
  );
}
