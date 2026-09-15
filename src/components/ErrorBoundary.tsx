import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    const msg = this.state.error.message;
    const notDeployed = /Could not find public function/i.test(msg);
    return (
      <div className="mx-auto mt-24 max-w-xl space-y-3 px-4 text-sm">
        <h1 className="text-lg font-semibold">V1 ProdBot can't reach its backend</h1>
        {notDeployed ? (
          <>
            <p className="text-muted-foreground">
              The Convex deployment is reachable but the functions haven't been pushed to it yet. From the project folder run:
            </p>
            <pre className="bg-muted rounded-md p-3 font-mono text-xs">bunx convex dev</pre>
            <p className="text-muted-foreground">Then reload this page.</p>
          </>
        ) : (
          <p className="text-muted-foreground">Check VITE_CONVEX_URL in .env.local and that the deployment is running.</p>
        )}
        <pre className="bg-muted text-muted-foreground max-h-40 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">{msg}</pre>
        <button className="bg-primary text-primary-foreground rounded-md px-3 py-1.5" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
