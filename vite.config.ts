import { defineConfig } from "vite";

// base "./" = chemins relatifs : fonctionne sur itch.io (iframe), GitHub Pages (sous-dossier) et en local.
export default defineConfig({
  base: "./",
  build: { target: "es2020", outDir: "dist" },
  test: { include: ["src/**/*.test.ts"] },
});
