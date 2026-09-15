import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!url)
  throw new Error(
    "VITE_CONVEX_URL is not set. Copy .env.example to .env.local.",
  );
const convex = new ConvexReactClient(url);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ConvexProvider>
  </React.StrictMode>,
);
