import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "@shared": path.resolve(__dirname, "shared"), "@convex": path.resolve(__dirname, "convex") } },
});
