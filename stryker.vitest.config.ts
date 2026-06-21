import { defineConfig } from "vitest/config";

// Dedicated Vitest config for the StrykerJS mutation-testing harness (HLCE-262).
//
// The main vite.config.ts defines TWO vitest projects (server=node, web=jsdom).
// Stryker's vitest runner boots Vitest with a single config and has no clean way
// to "pick a project", so handing it the multi-project root config makes it spin
// up the jsdom project for backend mutants too. Instead we give Stryker this
// minimal single-project node config, scoped to just the file(s) under mutation.
//
// To scope the run to a different backend file, change `include` here to that
// file's test and `mutate` in stryker.conf.json to the source file. See
// docs/mutation-testing.md. The normal `npm test` / coverage gate is untouched —
// nothing reads this file except `stryker run`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/auth.test.js"],
  },
});
