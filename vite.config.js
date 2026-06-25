import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the build works under GitHub Pages' /<repo>/ subpath
  // without hardcoding the repository name.
  base: "./",
  plugins: [react()],
  server: { port: 5173, open: true },
});
