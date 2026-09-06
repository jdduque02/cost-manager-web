// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// `build.*` options only affect `vite build` (never `vite dev`), so this does
// not change the dev server experience.
export default defineConfig(({ mode }) => ({
  server: {
    port: 3100,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    // Never ship sourcemaps in a production build; `build:dev` (mode
    // "development") keeps them for local debugging.
    sourcemap: mode !== "production",
    ...(mode === "production"
      ? {
          minify: "terser" as const,
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
            mangle: true,
            format: {
              comments: false,
            },
          },
        }
      : {}),
  },
}));
