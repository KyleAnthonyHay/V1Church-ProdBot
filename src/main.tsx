import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import "./index.css";
import { AuthGate } from "./AuthGate";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Landing = lazy(() => import("./landing/Landing"));

// "/" is the marketing homepage; the app itself lives under /app.
const isApp = window.location.pathname.startsWith("/app");

function appRoot() {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!url)
    throw new Error(
      "VITE_CONVEX_URL is not set. Copy .env.example to .env.local.",
    );
  const convex = new ConvexReactClient(url);
  return (
    <ErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <AuthGate />
      </ConvexAuthProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isApp ? (
      appRoot()
    ) : (
      <Suspense fallback={null}>
        <Landing />
      </Suspense>
    )}
  </React.StrictMode>,
);
