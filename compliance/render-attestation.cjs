#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const os = require('os');

const outDir = process.argv[2];
if (!outDir) { console.error('Usage: render-attestation.js <binder-dir>'); process.exit(1); }

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10000 }).trim(); } catch { return null; }
}

function fileHash(p) {
  const data = fs.readFileSync(p);
  return crypto.createHash('sha256').update(data).digest('hex');
}

const evidenceDir = path.join(outDir, 'evidence');
const evidenceFiles = [];
if (fs.existsSync(evidenceDir)) {
  for (const f of fs.readdirSync(evidenceDir)) {
    const fp = path.join(evidenceDir, f);
    const stat = fs.statSync(fp);
    if (stat.isFile()) {
      evidenceFiles.push({
        path: `evidence/${f}`,
        sha256: fileHash(fp),
        bytes: stat.size,
      });
    }
  }
}

const manifestPath = path.join(outDir, 'manifest.sha256');
const manifestSha = fs.existsSync(manifestPath) ? fileHash(manifestPath) : null;

const backendImage = run('docker inspect homelabarr-demo-backend --format "{{.Config.Image}}" 2>/dev/null');
const frontendImage = run('docker inspect homelabarr-demo-frontend --format "{{.Config.Image}}" 2>/dev/null');

let cosignBackend = null;
let cosignFrontend = null;
if (backendImage && run('command -v cosign')) {
  cosignBackend = run(`cosign verify --certificate-identity-regexp smashingtags --certificate-oidc-issuer https://token.actions.githubusercontent.com "${backendImage}" 2>&1 >/dev/null`) !== null ? 'pass' : 'fail';
}
if (frontendImage && run('command -v cosign')) {
  cosignFrontend = run(`cosign verify --certificate-identity-regexp smashingtags --certificate-oidc-issuer https://token.actions.githubusercontent.com "${frontendImage}" 2>&1 >/dev/null`) !== null ? 'pass' : 'fail';
}

const attestation = {
  builder: 'compliance/build-binder.sh',
  build_time_utc: new Date().toISOString(),
  git_sha: run('git rev-parse HEAD') || 'unknown',
  git_branch: run('git branch --show-current') || 'unknown',
  git_dirty: (run('git status --porcelain') || '').length > 0,
  signed: false,
  host: {
    hostname: os.hostname(),
    kernel: run('uname -r') || 'unknown',
    docker_version: run('docker --version') || 'not available',
  },
  stack: {
    backend_image: backendImage || 'not available',
    frontend_image: frontendImage || 'not available',
    cosign_verify_backend: cosignBackend || 'not available',
    cosign_verify_frontend: cosignFrontend || 'not available',
  },
  evidence_files: evidenceFiles,
  manifest_sha256: manifestSha,
};

process.stdout.write(JSON.stringify(attestation, null, 2) + '\n');
