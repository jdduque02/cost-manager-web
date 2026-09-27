// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The `nitro` deploy option below only takes effect when defineConfig() is
// called with an object (not a function) — passing a function makes the
// wrapper treat the whole return value as `options.vite` instead of reading
// the top-level `nitro` key, so `--mode development` is read from argv here
// instead of vite's `env.mode` callback param.
const isDevBuild =
  process.argv.includes("--mode") &&
  process.argv[process.argv.indexOf("--mode") + 1] === "development";

export default defineConfig({
  // Vercel setea VERCEL=1 en su entorno de build. Fuera de Vercel (local,
  // Docker) se deja el default de @lovable.dev/vite-tanstack-config (nitro
  // deploy plugin desactivado → dist/server/server.js "crudo", servido con
  // srvx en el contenedor Docker/VM).
  nitro: process.env.VERCEL ? { preset: "vercel" } : undefined,
  vite: {
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
      sourcemap: isDevBuild,
      ...(!isDevBuild
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
  },
});
