#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = process.argv[2];
if (!outDir) { console.error('Usage: render-binder-index.js <binder-dir>'); process.exit(1); }

const date = new Date().toISOString();
const sha = execSync('git rev-parse --short HEAD 2>/dev/null || echo unknown').toString().trim();
const hostname = require('os').hostname();

function readEvidence(name) {
  const p = path.join(outDir, 'evidence', name);
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function parseJSON(text) {
  if (!text) return null;
  const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim());
  for (const line of lines) {
    try { return JSON.parse(line); } catch {}
  }
  return null;
}

function badge(ok, label) {
  const color = ok ? '#22c55e' : '#ef4444';
  const text = ok ? 'PASS' : 'FAIL';
  return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold;font-size:12px">${text}</span> ${label}`;
}

// R5 cosign
const cosignTxt = readEvidence('R5-cosign.txt');
const cosignPass = cosignTxt && /verified/i.test(cosignTxt);

// R6 audit chain
const auditTxt = readEvidence('R6-audit-chain.txt');
const auditData = parseJSON(auditTxt);
const auditOk = auditData && auditData.bad === 0;

// R12 SLO
const sloTxt = readEvidence('R12-slo-snapshot.txt');
const sloData = parseJSON(sloTxt);

// R15 staleness
const staleTxt = readEvidence('R15-dep-staleness.txt');

// List binder files
function listDir(sub) {
  const dir = path.join(outDir, sub);
  try { return fs.readdirSync(dir).filter(f => f.endsWith('.md')); } catch { return []; }
}

const binders = listDir('binders');
const governance = listDir('governance');
const auditFiles = listDir('audit');
const irFiles = listDir('ir/playbooks');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Compliance Binder — ${date.split('T')[0]} (${sha})</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0b; color: #e4e4e7; padding: 24px; max-width: 960px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 4px; color: #fafafa; }
  h2 { font-size: 18px; margin: 24px 0 12px; color: #fafafa; border-bottom: 1px solid #27272a; padding-bottom: 8px; }
  .meta { color: #71717a; font-size: 13px; margin-bottom: 24px; }
  .panel { background: #111113; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .panel-title { font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #a1a1aa; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .stat { font-size: 14px; line-height: 1.6; }
  ul { list-style: none; padding: 0; }
  li { padding: 4px 0; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #27272a; color: #52525b; font-size: 12px; }
  @media print { body { background: #fff; color: #000; } .panel { border-color: #ccc; background: #f9f9f9; } a { color: #1d4ed8; } h1, h2 { color: #000; } }
</style>
</head>
<body>
<h1>HomelabARR CE — Compliance Binder</h1>
<div class="meta">Built ${date} | git ${sha} | host ${hostname}</div>

<h2>Live Status</h2>
<div class="grid">
  <div class="panel">
    <div class="panel-title">R5 — Image Signing (cosign)</div>
    <div class="stat">${badge(cosignPass, cosignPass ? 'Images verified' : 'Verification failed or unavailable')}</div>
  </div>
  <div class="panel">
    <div class="panel-title">R6 — Audit Chain Integrity</div>
    <div class="stat">${auditData
      ? badge(auditOk, `${auditData.ok} ok / ${auditData.bad} bad / ${auditData.total} total`)
      : badge(false, 'No audit chain data')}</div>
  </div>
  <div class="panel">
    <div class="panel-title">R12 — SLO Snapshot</div>
    <div class="stat">${sloData && sloData.health_total !== undefined
      ? `Health: ${sloData.health_200}/${sloData.health_total} (${sloData.health_total > 0 ? ((sloData.health_200/sloData.health_total)*100).toFixed(2) : 0}%) | Login p95: ${sloData.login_p95_seconds || 'N/A'}s`
      : '<span style="color:#71717a">No SLO data (nginx logs not available from collector)</span>'}</div>
  </div>
  <div class="panel">
    <div class="panel-title">R15 — Dependency Staleness</div>
    <div class="stat">${staleTxt && !staleTxt.includes('not available')
      ? staleTxt.split('\n').filter(l => !l.startsWith('#') && l.trim()).slice(0, 3).join('<br>')
      : '<span style="color:#71717a">No staleness data (gh CLI not available or no runs yet)</span>'}</div>
  </div>
</div>

<h2>Framework Binders</h2>
<ul>${binders.map(f => `<li><a href="binders/${f}">${f}</a></li>`).join('\n')}</ul>

<h2>Governance</h2>
<ul>${governance.map(f => `<li><a href="governance/${f}">${f}</a></li>`).join('\n')}</ul>

<h2>Incident Response Playbooks</h2>
<ul>${irFiles.map(f => `<li><a href="ir/playbooks/${f}">${f}</a></li>`).join('\n')}</ul>

<h2>Audit Rounds</h2>
<ul>${auditFiles.map(f => `<li><a href="audit/${f}">${f}</a></li>`).join('\n')}</ul>

<div class="footer">
  Attestation: <a href="attestation.json">attestation.json</a> |
  Manifest: <a href="manifest.sha256">manifest.sha256</a>
</div>
</body>
</html>`;

process.stdout.write(html);
