import { defineConfig } from "vite"

// hookline-shared resolves through a workspace symlink to ../shared, which
// is outside client/ (Vite's project root) — without this, Vite's dev
// server 403s on the real (post-symlink) path as "outside of allow list".
export default defineConfig({
  server: {
    fs: {
      allow: [".."],
    },
  },
})
