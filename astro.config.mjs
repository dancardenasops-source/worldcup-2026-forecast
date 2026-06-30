import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Static output: Astro pre-renders the shell and ships the dashboard as a
// hydrated React island. No server adapter needed for Cloudflare Pages.
export default defineConfig({
  integrations: [react()],
  output: "static",
});
