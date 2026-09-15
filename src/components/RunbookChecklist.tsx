import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { parseRunbookSteps } from "@shared/docs";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function RunbookChecklist({
  campusId,
  content,
}: {
  campusId: Id<"campuses">;
  content: string;
}) {
  const [date, setDate] = useState(today);
  const rows = useQuery(api.checklist.list, { campusId, date });
  const set = useMutation(api.checklist.set);
  const steps = useMemo(() => parseRunbookSteps(content), [content]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const checked = new Set(
    rows
      ?.filter((r) => r.runbookContent === content && r.checked)
      .map((r) => r.stepNumber),
  );
  return (
    <section className="mb-5 max-w-3xl space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-medium">Sunday checklist</h3>
        <label className="text-sm">
          Service date{" "}
          <input
            className="ml-2 rounded border px-2 py-1"
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
        <span className="text-sm text-muted-foreground">
          {steps.filter((s) => checked.has(s.number)).length}/{steps.length}{" "}
          done
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Shared with the campus team for this date. A changed runbook starts a
        fresh checklist.
      </p>
      {steps.length === 0 && (
        <p className="text-sm">No numbered runbook steps yet.</p>
      )}
      {steps.map((s) => (
        <label
          key={s.number}
          className="flex min-h-11 items-start gap-3 rounded border p-3 text-sm"
        >
          <input
            className="mt-1 size-5 shrink-0"
            type="checkbox"
            checked={checked.has(s.number)}
            disabled={rows === undefined || busy}
            onChange={async (e) => {
              setBusy(true);
              setError("");
              try {
                await set({
                  campusId,
                  date,
                  runbookContent: content,
                  stepNumber: s.number,
                  checked: e.target.checked,
                });
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
          />
          <span>
            <strong>
              {s.number}. {s.step}
            </strong>
            <span className="block text-muted-foreground">
              {s.time} · {s.owner}
            </span>
            <span className="block">Done when: {s.doneWhen}</span>
            {s.pitfalls.length > 0 && (
              <span className="block text-muted-foreground">
                If not: {s.pitfalls.join(", ")}
              </span>
            )}
          </span>
        </label>
      ))}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
