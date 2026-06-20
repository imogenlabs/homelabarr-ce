import path from "path";
import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          ) {
            return "vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
        },
      },
    },
  },
  test: {
    // passWithNoTests intentionally OFF: real suites now exist, so an empty
    // run (e.g. a glob that matches nothing) must fail loudly rather than pass.
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "tests/e2e/**",
        "**/*.config.*",
        "dist/**",
        "wiki/**",
        "**/*.d.ts",
        "src/test/**",
      ],
      // Ratcheting coverage floor. Seeded just under the 2026-06-20 baseline
      // (lines 22.05 / statements 21.70 / functions 30.24 / branches 19.31)
      // so CI is green on day one. RATCHET RULE: only ever RAISE these, and
      // only in the same PR that adds the tests backing the increase — never
      // lower them to make a red build pass. See HLCE-211.
      thresholds: {
        lines: 20,
        statements: 20,
        functions: 28,
        branches: 17,
      },
    },
    // Two projects: backend (server/**) in node, frontend (src/**) in jsdom.
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: ["server/**/*.test.{js,ts}"],
          exclude: [...configDefaults.exclude, "tests/e2e/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "web",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/test/setup.ts"],
          exclude: [...configDefaults.exclude, "tests/e2e/**"],
        },
      },
    ],
  },
  server: {
    port: 8080,
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "http://localhost:30002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  // `vite preview` serves the production build, where the frontend uses the
  // relative '/api' base (same-origin). Mirror the production nginx routing so
  // a local backend can be driven through it (used by the Playwright E2E harness).
  preview: {
    port: 8080,
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "http://localhost:30002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
