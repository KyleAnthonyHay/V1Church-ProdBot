import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";
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
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
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
