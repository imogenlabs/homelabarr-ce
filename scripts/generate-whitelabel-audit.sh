#!/usr/bin/env bash
#
# generate-whitelabel-audit.sh
#
# Greps the repo for every HomelabARR brand reference and writes a
# structured markdown audit to wiki/docs/guides/_white-label-audit.md.
# Run on every push to main by .github/workflows/whitelabel-audit.yml,
# which auto-commits the result.
#
# Designed to be idempotent and portable (bash 3.2+).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_FILE="$REPO_ROOT/wiki/docs/guides/_white-label-audit.md"
TMP_MATCHES=$(mktemp)
trap 'rm -f "$TMP_MATCHES"' EXIT

cd "$REPO_ROOT"

# Files to exclude from the audit.
# History narrative stays unchanged for project honesty.
# The guide itself and its audit obviously shouldn't self-match.
# LICENSE must keep original copyright per MIT.
EXCLUDES=(
  ':(exclude).git/**'
  ':(exclude)node_modules/**'
  ':(exclude)dist/**'
  ':(exclude)package-lock.json'
  ':(exclude)wiki/docs/guides/history.md'
  ':(exclude)wiki/docs/guides/white-label.md'
  ':(exclude)wiki/docs/guides/_white-label-audit.md'
  ':(exclude)LICENSE'
  ':(exclude)scripts/generate-whitelabel-audit.sh'
)

# Pattern: any case variant of homelabarr, plus known URLs/handles.
PATTERN='[Hh]omelabarr|HOMELABARR|discord\.gg/Pc7mXX786x|reddit\.com/r/homelabarr|ko-fi\.com/homelabarr|smashingtags'

# Collect file:line:content matches
git ls-files -- "${EXCLUDES[@]}" | while IFS= read -r f; do
  [ -f "$f" ] || continue
  grep -HnE "$PATTERN" "$f" 2>/dev/null || true
done > "$TMP_MATCHES"

TOTAL=$(wc -l < "$TMP_MATCHES" | tr -d ' ')

# Filter helpers - print matching lines for a category, using shell case globbing
filter_category() {
  local cat="$1"
  while IFS= read -r line; do
    local file="${line%%:*}"
    case "$cat:$file" in
      ui:src/*|ui:index.html) echo "$line" ;;
      backend:server/*|backend:docker-entrypoint.sh) echo "$line" ;;
      docker:Dockerfile*|docker:homelabarr.yml) echo "$line" ;;
      cicd:.github/workflows/*) echo "$line" ;;
      config:package.json|config:CNAME|config:.env.example|config:nginx.conf.template) echo "$line" ;;
      scripts:install.sh|scripts:install-remote.sh|scripts:preinstall/*|scripts:scripts/*) echo "$line" ;;
      docs:README.md|docs:CONTRIBUTING.md|docs:SECURITY.md|docs:CHANGELOG.md) echo "$line" ;;
      wiki:wiki/*) echo "$line" ;;
    esac
  done < "$TMP_MATCHES"
}

# Also a fallback to catch anything not covered above
filter_other() {
  while IFS= read -r line; do
    local file="${line%%:*}"
    case "$file" in
      src/*|index.html) ;;
      server/*|docker-entrypoint.sh) ;;
      Dockerfile*|homelabarr.yml) ;;
      .github/workflows/*) ;;
      package.json|CNAME|.env.example|nginx.conf.template) ;;
      install.sh|install-remote.sh|preinstall/*|scripts/*) ;;
      README.md|CONTRIBUTING.md|SECURITY.md|CHANGELOG.md) ;;
      wiki/*) ;;
      *) echo "$line" ;;
    esac
  done < "$TMP_MATCHES"
}

render_section() {
  local label="$1"
  local content="$2"
  [ -z "$content" ] && return
  local count
  count=$(echo "$content" | grep -c . || echo 0)
  echo "## $label"
  echo ""
  echo "**$count references**"
  echo ""
  echo '| File | Line | Match |'
  echo '| ---- | ---- | ----- |'
  echo "$content" | while IFS= read -r row; do
    [ -z "$row" ] && continue
    local f ln rest snippet
    f="${row%%:*}"
    row="${row#*:}"
    ln="${row%%:*}"
    rest="${row#*:}"
    # Escape pipes, trim to 120 chars, remove backticks to avoid breaking markdown
    snippet=$(echo "$rest" | sed 's/|/\\|/g; s/`/'"'"'/g' | cut -c1-120)
    echo "| \`$f\` | $ln | \`$snippet\` |"
  done
  echo ""
}

# Build output
{
  cat <<EOF
# White-Label Audit (auto-generated)

> **Generated:** $(date -u '+%Y-%m-%d %H:%M UTC') · **Source:** \`scripts/generate-whitelabel-audit.sh\`
>
> This file is regenerated automatically on every push to \`main\`.
> Do not edit by hand — your changes will be overwritten. See the companion
> [White-Label & Forking guide](white-label.md) for the narrative walkthrough.

**Total brand references found:** $TOTAL

---

EOF

  render_section "User-facing UI (\`src/\`, \`index.html\`)" "$(filter_category ui)"
  render_section "Backend & server (\`server/\`, \`docker-entrypoint.sh\`)" "$(filter_category backend)"
  render_section "Docker (\`Dockerfile*\`, \`homelabarr.yml\`)" "$(filter_category docker)"
  render_section "CI/CD workflows (\`.github/workflows/\`)" "$(filter_category cicd)"
  render_section "Config files (\`package.json\`, \`CNAME\`, \`.env.example\`, \`nginx.conf.template\`)" "$(filter_category config)"
  render_section "Install & utility scripts" "$(filter_category scripts)"
  render_section "Root documentation" "$(filter_category docs)"
  render_section "Wiki content" "$(filter_category wiki)"
  render_section "Other" "$(filter_other)"

  cat <<'EOF'
---

## How to use this

Every row is a place a fork/rebrand would need to inspect. Most can be handled by the
`sed` recipes in the [White-Label & Forking guide](white-label.md#the-5-minute-starter);
the rest are one-off edits (meta tags, scripts, URLs).

If you find a brand reference in your fork that isn't listed here, either your fork
has diverged from upstream or this audit is lagging — check the workflow run on the
last commit to `main`.
EOF
} > "$OUT_FILE"

echo "Wrote $OUT_FILE ($TOTAL references)"
