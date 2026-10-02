import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import App from "@/App";
import { SignIn } from "@/views/SignIn";
import { CreateChurch } from "@/views/CreateChurch";
import { Loader2 } from "lucide-react";

/** Signed out: sign in. Signed in without a church: create one. Else the app. */
export function AuthGate() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.orgs.me, isAuthenticated ? {} : "skip");
  if (isLoading || (isAuthenticated && me === undefined)) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading
      </div>
    );
  }
  if (!isAuthenticated || !me) return <SignIn />;
  if (!me.org) return <CreateChurch email={me.email} />;
  return <App me={{ ...me, org: me.org }} />;
}
