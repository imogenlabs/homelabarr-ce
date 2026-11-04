// HLCE-365 — PR titles carry the tracker key so the tracker can link them, and the
// release changelog generator copied it into the public wiki ("- HLCE-364 log the
// Docker endpoint..."). The wiki updater now strips a leading key from each entry
// and leaves advisory ids alone. Runs the real script against a temp page.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(root, 'scripts/update-wiki-changelog.mjs');

function publish(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-changelog-'));
  const page = path.join(dir, 'changelog.md');
  fs.writeFileSync(page, '# Changelog\n\nLatest releases.\n\n---\n\n## [v1.0.0] - 2026-01-01\n\n- First release\n');
  execFileSync(process.execPath, [script], {
    env: { ...process.env, WIKI_PAGE: page, RELEASE_TAG: 'v1.0.1', RELEASE_DATE: '2026-11-04', CHANGELOG_BODY: body },
    stdio: 'pipe',
  });
  return fs.readFileSync(page, 'utf8');
}

describe('wiki changelog drops tracker keys (HLCE-365)', () => {
  it('strips a leading key, with or without a colon, and keeps advisory ids', () => {
    const page = publish([
      '## 🐛 Bug Fixes',
      '',
      '- HLCE-364 log the Docker endpoint the backend really uses by @someone in #635',
      '- EOS-2459: download with curl; not every runner has wget by @someone in #566',
      '- patch CVE-2026-12151 and GHSA-mrhx-c7xc-m3w5 in the image by @someone in #640',
    ].join('\n'));
    expect(page).toContain('- log the Docker endpoint the backend really uses by @someone in #635');
    expect(page).toContain('- download with curl; not every runner has wget by @someone in #566');
    expect(page).toContain('CVE-2026-12151 and GHSA-mrhx-c7xc-m3w5');
    expect(page).not.toMatch(/HLCE-364|EOS-2459/);
    expect(page).toContain('- First release');
  });
});
