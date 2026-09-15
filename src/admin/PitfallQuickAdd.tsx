import { useState, type FormEvent } from "react";
import type { PitfallDetail } from "@shared/docs";
import type { WiringNode } from "@shared/wiring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DeviceChips } from "./DeviceChips";
import { Loader2, Plus } from "lucide-react";

/** The three fields every pitfall needs, always visible on the pitfalls tab. */
export function PitfallQuickAdd({
  nextId,
  nodes,
  onAdd,
}: {
  nextId: string;
  nodes: WiringNode[];
  onAdd: (pitfall: PitfallDetail) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [issue, setIssue] = useState("");
  const [solution, setSolution] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = title.trim() && issue.trim() && solution.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      await onAdd({
        id: nextId,
        title: title.trim(),
        issue: issue.trim(),
        solution: solution.trim(),
        nodes: picked,
        check: [],
        extra: [],
      });
      setTitle("");
      setIssue("");
      setSolution("");
      setPicked([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Step label="Title: what the issue is, as someone would say it on Sunday">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Everything from front of house sounds glitchy"
        />
      </Step>
      <Step label="Description: what is actually going wrong">
        <Textarea
          rows={2}
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder="The master clock on the LV1 console is set to Stage Rack 1, which is not the clock source."
        />
      </Step>
      <Step label="Solution: what fixes it">
        <Textarea
          rows={2}
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
          placeholder="Switch the LV1 master clock from Stage Rack 1 to Stage Rack 3."
        />
      </Step>
      {nodes.length > 0 && (
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">
            Devices involved (optional, from the wiring diagram)
          </Label>
          <DeviceChips
            nodes={nodes}
            selected={picked}
            onToggle={(id) =>
              setPicked((p) =>
                p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
              )
            }
          />
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={busy || !ready}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Add pitfall
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  );
}

function Step({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
