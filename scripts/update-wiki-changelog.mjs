#!/usr/bin/env node
// Merges one release's generated notes into the published wiki changelog.
//
// It exists because the workflow used to do this instead:
//
//   echo "# HomelabARR CE Changelog" >  wiki/docs/install/changelog.md
//   echo "${{ steps.github_release.outputs.changelog }}" >> wiki/docs/install/changelog.md
//
// which truncated the page before it knew whether it had anything to write. When
// v2.3.0 produced empty generator output that opened PR #458: 63 lines removed, 2
// added, and a live public page reduced to a header. Empty was indistinguishable
// from success.
//
// Two things were wrong, and both are fixed here:
//
//  1. An empty or degenerate generator result must stop the run, not publish.
//  2. Even a NON-empty result destroyed history, because the generator only ever
//     emits the latest release's notes while the page holds every release. So this
//     inserts rather than overwrites. The page can only grow.
//
// Refuses to publish and exits non-zero on anything it cannot vouch for. Silence
// is the failure mode this whole file exists to prevent.

import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = process.env.WIKI_PAGE ?? 'wiki/docs/install/changelog.md';
const TAG = (process.env.RELEASE_TAG ?? '').trim();
const BODY = process.env.CHANGELOG_BODY ?? '';

// The generator falls back to `empty_template` when no PRs match, so "no content"
// arrives as this string rather than as nothing at all. Both are degenerate.
const DEGENERATE = ['- no changes', 'no changes', '-'];
const MIN_MEANINGFUL_CHARS = 40;

function die(why) {
  // ::error:: so it lands on the workflow summary rather than only in the log.
  console.error(`::error::Changelog not published: ${why}`);
  console.error(`The existing ${PAGE} was left untouched.`);
  process.exit(1);
}

if (!TAG) die('RELEASE_TAG is empty — refusing to guess which release this is.');

const body = BODY.trim();
if (!body) {
  die(
    `the release-notes generator returned nothing for ${TAG}. ` +
      'This is exactly the failure that produced PR #458.'
  );
}

// Strip the scaffolding the generator always emits — headings, bullets, blank
// lines — and see whether any actual prose survives.
const meaningful = body
  .split('\n')
  .map((l) => l.replace(/^\s*#{1,6}\s*/, '').replace(/^\s*[-*]\s*/, '').trim())
  .filter(Boolean)
  .filter((l) => !DEGENERATE.includes(l.toLowerCase()));

if (meaningful.length === 0) {
  die(`the generated notes for ${TAG} contain no entries, only headings or "No changes".`);
}
if (meaningful.join(' ').length < MIN_MEANINGFUL_CHARS) {
  die(
    `the generated notes for ${TAG} are too short to be real ` +
      `(${meaningful.join(' ').length} chars of content, minimum ${MIN_MEANINGFUL_CHARS}).`
  );
}

let existing;
try {
  existing = readFileSync(PAGE, 'utf8');
} catch (err) {
  die(`${PAGE} could not be read (${err.code}). Refusing to create a page from scratch.`);
}
if (!existing.trim()) die(`${PAGE} is empty — refusing to build on top of a blank page.`);

// Re-running a release (a re-published release event, a manual backfill) must not
// stack duplicate sections.
if (new RegExp(`^##\\s*\\[?${TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]?`, 'm').test(existing)) {
  console.log(`${TAG} is already in ${PAGE}; nothing to do.`);
  process.exit(0);
}

const date = new Date(process.env.RELEASE_DATE || Date.now()).toISOString().slice(0, 10);

// The generator's category titles are `## 🚀 Features`, which would sit at the same
// heading level as the release itself and flatten the wiki's table of contents.
// Push them one level down so they nest under their release.
const nested = body.replace(/^(#{1,5})\s/gm, '#$1 ');
const section = `## [${TAG}] - ${date}\n\n${nested}\n\n`;

// Insert above the newest versioned release so the page stays reverse-chronological,
// and below anything above it (title, intro, an [Unreleased] section).
const lines = existing.split('\n');
const at = lines.findIndex((l) => /^##\s*\[?v\d/.test(l));
const cut = at === -1 ? existing.length : lines.slice(0, at).join('\n').length + 1;

const head = existing.slice(0, cut);
const tail = existing.slice(cut);
const merged = at === -1 ? `${existing.replace(/\s*$/, '')}\n\n${section}` : head + section + tail;

// The point of this file is that the page cannot shrink. Prove it rather than
// trusting the splice above: every byte that was there must still be there.
if (!merged.includes(head) || !merged.includes(tail)) {
  die('the merge would have dropped existing content — this is a bug, not a release problem.');
}
const removed = existing.split('\n').filter((l) => l.trim() && !merged.includes(l));
if (removed.length > 0) {
  die(`the merge would remove ${removed.length} existing line(s), starting with: ${removed[0]}`);
}

writeFileSync(PAGE, merged);
console.log(
  `Added ${TAG} to ${PAGE}: ${meaningful.length} entries, ` +
    `${existing.split('\n').length} lines -> ${merged.split('\n').length}.`
);
