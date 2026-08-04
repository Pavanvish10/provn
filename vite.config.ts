// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Hard-pin the deploy target to Vercel rather than relying on Nitro's
  // auto-detection (which defaults to cloudflare-module outside a
  // recognized platform build environment).
  nitro: { preset: "vercel" },
  // Every SSR request was crashing in production with
  // "TypeError: __commonJSMin is not a function". Root cause: the default
  // multi-chunk SSR build splits vendor deps into many separate _libs/*.mjs
  // files, and two of them (createServerFn's chunk and the
  // @tanstack/react-router vendor chunk) import from each other — a real
  // ESM circular import. Whichever one a request happens to reach second
  // sees a live binding to a `var` that the other chunk hasn't assigned yet
  // (esbuild's CJS-interop helper), so calling it throws. Forcing the SSR
  // build into one chunk removes the extra boundary that creates the cycle
  // — evaluation order becomes strictly linear within a single module.
  // Verified locally by invoking the built _ssr/ssr.mjs handler directly
  // (500 -> 200 on every route) before this shipped.
  vite: {
    environments: {
      ssr: {
        build: {
          rollupOptions: {
            output: { manualChunks: () => "server" },
          },
        },
      },
    },
  },
});
