# HomelabARR CE Changelog

Latest releases and what changed in each.


## [Unreleased]

### ⬆️ Dependencies & Framework
- **React 18 → 19**: upgraded `react`, `react-dom`, and their `@types` to 19.2.7. Resolves the recurring mismatched-major hazard where Dependabot tried to bump `react-dom` to 19 alone.
- **shadcn/ui modernization**: all `React.forwardRef` wrappers across the 16 `ui/` components converted to React 19 ref-as-prop. No behavioral change.
- **lucide-react 0.344 → 1.21** (React 19 peer support), **radix-ui** group to latest, **dockerode** 4 → 5, **better-sqlite3** 12.11.1, **nodemailer** 8 → 9, **@types/node** 26.

### ✅ Tests
- Added the project's first unit test (`server/email.test.js`) covering the email transporter and nodemailer 9.

---

## [v2.6.6] - 2026-11-11

### 🐛 Bug Fixes

- keep a signed-in user signed in when the server says slow down by @smashingtags in #682
- warn when a deployed app still uses a password everyone knows by @smashingtags in #683

### 📚 Documentation

- changelog for v2.6.5 by @github-actions[bot] in #681

### 🔧 Maintenance

- release v2.6.6 by @smashingtags in #684

## [v2.6.5] - 2026-11-11

### 🐛 Bug Fixes

- take deploy setting names from the trusted list by @smashingtags in #671
- make the app stop, remove and logs API routes find the deployed app by @smashingtags in #673
- make app secrets a setting the user fills in by @smashingtags in #674
- publish apps on the port chosen in the deploy dialog by @smashingtags in #672
- ask for the domain in standard mode when the app uses it by @smashingtags in #675
- keep concurrent deploys from sharing each other's settings by @smashingtags in #678
- let the deploy dialog redeploy an app on its own port by @smashingtags in #679

### 📚 Documentation

- changelog for v2.6.3 by @github-actions[bot] in #664
- changelog for v2.6.4 by @github-actions[bot] in #670

### 🔧 Maintenance

- space smoke page loads under the server request limit by @smashingtags in #676
- release v2.6.5 by @smashingtags in #680

### 🏗️ Infrastructure

- install the E2E browser without Ubuntu's package servers by @smashingtags in #677

## [v2.6.4] - 2026-11-11

### 🚀 Features

- warn at startup when AppArmor blocks deploys by @smashingtags in #666

### 🐛 Bug Fixes

- show why a deploy failed by @smashingtags in #665
- let deploy dialog values reach the app by @smashingtags in #667
- refuse a deploy that leaves an app's settings empty by @smashingtags in #668

### 🔧 Maintenance

- release v2.6.4 by @smashingtags in #669

## [v2.6.3] - 2026-11-11

### 🐛 Bug Fixes

- tell users with an old AppArmor profile how to update it by @smashingtags in #662

### 📚 Documentation

- changelog for v2.6.2 by @github-actions[bot] in #661

### 🔧 Maintenance

- release v2.6.3 by @smashingtags in #663

## [v2.6.2] - 2026-11-11

### 🐛 Bug Fixes

- give the CLI-mode Docker manager getDocker by @smashingtags in #658
- let deploys work on the read-only backend by @smashingtags in #657
- let the deploy dialog scroll on small screens by @smashingtags in #659

### 📚 Documentation

- rewrite the README and CONTRIBUTING for public readers by @smashingtags in #639
- changelog for v2.6.1 by @github-actions[bot] in #640

### ⬆️ Dependencies

- bump nginx from `785835e` to `713fc2e` by @dependabot[bot] in #644
- bump node from `8a32c8c` to `a34ab6d` by @dependabot[bot] in #645
- bump the actions group with 5 updates by @dependabot[bot] in #646
- bump the production group with 7 updates by @dependabot[bot] in #647
- bump the development group with 20 updates by @dependabot[bot] in #648
- bump @babel/helper-module-transforms from 7.29.7 to 7.29.13 by @dependabot[bot] in #649
- bump @babel/generator from 7.29.12 to 7.29.13 by @dependabot[bot] in #650
- bump @babel/helpers from 7.29.10 to 7.29.13 by @dependabot[bot] in #652
- bump @babel/helper-string-parser from 7.29.11 to 7.29.13 by @dependabot[bot] in #651
- bump @babel/parser from 7.29.12 to 7.29.13 by @dependabot[bot] in #653
- bump @babel/traverse from 7.29.12 to 7.29.13 by @dependabot[bot] in #654
- bump @babel/core from 7.29.7 to 7.29.13 by @dependabot[bot] in #655
- bump @babel/helper-compilation-targets from 7.29.7 to 7.29.13 by @dependabot[bot] in #656

### 🔧 Maintenance

- release v2.6.2 by @smashingtags in #660

## [v2.6.1] - 2026-11-04

### 🐛 Bug Fixes

- log the Docker endpoint the backend really uses by @smashingtags in #635
- start on root-owned appdata by taking ownership and dropping to uid 1001 by @smashingtags in #636

### 📚 Documentation

- changelog for v2.6.0 by @github-actions[bot] in #633
- list Movviz in the v2.6.0 changelog by @smashingtags in #634

### 🔧 Maintenance

- release v2.6.1 by @smashingtags in #637

## [v2.6.0] - 2026-11-04

### 🐛 Bug Fixes

- watch every filesystem that holds guests in the host alert by @smashingtags in #608
- retry image signing so a lost Rekor reply cannot ship an unsigned image by @smashingtags in #631

### 📚 Documentation

- changelog for v2.5.2 by @github-actions[bot] in #556
- drop the stale admin/admin warning from the wiki home page by @smashingtags in #629
- finish the v2.6.0 changelog and fill in v2.4.0 to v2.5.2 by @smashingtags in #632

### ⬆️ Dependencies

- bump the production group with 8 updates by @dependabot[bot] in #559
- bump the actions group with 2 updates by @dependabot[bot] in #560
- bump the development group with 23 updates by @dependabot[bot] in #561
- bump fast-uri from 3.1.7 to 3.1.8 by @dependabot[bot] in #562
- bump obug from 2.1.4 to 2.2.1 by @dependabot[bot] in #563
- bump undici from 7.29.0 to 7.30.0 by @dependabot[bot] in #564
- bump nanoid from 3.3.18 to 3.3.19 by @dependabot[bot] in #565
- bump nginx from `adad2ae` to `df221db` by @dependabot[bot] in #568
- bump the production group with 8 updates by @dependabot[bot] in #569
- bump mikepenz/release-changelog-builder-action from 6.3.0 to 6.4.0 in the actions group by @dependabot[bot] in #570
- bump the development group with 28 updates by @dependabot[bot] in #571
- bump nanoid from 3.3.19 to 3.3.20 by @dependabot[bot] in #572
- bump the actions group with 5 updates by @dependabot[bot] in #579
- bump shell-quote and concurrently by @dependabot[bot] in #581
- bump @babel/helpers from 7.29.7 to 7.29.10 by @dependabot[bot] in #583
- bump @babel/traverse from 7.29.8 to 7.29.10 by @dependabot[bot] in #584
- bump @babel/runtime from 7.29.7 to 7.29.10 by @dependabot[bot] in #585
- bump the development group across 1 directory with 35 updates by @dependabot[bot] in #586
- bump nginx from 1.31.6-alpine to 1.31.7-alpine in the docker group by @dependabot[bot] in #588
- bump node from `ebfe2f9` to `44fce69` by @dependabot[bot] in #589
- bump the development group with 16 updates by @dependabot[bot] in #591
- bump the actions group with 4 updates by @dependabot[bot] in #592
- bump nginx from 1.31.7-alpine to 1.31.8-alpine in the docker group by @dependabot[bot] in #594
- bump the actions group with 4 updates by @dependabot[bot] in #596
- bump nodemailer from 10.0.13 to 10.1.4 by @dependabot[bot] in #598
- bump fast-uri from 3.1.8 to 3.1.9 by @dependabot[bot] in #599
- bump ip-address from 10.7.3 to 10.7.5 by @dependabot[bot] in #600
- bump body-parser from 2.3.0 to 2.4.0 by @dependabot[bot] in #601
- bump node from `44fce69` to `06d7adf` by @dependabot[bot] in #595
- bump @babel/parser from 7.29.9 to 7.29.11 by @dependabot[bot] in #602
- bump qs from 6.16.0 to 6.17.1 by @dependabot[bot] in #610
- bump systeminformation from 5.33.15 to 5.33.19 by @dependabot[bot] in #611
- bump nginx from `1ef7ca9` to `785835e` by @dependabot[bot] in #614
- bump node from `06d7adf` to `8a32c8c` by @dependabot[bot] in #613
- bump the development group with 27 updates by @dependabot[bot] in #616
- bump the production group across 1 directory with 51 updates by @dependabot[bot] in #619
- bump actions/setup-go from 5.6.0 to 7.0.0 by @dependabot[bot] in #580

### 🔧 Maintenance

- v2.6.0 by @smashingtags in #627
- clear the dev-dependency audit findings by @smashingtags in #630

### 🏗️ Infrastructure

- build keen v1.2.2 for Jira release sync by @smashingtags in #606
- build keen v1.3.0 for Jira release sync by @smashingtags in #607
- record releases with keen v1.7.0 by @smashingtags in #609
- pin the current keen release for release sync by @smashingtags in #625
- pin keen 1.9.0 for release sync by @smashingtags in #628

### 🔄 Changes

- scan Python and the Actions workflows with CodeQL again by @smashingtags in #557
- fix the 22 alerts from the first Python and Actions scans by @smashingtags in #558
- download with curl; not every runner has wget by @smashingtags in #566
- add Movviz by @smashingtags in #574
- make the icon smoke check say what it saw, and keep the report by @smashingtags in #576
- send host alerts through the estate's Resend sender by @smashingtags in #575
- record each published release in Jira by @smashingtags in #577

### 📦 Other

- Fix first-install bugs (#620–#624) and clear lint warnings by @smashingtags in #626

## [v2.5.2] - 2026-09-28

### 📚 Documentation

- changelog for v2.5.1 by @github-actions[bot] in #516

### ⬆️ Dependencies

- bump node from `d32cdf6` to `e67514e` by @dependabot[bot] in #517
- bump the production group with 3 updates by @dependabot[bot] in #518
- bump mikepenz/release-changelog-builder-action from 6.2.3 to 6.3.0 in the actions group by @dependabot[bot] in #519
- bump the development group with 21 updates by @dependabot[bot] in #520
- bump protobufjs from 7.6.5 to 7.6.6 by @dependabot[bot] in #521
- bump js-yaml from 4.3.1 to 4.3.2 by @dependabot[bot] in #522
- bump nginx from 1.31.4-alpine to 1.31.5-alpine in the docker group by @dependabot[bot] in #524
- bump the production group with 6 updates by @dependabot[bot] in #525
- bump actions/deploy-pages from 5.0.0 to 5.0.1 in the actions group by @dependabot[bot] in #526
- bump the development group with 34 updates by @dependabot[bot] in #527
- bump fast-uri from 3.1.6 to 3.1.7 by @dependabot[bot] in #529
- bump undici from 7.29.0 to 7.29.1 by @dependabot[bot] in #531
- bump nodemailer from 9.0.6 to 9.1.1 by @dependabot[bot] in #534
- bump node from `e67514e` to `50c8e8c` by @dependabot[bot] in #535
- bump the production group with 7 updates by @dependabot[bot] in #536
- bump the actions group with 2 updates by @dependabot[bot] in #537
- bump node from `50c8e8c` to `ebfe2f9` by @dependabot[bot] in #541
- bump nginx from 1.31.5-alpine to 1.31.6-alpine in the docker group by @dependabot[bot] in #540
- bump the actions group with 5 updates by @dependabot[bot] in #542
- bump the development group across 1 directory with 34 updates by @dependabot[bot] in #543
- bump nodemailer from 9.1.1 to 10.0.10 by @dependabot[bot] in #539

### 🔄 Changes

- give wiki.homelabarr.com a robots.txt by @smashingtags in #523
- measure demo drift against the latest release, not main by @smashingtags in #544
- raise the qs override to 6.16.0 by @smashingtags in #545
- rate-limit each client, not the proxy in front of the backend by @smashingtags in #549
- move vitest, coverage-v8 and ui to 5 together by @smashingtags in #547
- an unanswered probe is unchecked, not failed by @smashingtags in #548
- one demo — point every link at demo.homelabarr.com by @smashingtags in #546
- commit the white-label audit only when a brand mention changes by @smashingtags in #550
- make the README quick start actually start HomelabARR CE by @smashingtags in #551
- README and SECURITY say what the code does by @smashingtags in #552
- hold password-reset tokens in a Map by @smashingtags in #553
- make the white-label audit identical on Mac and Linux by @smashingtags in #554
- v2.5.2 by @smashingtags in #555

## [v2.5.1] - 2026-08-29

### 📚 Documentation

- changelog for v2.5.0 by @github-actions[bot] in #513

### 🔄 Changes

- never let a release build reuse a cached package layer by @smashingtags in #514
- set the version to 2.5.1 by @smashingtags in #515

## [v2.5.0] - 2026-08-29

### 📚 Documentation

- changelog for v2.4.0 by @github-actions[bot] in #494

### ⬆️ Dependencies

- bump the actions group with 2 updates by @dependabot[bot] in #496
- bump the development group with 12 updates by @dependabot[bot] in #497
- bump eventsource-parser from 3.1.0 to 3.1.1 by @dependabot[bot] in #498
- bump nginx from 1.31.3-alpine to 1.31.4-alpine in the docker group across 1 directory by @dependabot[bot] in #499
- bump fast-uri from 3.1.5 to 3.1.6 by @dependabot[bot] in #503
- bump the production group across 1 directory with 3 updates by @dependabot[bot] in #506
- bump the actions group across 1 directory with 4 updates by @dependabot[bot] in #501
- bump the development group across 1 directory with 33 updates by @dependabot[bot] in #507

### 🔄 Changes

- restore container log reads through the socket proxy by @smashingtags in #505
- bring docker-build-push onto the artifact actions the rest of the repo uses by @smashingtags in #508
- take Stryker 10, bumping the vitest runner with the core by @smashingtags in #509
- take better-sqlite3-multiple-ciphers 13 by @smashingtags in #510
- cover the audit anchor and get the mutation lane green by @smashingtags in #511
- set the version to 2.5.0 by @smashingtags in #512

### 📦 Other

- Sync docs to imogenlabs org + current app count by @smashingtags in #495

## [v2.4.0] - 2026-08-13

### 📚 Documentation

- changelog for v2.3.0 by @github-actions[bot] in #493

### ⬆️ Dependencies

- bump sonner from 2.0.7 to 2.0.8 by @dependabot[bot] in #468
- bump the production group with 4 updates by @dependabot[bot] in #476
- bump node-abi from 3.92.0 to 3.94.0 by @dependabot[bot] in #469
- bump @testing-library/jest-dom from 7.0.0 to 7.0.1 in the development group by @dependabot[bot] in #480

### 🔄 Changes

- alert externally when the demo or dev goes down by @smashingtags in #459
- surface why a Discord notification failed by @smashingtags in #460
- strip whitespace from the webhook secret before use by @smashingtags in #461
- fall back across webhooks so one dead URL cannot mute alerting by @smashingtags in #462
- move dev.homelabarr.com to the CE dev app by @smashingtags in #463
- alert when the hypervisor disk fills or a domain pauses by @smashingtags in #466
- check the webhook up front so a missing one is not silent by @smashingtags in #467
- reset the public demo on a timer so a visitor cannot break it for good by @smashingtags in #471
- add a demo mode that refuses account changes by @smashingtags in #472
- build each architecture on its own runner instead of emulating arm64 by @smashingtags in #473
- merge routine dependency updates without a human touching them by @smashingtags in #474
- report the crash before trying to record it by @smashingtags in #479
- create the major-update label instead of assuming it exists by @smashingtags in #481
- bucket IPv6 login attempts by subnet instead of exact address by @smashingtags in #477
- let the server say it is a demo instead of guessing from the URL by @smashingtags in #485
- deliver hypervisor alerts by email so they reach someone by @smashingtags in #482
- stop the changelog workflow blanking the published wiki page by @smashingtags in #483
- make the changelog generator actually categorise this repo's PRs by @smashingtags in #486

## [v2.3.0] - 2026-08-12

### 🚀 Features

- swap octopus for new HomelabARR mascot (placeholder) by @smashingtags in #151

### 🐛 Bug Fixes

- whitelabel-audit workflow opens PR instead of direct push by @smashingtags in #156
- harden users.json loader + DialogDescription a11y by @smashingtags in #165

### 📚 Documentation

- changelog for v2.2.0 by @github-actions[bot] in #149
- add White-Label & Forking guide (self-maintaining) by @smashingtags in #152
- remove Pro Edition section + Author → Developer by @smashingtags in #155
- flatten nav + move Discord/Discussions to header icons by @smashingtags in #160
- refresh CE UI screenshots (dark + light) by @smashingtags in #161
- fix broken README mascot image by @smashingtags in #163

### ⬆️ Dependencies

- bump hono from 4.12.12 to 4.12.14 in the npm_and_yarn group across 1 directory by @dependabot[bot] in #167
- bump the npm_and_yarn group across 1 directory with 5 updates by @dependabot[bot] in #170
- bump the actions group across 1 directory with 14 updates by @dependabot[bot] in #198
- bump nginx from 1.31-alpine to 1.31.1-alpine by @dependabot[bot] in #210
- bump @babel/plugin-transform-react-jsx-source from 7.27.1 to 7.29.7 by @dependabot[bot] in #214
- bump the actions group across 1 directory with 3 updates by @dependabot[bot] in #222
- bump express and @types/express by @dependabot[bot] in #213
- bump better-sqlite3-multiple-ciphers from 11.10.0 to 12.10.0 by @dependabot[bot] in #215
- bump react-markdown from 9.1.0 to 10.1.0 by @dependabot[bot] in #216
- bump vitest and @vitest/ui by @dependabot[bot] in #224
- bump the dev-tools group across 1 directory with 37 updates by @dependabot[bot] in #227
- bump nginx from `d1aedbc` to `8b1e787` by @dependabot[bot] in #246
- bump the radix-ui group across 1 directory with 38 updates by @dependabot[bot] in #250
- bump nginx from 1.31.1-alpine to 1.31.2-alpine by @dependabot[bot] in #323
- bump the dev-tools group across 1 directory with 15 updates by @dependabot[bot] in #361
- bump the actions group across 1 directory with 3 updates by @dependabot[bot] in #324
- bump helmet from 7.2.0 to 8.2.0 by @dependabot[bot] in #351
- bump dockerode from 5.0.0 to 5.0.1 by @dependabot[bot] in #360
- bump @ungap/structured-clone from 1.3.1 to 1.3.2 by @dependabot[bot] in #356
- bump actions/setup-python from 6.2.0 to 6.3.0 in the actions group across 1 directory by @dependabot[bot] in #363
- bump the actions group with 7 updates by @dependabot[bot] in #381
- bump range-parser from 1.2.1 to 1.3.0 by @dependabot[bot] in #373
- bump nan from 2.27.0 to 2.28.0 by @dependabot[bot] in #372
- bump nginx from `2031656` to `54f2a90` by @dependabot[bot] in #374
- bump tar-fs from 2.1.4 to 2.1.5 by @dependabot[bot] in #375
- bump lucide-react from 1.21.0 to 1.22.0 by @dependabot[bot] in #376
- bump the dev-tools group across 1 directory with 49 updates by @dependabot[bot] in #416
- bump the actions group across 1 directory with 8 updates by @dependabot[bot] in #414
- bump fast-uri from 3.1.2 to 3.1.4 by @dependabot[bot] in #413
- bump the radix-ui group across 1 directory with 37 updates by @dependabot[bot] in #410
- bump nginx from 1.31.2-alpine to 1.31.3-alpine by @dependabot[bot] in #403
- bump @protobufjs/utf8 from 1.1.1 to 1.1.2 by @dependabot[bot] in #400
- bump protobufjs from 7.6.4 to 7.6.5 by @dependabot[bot] in #399
- bump helmet from 8.2.0 to 8.3.0 by @dependabot[bot] in #398
- bump brace-expansion from 5.0.6 to 5.0.8 by @dependabot[bot] in #412
- bump the dev-tools group across 1 directory with 32 updates by @dependabot[bot] in #436
- bump the actions group across 1 directory with 5 updates by @dependabot[bot] in #433
- bump node from `2bdb65e` to `d32cdf6` by @dependabot[bot] in #440
- bump the dev-tools group with 3 updates by @dependabot[bot] in #442
- bump @base-ui/react from 1.6.0 to 1.7.0 by @dependabot[bot] in #443
- bump ipaddr.js from 2.4.0 to 2.5.0 by @dependabot[bot] in #444
- bump react-dom and @types/react-dom by @dependabot[bot] in #447
- bump google/osv-scanner-action/osv-scanner-action from 2.3.8 to 2.5.0 in the actions group by @dependabot[bot] in #441
- bump the dev-tools group with 2 updates by @dependabot[bot] in #450
- bump lucide-react from 1.22.0 to 1.30.0 by @dependabot[bot] in #451
- bump nodemailer from 9.0.1 to 9.0.5 by @dependabot[bot] in #453

### 🔧 Maintenance

- remove stale tracked files by @smashingtags in #150
- remove stale octopus favicons by @smashingtags in #153
- optimize app icons (PNG → WebP, 5.9MB → 1.2MB) by @smashingtags in #154
- remove unused react-query, bump shadcn (kills all npm deprecation warnings) by @smashingtags in #158
- bump hono from 4.12.12 to 4.12.14 in the npm_and_yarn group across 1 directory by @dependabot[bot] in #167
- bump the npm_and_yarn group across 1 directory with 5 updates by @dependabot[bot] in #170
- bump the actions group across 1 directory with 14 updates by @dependabot[bot] in #198
- bump nginx from 1.31-alpine to 1.31.1-alpine by @dependabot[bot] in #210
- bump @babel/plugin-transform-react-jsx-source from 7.27.1 to 7.29.7 by @dependabot[bot] in #214
- bump the actions group across 1 directory with 3 updates by @dependabot[bot] in #222
- bump express and @types/express by @dependabot[bot] in #213
- bump better-sqlite3-multiple-ciphers from 11.10.0 to 12.10.0 by @dependabot[bot] in #215
- bump react-markdown from 9.1.0 to 10.1.0 by @dependabot[bot] in #216
- bump vitest and @vitest/ui by @dependabot[bot] in #224
- bump the dev-tools group across 1 directory with 37 updates by @dependabot[bot] in #227
- bump nginx from `d1aedbc` to `8b1e787` by @dependabot[bot] in #246
- bump the radix-ui group across 1 directory with 38 updates by @dependabot[bot] in #250
- bump nginx from 1.31.1-alpine to 1.31.2-alpine by @dependabot[bot] in #323
- bump the dev-tools group across 1 directory with 15 updates by @dependabot[bot] in #361
- bump the actions group across 1 directory with 3 updates by @dependabot[bot] in #324
- bump helmet from 7.2.0 to 8.2.0 by @dependabot[bot] in #351
- bump dockerode from 5.0.0 to 5.0.1 by @dependabot[bot] in #360
- bump @ungap/structured-clone from 1.3.1 to 1.3.2 by @dependabot[bot] in #356
- bump actions/setup-python from 6.2.0 to 6.3.0 in the actions group across 1 directory by @dependabot[bot] in #363
- bump the actions group with 7 updates by @dependabot[bot] in #381
- bump range-parser from 1.2.1 to 1.3.0 by @dependabot[bot] in #373
- bump nan from 2.27.0 to 2.28.0 by @dependabot[bot] in #372
- bump nginx from `2031656` to `54f2a90` by @dependabot[bot] in #374
- bump tar-fs from 2.1.4 to 2.1.5 by @dependabot[bot] in #375
- bump lucide-react from 1.21.0 to 1.22.0 by @dependabot[bot] in #376
- bump the dev-tools group across 1 directory with 49 updates by @dependabot[bot] in #416
- bump the actions group across 1 directory with 8 updates by @dependabot[bot] in #414
- bump fast-uri from 3.1.2 to 3.1.4 by @dependabot[bot] in #413
- bump the radix-ui group across 1 directory with 37 updates by @dependabot[bot] in #410
- bump nginx from 1.31.2-alpine to 1.31.3-alpine by @dependabot[bot] in #403
- bump @protobufjs/utf8 from 1.1.1 to 1.1.2 by @dependabot[bot] in #400
- bump protobufjs from 7.6.4 to 7.6.5 by @dependabot[bot] in #399
- bump helmet from 8.2.0 to 8.3.0 by @dependabot[bot] in #398
- bump brace-expansion from 5.0.6 to 5.0.8 by @dependabot[bot] in #412
- bump the dev-tools group across 1 directory with 32 updates by @dependabot[bot] in #436
- bump the actions group across 1 directory with 5 updates by @dependabot[bot] in #433
- bump node from `2bdb65e` to `d32cdf6` by @dependabot[bot] in #440
- bump the dev-tools group with 3 updates by @dependabot[bot] in #442
- bump @base-ui/react from 1.6.0 to 1.7.0 by @dependabot[bot] in #443
- bump ipaddr.js from 2.4.0 to 2.5.0 by @dependabot[bot] in #444
- bump react-dom and @types/react-dom by @dependabot[bot] in #447
- bump google/osv-scanner-action/osv-scanner-action from 2.3.8 to 2.5.0 in the actions group by @dependabot[bot] in #441
- bump the dev-tools group with 2 updates by @dependabot[bot] in #450
- bump lucide-react from 1.22.0 to 1.30.0 by @dependabot[bot] in #451
- bump nodemailer from 9.0.1 to 9.0.5 by @dependabot[bot] in #453

### 🏗️ Infrastructure

- bump Playwright workers from 1 to 4 by @smashingtags in #157
- auto-build :dev on dev pushes (ce-dev auto-deploy) by @smashingtags in #249

- Add OWNER-PUNCHLIST for project management by @smashingtags in #203
- revert cosign-installer to v3 (fix red build from #222) by @smashingtags in #228
- fix cosign verify identity (org migration smashingtags->imogenlabs) by @smashingtags in #229
- fix vitest e2e exclusion + drop deprecated tsconfig baseUrl by @smashingtags in #230
- manualChunks function form for Vite 8/rolldown (unblocks #227) by @smashingtags in #231
- run security/compliance CI suite on self-hosted runners by @smashingtags in #232
- revert to GitHub-hosted (public repo = free minutes; self-hosted blocked for public) by @smashingtags in #233
- fix backend crash loop (path-to-regexp override vs Express 5) by @smashingtags in #234
- fix DAST Baseline duplicate-artifact 409 by @smashingtags in #236
- TruffleHog (CI) + Betterleaks (pre-commit) — drop license-blocked gitleaks-action by @smashingtags in #237
- fix compose-security-validation install (mkdir -p ~/.local/bin) by @smashingtags in #238
- fix compose validation step (filter + --no-interpolate) + tubesync volume by @smashingtags in #239
- validate compose templates as YAML+services (runner-stable) by @smashingtags in #240
- scope docker vuln scan to own images + fix multi-run SARIF by @smashingtags in #241
- rewrite E2E suite to run the real product locally by @smashingtags in #242
- Release dev → main: E2E and cleanup by @smashingtags in #243
- stabilize E2E on CI (cold-hydration timeouts + docker-free harness) by @smashingtags in #244
- Release dev → main: /auth/me reload fix, E2E on ce-dev, Dependabot unblock by @smashingtags in #248
- React 18 → 19 upgrade (core bump + forwardRef modernization) by @smashingtags in #273
- roll up Dependabot deps + fix lucide-react React 19 peer by @smashingtags in #276
- roll up remaining Dependabot PRs (radix transitive, dev-tools, nodemailer) by @smashingtags in #277
- nodemailer 9 regression test + React 19 changelog by @smashingtags in #278
- documentation sweep for React 19 upgrade by @smashingtags in #280
- fix broken wiki links (strict mkdocs build passes) by @smashingtags in #282
- migrate GHCR namespace + deploy wiring smashingtags → imogenlabs by @smashingtags in #285
- build-push workflow manual-dispatch only (minutes out is permanent) by @smashingtags in #287
- add CodeQL SAST workflow by @smashingtags in #288
- pages.yml → ubuntu-latest (unblock wiki publish) by @smashingtags in #289
- revert pages.yml to self-hosted (gitrunners fixed) by @smashingtags in #291
- pages.yml on ubuntu-latest (public repo cannot use self-hosted runners) by @smashingtags in #293
- test harness + Wave 1 unit tests (166 green) by @smashingtags in #294
- Unit/coverage CI gate on ubuntu-latest with ratcheting floor by @smashingtags in #295
- Unit tests for auth core (JWT, bcrypt, API keys, secrets) by @smashingtags in #296
- Unit tests for MFA (TOTP + backup codes) by @smashingtags in #297
- CHANGELOG for Wave-2 auth + MFA tests by @smashingtags in #298
- tests for rate-limit & account lockout by @smashingtags in #299
- supertest integration tests for auth HTTP routes by @smashingtags in #300
- persistence-integrity tests (db / stars / activity / loggers) by @smashingtags in #301
- audit hash-chain + secure-logging tests (audit/log/alert) by @smashingtags in #302
- fix SQLCipher encryption-at-rest init (key before WAL) by @smashingtags in #303
- docker-manager tests (mocked dockerode) by @smashingtags in #304
- deploy/SSE + startup-guard + network tests by @smashingtags in #305
- React contexts & hooks tests (AuthContext 100%) by @smashingtags in #306
- high-value component tests (RTL) by @smashingtags in #307
- Bug-lock regression — fix safeUrl / deployment.ts / cli-bridge appId by @smashingtags in #308
- Security-invariant regression suite (permanent guardrails) by @smashingtags in #309
- integration tests for dangerous ops (delete, deploy spawn, down -v) by @smashingtags in #310
- fix SSE broadcast skipping a client after a failing one by @smashingtags in #311
- make login limiter's skipSuccessfulRequests effective by @smashingtags in #312
- frame audit row_hash with JSON to close boundary-ambiguous tamper by @smashingtags in #313
- probe the Docker daemon instead of hardcoding healthy by @smashingtags in #314
- enforce react-hooks v7 rules as errors by @smashingtags in #315
- Playwright E2E seeded target + critical journeys (and fix deploy 404) by @smashingtags in #316
- README — E2E lanes + app count 117 by @smashingtags in #317
- /health/detail 200→500 on internal error by @smashingtags in #318
- validation path check case-insensitive on field key by @smashingtags in #319
- unify password minimum length to 12 by @smashingtags in #320
- validate container web port in all enhanced-mount handlers by @smashingtags in #321
- detect audit-log tail truncation (chain tip) by @smashingtags in #322
- StrykerJS mutation-testing harness + scoped baseline by @smashingtags in #325
- integration tests for untested backend routes (+ Router() bug fix) by @smashingtags in #326
- frontend security-component tests + lib/api gaps (+ password-min fix) by @smashingtags in #327
- deploy-execution + backend-branch coverage (+ dead-code removal) by @smashingtags in #328
- E2E round 2 — failure/permission/account journeys + harden (+ mount-wizard stub, bug fix) by @smashingtags in #329
- make GET /containers?stats=true non-blocking (async exec) by @smashingtags in #331
- mutation pass on high-risk security modules (≥80% score) by @smashingtags in #332
- nightly mutation-testing CI + per-module score ratchet by @smashingtags in #333
- client port-conflict validation for text-typed catalog port fields by @smashingtags in #335
- cover the remaining enhanced-mount route handlers by @smashingtags in #336
- mutation pass on the dangerous-op routes (+ final coverage ratchet) by @smashingtags in #337
- frontend security fixes (rclone XSS, credential log, port validation) by @smashingtags in #338
- audit/log/alert/db hardening (redaction drift, SQLCipher, alert) by @smashingtags in #339
- cli-bridge — stop process.env pollution + deployStandard hardening by @smashingtags in #340
- mandatory CSRF token + route hardening (health path, dockerode stats) by @smashingtags in #341
- harden auth routes — cli-mint jti-less+ttl, constant-time validatePassword, MFA invariant pins by @smashingtags in #342
- track Docker/SSE timers, fix health lie, lock down SSE CORS + subscribe auth by @smashingtags in #343
- ratchet coverage floor + consolidated remediation CHANGELOG by @smashingtags in #344
- deploy.js outer catch is unreachable — trim dead branches + pin parser boundary by @smashingtags in #345
- out-of-band HMAC-signed audit chain-tip anchor by @smashingtags in #346
- CHANGELOG for audit anchor + deploy-catch cleanup by @smashingtags in #348
- document AUDIT_ANCHOR_KEY + out-of-band audit anchor by @smashingtags in #349
- resolve open code-scanning alerts by @smashingtags in #354
- make log-injection sanitizer CodeQL-recognized by @smashingtags in #355
- restore Trivy default-branch reporting by @smashingtags in #353
- patch npm-bundled undici (CVE-2026-12151) in backend image by @smashingtags in #365
- fix undici patch — pack-and-replace npm's bundled copy by @smashingtags in #367
- restore dual-registry auto-publish (Docker Hub regression fix) by @smashingtags in #368
- smoke E2E reuses one session (fix 15-min rate-limit cascade) by @smashingtags in #369
- bump backend base + weekly no-cache rebuild (fix stale docker-cli CVE) by @smashingtags in #370
- ignore typescript >=6.1.0 in dependabot dev-tools group by @smashingtags in #387
- resolve 4 open security alerts by @smashingtags in #418
- consolidate four lock bumps and pin node to major 24 by @smashingtags in #437
- remove npm from the backend image instead of patching its deps by @smashingtags in #438
- guard the native build and give the E2E lane real diagnostics by @smashingtags in #446
- drop the unused better-sqlite3 dependency by @smashingtags in #454
- release v2.3.0 by @smashingtags in #456

## [v2.2.0] - April 14, 2026

### 🐛 Bug Fixes (Backported from Eight.ly fork)
- **Container delete/stop/restart**: Docker client was never passed to the CLI manager. All container operations now work correctly. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))
- **Docker socket permissions**: Apps that mount `docker.sock` (Portainer, etc.) now get `group_add` injected at deploy time so they can read/write the socket. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))
- **Read-only template volumes**: Temp deploy YAMLs now write to `server/data/` instead of next to the source YAML, so deploys don't fail with EACCES on read-only mounts. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))
- **Deploy progress stream**: SSE `connected` event now includes the server-assigned `clientId`, fixing "Client not found" 500s on subscribe. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))

### 🔒 Security
- **npm vulnerabilities patched**: vite, hono, @hono/node-server bumped to address 9 advisories (3 high, 6 moderate). ([#145](https://github.com/imogenlabs/homelabarr-ce/pull/145))
- **Workflow permissions**: Added explicit `permissions: contents: read` to all workflows missing it. Resolves CodeQL alert. ([#144](https://github.com/imogenlabs/homelabarr-ce/pull/144))

### 📚 Documentation
- **Wiki cleanup**: Removed Professional Edition section; replaced placeholder octopus with optimized v3b WebP at proper sizes. ([#147](https://github.com/imogenlabs/homelabarr-ce/pull/147))

---

## [v2.0.0] - September 2025

### 🗄️ ARCHIVED COMPONENTS
- **Mount Enhanced Legacy System**: Moved obsolete cloud storage mounting system to archives
  - **Location**: `MASTER_DOCUMENTATION/8_ARCHIVES/OBSOLETE_COMPONENTS/mount-enhanced-legacy/`
  - **Reason**: Technology shift from cloud storage to local NAS solutions
  - **Impact**: Zero impact on core system functionality
  - **Components Archived**:
    - Complete Node.js backend with multi-provider integration
    - Docker configuration and deployment files
    - Technical documentation and setup guides
    - API documentation and troubleshooting guides

### 📋 CONTEXT
- **Google Drive Unlimited Ended**: Original use case no longer viable
- **Community Shift**: Users moved to local NAS solutions (Synology, QNAP, Unraid, TrueNAS)
- **Simplified Architecture**: Focus on Docker + local storage integration
- **Code Preservation**: All functionality preserved in archive for future reference

### ✅ SYSTEM STATUS
- **Core Functionality**: Unaffected
- **Docker Management**: Fully operational
- **Application Deployment**: All 100+ applications available
- **Traefik + Authelia**: Fully functional
- **React Frontend**: Enhanced and optimized
- **CLI Bridge**: Seamless shell script integration

---

## Previous Versions
*Historical changelog entries would be added here as the system evolves*