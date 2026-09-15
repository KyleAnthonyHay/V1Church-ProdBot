import { useState } from "react";
import type { Campus } from "@/App";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SourcesPanel } from "@/admin/SourcesPanel";
import { DocumentsPanel } from "@/admin/DocumentsPanel";

export function AdminView({ campus }: { campus: Campus }) {
  const [scope, setScope] = useState<"campus" | "shared">("campus");

  const campusId = scope === "campus" ? campus._id : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center gap-3 border-b px-4 py-2">
        <span className="text-sm font-medium">Editing</span>
        <div className="bg-muted flex rounded-md p-0.5 text-sm">
          <button
            className={`rounded px-3 py-1 ${scope === "campus" ? "bg-background shadow" : "text-muted-foreground"}`}
            onClick={() => setScope("campus")}
          >
            {campus.name}
          </button>
          <button
            className={`rounded px-3 py-1 ${scope === "shared" ? "bg-background shadow" : "text-muted-foreground"}`}
            onClick={() => setScope("shared")}
          >
            Shared (all campuses)
          </button>
        </div>
        <div className="flex-1" />
      </div>
      <Tabs defaultValue="sources" className="flex min-h-0 flex-1 flex-col">
        <div className="border-border border-b px-4">
          <TabsList className="my-1">
            <TabsTrigger value="sources">1. Sources</TabsTrigger>
            <TabsTrigger value="documents">2. Documents</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="sources" className="min-h-0 flex-1 overflow-y-auto">
          <SourcesPanel
            key={campusId ?? "shared"}
            campusId={campusId}
            scopeName={scope === "campus" ? campus.name : "Shared"}
          />
        </TabsContent>
        <TabsContent
          value="documents"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <DocumentsPanel
            key={campusId ?? "shared"}
            campusId={campusId}
            scope={scope}
            scopeName={scope === "campus" ? campus.name : "Shared"}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
