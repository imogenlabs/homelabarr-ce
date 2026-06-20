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
      // Ratcheting coverage floor. RATCHET RULE: only ever RAISE these, and
      // only in the same PR that adds the tests backing the increase — never
      // lower them to make a red build pass. See HLCE-211.
      // 2026-06-20 HLCE-211 seed: lines 20 / statements 20 / functions 28 / branches 17.
      // 2026-06-20 HLCE-212 (auth core tests): lines 27 / statements 27 / functions 35 / branches 23.
      // 2026-06-20 HLCE-214 (MFA tests): raised to just under the new baseline
      // (lines 28.95 / statements 29.32 / functions 40.54 / branches 25.34).
      // 2026-06-20 HLCE-215 (rate-limit tests): ratelimit.js 96.55% lines;
      // overall baseline lines 29.6 / statements 30.01 / functions 42.09 /
      // branches 25.89. Floor raised to just under it.
      // 2026-06-20 HLCE-216 (auth HTTP route integration tests): supertest drives
      // the whole app, lifting auth.js/auth-admin.js routes to ~88-90% and the
      // overall baseline to lines 39.76 / statements 40.4 / functions 50.51 /
      // branches 36.73. Floor raised to just under it.
      // 2026-06-20 HLCE-221 (persistence tests): db.js 100% / stars.js 88% /
      // activity+deployment loggers ~80%; overall baseline lines 44.7 /
      // statements 45.18 / functions 51.54 / branches 42.77. Floor raised.
      thresholds: {
        lines: 44,
        statements: 45,
        functions: 51,
        branches: 42,
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
