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
        // src/App.tsx is the 900-line top-level composition root (the dashboard
        // shell that wires every modal/handler together) — an integration/E2E
        // surface owned by HLCE-226, not a unit-test target. Its auth-gate logic
        // IS still asserted in src/App.test.tsx (a behavioral regression guard);
        // we just don't count the untested dashboard body against the unit ratchet.
        "src/App.tsx",
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
      // 2026-06-20 HLCE-217 (audit/log/alert tests): audit.js 100% / log.js 95% /
      // alert.js 83%; overall baseline lines 45.25 / statements 45.9 /
      // functions 51.89 / branches 43.91. Floor raised.
      // 2026-06-20 HLCE-219 (docker-manager tests, mocked dockerode): docker-manager.js
      // ~62%; overall baseline lines 51.26 / statements 51.6 / functions 57.9 /
      // branches 49.08. Floor raised.
      // 2026-06-20 HLCE-220 (deploy/SSE + env guard + network tests):
      // progress-stream.js ~82% / environment-manager.js ~76% / network-manager.js
      // ~74%; overall baseline lines 57.18 / statements 57.24 / functions 61.51 /
      // branches 53.56. Floor raised.
      // 2026-06-20 HLCE-223 (React contexts & hooks tests): AuthContext.tsx 100%
      // lines (high-risk target was 80%), NotificationContext/ThemeContext/
      // use-mobile/useLoading 100%; overall baseline lines 58.35 / statements 58.41 /
      // functions 63.51 / branches 54.06. Floor raised to just under it.
      // 2026-06-20 HLCE-225 (high-value component tests, RTL): ErrorBoundary 100%,
      // LoginScreen/LoginModal ~91%, DeployModal ~91%, PortManager 100%,
      // EnhancedMountManager ~83%; App.tsx (composition root) excluded from
      // instrumentation (E2E surface, HLCE-226). Overall baseline lines 60.75 /
      // statements 60.71 / functions 65.75 / branches 56.38. Floor raised.
      // 2026-06-20 HLCE-228 (bug-lock regression): fixed safeUrl control-char
      // guard, deployment.ts literal ${template.id}, and cli-bridge/progress
      // -stream appId parsing; flipped the 3 pinned tests + added regression
      // coverage. Baseline lines 60.83 / statements 60.80 / functions 65.71 /
      // branches 56.48. Floor raised to just under — functions kept at the prior
      // integer floor (65) because CI instruments ~0.3% fewer functions than the
      // local run (CI baseline 65.42 vs local 65.71), so a 65.5 floor flaked red.
      // 2026-06-20 HLCE-227 (security-invariant regression suite): 135 named
      // guardrail tests in server/regression/ + src/lib/safeUrl.regression — they
      // exercise the container/enhanced-mount/sendError routes (previously
      // untested), lifting baseline to lines 62.56 / statements 62.47 /
      // functions 67.00 / branches 58.11. Floor raised with ≥0.4 CI-safe headroom.
      // 2026-06-20 HLCE-229 (dangerous-op integration tests): supertest coverage
      // of containers.js delete/lifecycle (94%), deploy.js it-tools spawn (argv,
      // no shell), and applications.js remove/down -v (95%); also removed ~340
      // lines of unreachable template-mode dead code from deploy.js. Baseline
      // lines 71.83 / statements 71.39 / functions 75.33 / branches 65.23. Floor
      // raised with CI-safe headroom (functions kept ~1.3 under the local baseline
      // per the documented CI under-instrumentation of functions).
      thresholds: {
        lines: 71,
        statements: 71,
        functions: 74,
        branches: 64,
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
