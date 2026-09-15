import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export function FixReviewPanel({ campusId }: { campusId: Id<"campuses"> }) {
  const proposals = useQuery(api.fixes.list, { campusId });
  const review = useMutation(api.fixes.review);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="space-y-3 rounded-md border p-3">
      <h2 className="font-medium">
        Reported fixes awaiting review ({proposals?.length ?? 0})
      </h2>
      {proposals?.map((p) => (
        <div key={p._id} className="space-y-2 border-t pt-3 text-sm">
          <p>
            <strong>{p.pitfallId}</strong> · {p.date}
          </p>
          <p>{p.note}</p>
          <blockquote className="text-muted-foreground border-l-2 pl-3">
            Volunteer report: {p.evidence}
          </blockquote>
          <div className="flex gap-2">
            {[true, false].map((approve) => (
              <Button
                key={String(approve)}
                disabled={busy}
                variant={approve ? "default" : "outline"}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await review({ id: p._id, approve });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {approve ? "Approve last-seen update" : "Reject"}
              </Button>
            ))}
          </div>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
