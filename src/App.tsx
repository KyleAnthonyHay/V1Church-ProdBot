import { lazy, Suspense, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Header, type View } from "@/components/Header";
import { AskView } from "@/views/AskView";
const ExploreView = lazy(() =>
  import("@/views/ExploreView").then((m) => ({ default: m.ExploreView })),
);
const AdminView = lazy(() =>
  import("@/views/AdminView").then((m) => ({ default: m.AdminView })),
);
import { usePersistedState } from "@/lib/admin";
import { Loader2 } from "lucide-react";

export type Campus = Doc<"campuses">;

export default function App() {
  const campuses = useQuery(api.campuses.list);
  const ensureDefaults = useMutation(api.campuses.ensureDefaults);
  const [view, setView] = usePersistedState<View>("prodbot.view", "ask");
  const [campusPref, setCampusPref] = usePersistedState<string>(
    "prodbot.campus",
    "",
  );

  useEffect(() => {
    if (campuses && campuses.length === 0) void ensureDefaults();
  }, [campuses, ensureDefaults]);

  const campus = campuses?.find((c) => c._id === campusPref) ?? campuses?.[0];
  const config = useQuery(api.admin.config);

  return (
    <div className="flex h-full flex-col">
      <Header
        campuses={campuses ?? []}
        campus={campus}
        onCampusChange={(id) => setCampusPref(id)}
        view={view}
        onViewChange={setView}
        aiConfigured={config?.aiConfigured}
      />
      <main className="min-h-0 flex-1">
        <Suspense fallback={<p className="p-4">Loading view…</p>}>
          {!campus ? (
            <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading campuses
            </div>
          ) : view === "ask" ? (
            <AskView key={campus._id} campus={campus} />
          ) : view === "explore" ? (
            <ExploreView key={campus._id} campus={campus} />
          ) : (
            <AdminView key={campus._id} campus={campus} />
          )}
        </Suspense>
      </main>
    </div>
  );
}
