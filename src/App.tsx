import { lazy, Suspense, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { AppSidebar } from "@/components/AppSidebar";
import { AskView } from "@/views/AskView";
import { CampusPicker } from "@/views/CampusPicker";
import { usePersistedState } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Menu, PanelLeft } from "lucide-react";
const ExploreView = lazy(() =>
  import("@/views/ExploreView").then((m) => ({ default: m.ExploreView })),
);
const AdminView = lazy(() =>
  import("@/views/AdminView").then((m) => ({ default: m.AdminView })),
);

export type Campus = Doc<"campuses">;
export type View = "ask" | "explore" | "admin";

const VIEW_TITLES: Record<View, string> = {
  ask: "V1 ProdBot",
  explore: "Explore",
  admin: "Admin",
};

export default function App() {
  const campuses = useQuery(api.campuses.list);
  const ensureDefaults = useMutation(api.campuses.ensureDefaults);
  const config = useQuery(api.admin.config);
  const [view, setView] = usePersistedState<View>("prodbot.view", "ask");
  const [campusPref, setCampusPref] = usePersistedState<string>(
    "prodbot.campus",
    "",
  );
  const [theme, setTheme] = usePersistedState<"dark" | "light">(
    "prodbot.theme",
    "dark",
  );
  const [collapsedPref, setCollapsedPref] = usePersistedState<"0" | "1">(
    "prodbot.sidebar",
    "0",
  );
  const collapsed = collapsedPref === "1";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [conversationId, setConversationId] =
    useState<Id<"conversations"> | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  useEffect(() => {
    if (campuses && campuses.length === 0) void ensureDefaults();
  }, [campuses, ensureDefaults]);

  const campus = campuses?.find((c) => c._id === campusPref);
  const conversations = useQuery(
    api.chat.listConversations,
    campus ? { campusId: campus._id } : "skip",
  );
  const removeConversation = useMutation(api.chat.removeConversation);
  const renameConversation = useMutation(api.chat.renameConversation);

  function selectCampus(id: string) {
    if (id === campus?._id) return;
    setCampusPref(id);
    setConversationId(null);
    setView("ask");
  }
  function switchCampus() {
    setCampusPref("");
    setConversationId(null);
    setMobileOpen(false);
  }
  function newChat() {
    setConversationId(null);
    setView("ask");
    setMobileOpen(false);
  }
  function openConversation(id: Id<"conversations">) {
    setConversationId(id);
    setView("ask");
    setMobileOpen(false);
  }
  function deleteConversation(id: Id<"conversations">) {
    if (!confirm("Delete this chat?")) return;
    void removeConversation({ id }).then(() => {
      if (conversationId === id) setConversationId(null);
    });
  }

  if (campuses === undefined) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading campuses
      </div>
    );
  }
  if (!campus) {
    return <CampusPicker campuses={campuses} onSelect={selectCampus} />;
  }

  return (
    <div className="flex h-full">
      <AppSidebar
        campus={campus}
        view={view}
        onViewChange={(v) => {
          setView(v);
          setMobileOpen(false);
        }}
        onNewChat={newChat}
        conversations={conversations}
        activeConversationId={conversationId}
        onSelectConversation={openConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={(id, title) => renameConversation({ id, title })}
        aiConfigured={config?.aiConfigured}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        collapsed={collapsed}
        onCollapse={() => setCollapsedPref("1")}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-1.5 px-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          {collapsed && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hidden md:inline-flex"
              aria-label="Show sidebar"
              onClick={() => setCollapsedPref("0")}
            >
              <PanelLeft className="size-4" />
            </Button>
          )}
          <span className="px-1 text-[15px] font-medium">
            {VIEW_TITLES[view]}
          </span>
          <Badge variant="outline" className="text-muted-foreground">
            {campus.name}
          </Badge>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={switchCampus}>
            <MapPin className="size-3.5" />
            Switch campus
          </Button>
        </header>

        <main className="min-h-0 flex-1">
          <Suspense
            fallback={
              <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> Loading view
              </div>
            }
          >
            {view === "ask" ? (
              <AskView
                key={campus._id}
                campus={campus}
                conversationId={conversationId}
                onConversationCreated={setConversationId}
              />
            ) : view === "explore" ? (
              <ExploreView key={campus._id} campus={campus} />
            ) : (
              <AdminView key={campus._id} campus={campus} />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
