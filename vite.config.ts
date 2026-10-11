import { defineConfig } from "vite";

// Project pages on GitHub Pages are served from
// https://<user>.github.io/<repo>/, so the production build needs every
// asset URL prefixed with the repo name. Local dev still runs at the root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/camino-2026/" : "/",
}));
