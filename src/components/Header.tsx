import { useEffect } from "react";
import { usePersistedState } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import type { Campus } from "@/App";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Network, Settings2, AudioLines } from "lucide-react";

export type View = "ask" | "explore" | "admin";

export function Header({
  campuses,
  campus,
  onCampusChange,
  view,
  onViewChange,
  aiConfigured,
}: {
  campuses: Campus[];
  campus: Campus | undefined;
  onCampusChange: (id: string) => void;
  view: View;
  onViewChange: (v: View) => void;
  aiConfigured?: boolean;
}) {
  const [theme, setTheme] = usePersistedState<"dark" | "light">(
    "prodbot.theme",
    "dark",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return (
    <header className="border-border flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <div className="flex items-center gap-2 font-semibold">
        <AudioLines className="size-5" />
        <span>V1 ProdBot</span>
      </div>

      <Select value={campus?._id ?? ""} onValueChange={onCampusChange}>
        <SelectTrigger className="w-44" size="sm">
          <SelectValue placeholder="Campus" />
        </SelectTrigger>
        <SelectContent>
          {campuses.map((c) => (
            <SelectItem key={c._id} value={c._id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex-1" />

      {aiConfigured === false && (
        <Badge
          variant="destructive"
          title="Set OPENAI_API_KEY on the Convex deployment"
        >
          OpenAI key not set
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle color theme"
      >
        {theme === "dark" ? "Light" : "Dark"}
      </Button>
      <Tabs value={view} onValueChange={(v) => onViewChange(v as View)}>
        <TabsList>
          <TabsTrigger value="ask">
            <MessageSquare className="size-4" /> Ask
          </TabsTrigger>
          <TabsTrigger value="explore">
            <Network className="size-4" /> Explore
          </TabsTrigger>
          <TabsTrigger value="admin">
            <Settings2 className="size-4" /> Admin
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </header>
  );
}
