import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { BrandMark, CampusMark } from "@/components/Marks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X } from "lucide-react";

/** First sign-in: name the church and its campuses. */
export function CreateChurch({ email }: { email: string | null }) {
  const createChurch = useMutation(api.orgs.createChurch);
  const { signOut } = useAuthActions();
  const [name, setName] = useState("");
  const [campuses, setCampuses] = useState<string[]>(["Main campus"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createChurch({ name, campuses });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
              .replace(/^.*Uncaught ConvexError: /s, "")
              .split("\n")[0]!
          : String(err),
      );
      setBusy(false);
    }
  }

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
          className="text-muted-foreground hover:text-foreground text-sm"
          onClick={() => void signOut()}
        >
          Sign out{email ? ` ${email}` : ""}
        </button>
      </header>
      <form
        onSubmit={submit}
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16"
      >
        <h1 className="text-3xl font-medium tracking-[-0.035em]">
          Add your{" "}
          <span className="font-serif text-[1.12em] font-normal tracking-normal italic">
            church
          </span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Each campus gets its own wiring, pitfalls and runbook. You can add
          more later.
        </p>

        <div className="mt-8 space-y-1.5">
          <Label htmlFor="church">Church name</Label>
          <Input
            id="church"
            required
            autoFocus
            placeholder="Grace Community Church"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="mt-6 space-y-2">
          <Label>Campuses</Label>
          {campuses.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <CampusMark name={c || "?"} size={32} />
              <Input
                aria-label={`Campus ${i + 1}`}
                value={c}
                onChange={(e) =>
                  setCampuses(
                    campuses.map((x, k) => (k === i ? e.target.value : x)),
                  )
                }
                className="h-10"
              />
              {campuses.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove campus"
                  onClick={() =>
                    setCampuses(campuses.filter((_, k) => k !== i))
                  }
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setCampuses([...campuses, ""])}
          >
            <Plus className="size-3.5" /> Add campus
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy}
          className="mt-8 h-10 rounded-full"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Continue
        </Button>
      </form>
    </div>
  );
}
