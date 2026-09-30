#!/usr/bin/env python3
"""Fail when a GitHub Actions workflow downloads with wget.

EOS-2459. Not every self-hosted runner has wget: eightly-ci-5 failed the Trivy
and gitleaks installs with `wget: command not found` (exit 127) while the
runners that did have it stayed green, so the same workflow passed or failed by
which machine drew the job. curl is on all of them. Every download was moved to
`curl -fsSL`; this keeps it that way.

Reads every .github/workflows/*.yml|*.yaml with a YAML parser and checks each
`run:` string. Before matching, heredoc bodies are dropped (release-notes text
may tell users to run wget), quoted text is blanked (a grep pattern naming wget
is not a call) except inside $( ) and backticks, which still run, and comments
are cut. What is left is flagged when wget sits in command position: at line
start, or after ; && || | ( $( a backtick, then/do/else/if, or sudo/env/exec/
xargs/nohup/time. `wgetrc`, `command -v wget` and `apt-get install wget` do not
match.

Exit codes, as elsewhere in this repo: 0 clean, 1 found one, 2 examined nothing
(CANNOT CHECK, which is not the same as clean).

    check-no-wget.py [repo-root]
    check-no-wget.py --self-test
"""
import pathlib
import re
import sys

try:
    import yaml
except ImportError:
    print("CANNOT CHECK: PyYAML is not installed (pip install pyyaml)")
    sys.exit(2)

HEREDOC = re.compile(r"<<(-?)\s*(?:'([^']+)'|\"([^\"]+)\"|\\?([A-Za-z_][\w]*))")
LEAD = r"(?:^|[;&|(`]|\$\(|\b(?:then|do|else|if|time|nohup|xargs|sudo|env|exec)\b(?:\s+-\S+|\s+\w+=\S*)*)"
WGET = re.compile(LEAD + r"\s*!?\s*(?:[\w./-]*/)?wget(?![\w.-])")


def mask(line):
    """Blank quoted text and comments; keep anything inside $( ) and backticks."""
    out = []
    i, n = 0, len(line)
    quote = None  # "'" or '"'
    sub = []      # open substitutions inside double quotes: ")" or "`"
    while i < n:
        c = line[i]
        if quote == "'":
            if c == "'":
                quote = None
            out.append(" ")
        elif quote == '"' and not sub:
            if c == "\\":
                out.append("  ")
                i += 2
                continue
            if c == '"':
                quote = None
                out.append(" ")
            elif line.startswith("$(", i):
                sub.append(")")
                out.append("$(")
                i += 2
                continue
            elif c == "`":
                sub.append("`")
                out.append("`")
            else:
                out.append(" ")
        else:
            if c == "\\":
                out.append("  ")
                i += 2
                continue
            if sub and c == sub[-1]:
                sub.pop()
            elif c == "'":
                quote = "'"
                c = " "
            elif c == '"':
                quote = '"'
                c = " "
            elif c == "#" and (i == 0 or line[i - 1] in " \t;&|("):
                break
            out.append(c)
        i += 1
    return "".join(out)


def scan_run(text):
    """Return 0-based line indexes of `text` where wget is invoked."""
    hits, pending = [], []
    for idx, line in enumerate(text.splitlines()):
        if pending:
            delim, dash = pending[0]
            if (line.strip() if dash else line) == delim:
                pending.pop(0)
            continue
        if WGET.search(mask(HEREDOC.sub(" ", line))):
            hits.append(idx)
        for m in HEREDOC.finditer(strip_comment(line)):
            pending.append((m.group(2) or m.group(3) or m.group(4), bool(m.group(1))))
    return hits


def strip_comment(line):
    # A heredoc operator is found on the raw line; a "<<" inside a comment is not one.
    cut = re.search(r"(?:^|\s)#", line)
    return line[: cut.start()] if cut else line


def run_nodes(node):
    if isinstance(node, yaml.MappingNode):
        for k, v in node.value:
            if getattr(k, "value", None) == "run" and isinstance(v, yaml.ScalarNode):
                yield v
            else:
                yield from run_nodes(v)
    elif isinstance(node, yaml.SequenceNode):
        for v in node.value:
            yield from run_nodes(v)


def check_file(path):
    """Return (findings, error). A finding is (file line number, text)."""
    raw = path.read_text(encoding="utf-8")
    try:
        root = yaml.compose(raw)
    except yaml.YAMLError as e:
        return [], f"{path}: not parseable as YAML ({str(e).splitlines()[0]})"
    if root is None:
        return [], None
    lines = raw.splitlines()
    found = []
    for node in run_nodes(root):
        first = node.start_mark.line + (1 if node.style in ("|", ">") else 0)
        for idx in scan_run(node.value):
            n = first + idx
            found.append((n + 1, lines[n].strip() if n < len(lines) else ""))
    return found, None


def main(root):
    files = sorted(list(root.glob(".github/workflows/*.yml")) + list(root.glob(".github/workflows/*.yaml")))
    if not files:
        print(f"CANNOT CHECK: no workflow files under {root}/.github/workflows")
        return 2
    bad, unreadable = 0, 0
    for f in files:
        found, err = check_file(f)
        if err:
            print(f"CANNOT CHECK {err}")
            unreadable += 1
        for n, text in found:
            print(f"{f.relative_to(root)}:{n}: {text}")
            bad += 1
    if bad:
        print(f"\n{bad} wget call(s). Not every runner has wget (EOS-2459); use `curl -fsSL` instead.")
        return 1
    if unreadable:
        return 2
    print(f"ok: {len(files)} workflow file(s), no wget call")
    return 0


# (name, run: text, number of lines expected to be flagged)
CASES = [
    ("plain wget", "wget -q https://x.test/a.tgz", 1),
    ("after &&", "cd x && wget https://x.test/a.tgz", 1),
    ("sudo wget", "sudo wget https://x.test/a.tgz", 1),
    ("curl is fine", "curl -fsSLO https://x.test/a.tgz", 0),
    ("heredoc body", "cat > notes.md <<'EOF'\nwget https://x.test/a.tgz\nEOF\necho done", 0),
    ("heredoc, then a real wget after it", "cat <<EOF\nwget https://x.test/a\nEOF\nwget https://x.test/b", 1),
    ("indented heredoc terminator", "cat <<-EOF\n\twget https://x.test/a\n\tEOF", 0),
    ("grep pattern naming wget", "grep -rn 'wget.*http://' .", 0),
    ("comment", "# wget old way", 0),
    ("trailing comment", "curl -fsSL https://x.test # was wget", 0),
    ("echo with quoted wget", 'echo "run wget to install"', 0),
    ("command substitution", "x=$(wget -qO- https://x.test)", 1),
    ("substitution inside double quotes", 'echo "$(wget -qO- https://x.test)"', 1),
    ("backticks", "x=`wget -qO- https://x.test`", 1),
    ("wgetrc", "cat ~/.wgetrc", 0),
    ("word starting wget", "wgetrc-tool --help", 0),
    ("piped", "echo a | wget -i -", 1),
    ("after then", "if true; then wget https://x.test; fi", 1),
    ("installing wget is not calling it", "sudo apt-get install -y wget", 0),
    ("probing for wget is not calling it", "command -v wget >/dev/null", 0),
    ("full path", "/usr/bin/wget https://x.test", 1),
    ("env prefix", "env FOO=1 wget https://x.test", 1),
    ("second line of two", "set -e\nwget https://x.test/a", 1),
]


def self_test():
    failed = 0
    for name, text, want in CASES:
        got = len(scan_run(text))
        ok = got == want
        failed += not ok
        print(f"{'ok  ' if ok else 'FAIL'} {name}: flagged {got}, want {want}")
    import tempfile

    with tempfile.TemporaryDirectory() as d:
        root = pathlib.Path(d)
        wf = root / ".github" / "workflows"
        steps = "jobs:\n  a:\n    runs-on: x\n    steps:\n      - run: |\n          echo hi\n          {}\n"
        expect = [("empty tree", None, 2), ("clean workflow", "curl -fsSL https://x.test", 0), ("wget workflow", "wget https://x.test", 1)]
        for name, cmd, want in expect:
            if cmd:
                wf.mkdir(parents=True, exist_ok=True)
                (wf / "ci.yml").write_text(steps.format(cmd))
            got = main(root)
            ok = got == want
            failed += not ok
            print(f"{'ok  ' if ok else 'FAIL'} {name}: exit {got}, want {want}")
        # Reported line must be the file line of the wget, not the run block's.
        found, _ = check_file(wf / "ci.yml")
        ok = found == [(7, "wget https://x.test")]
        failed += not ok
        print(f"{'ok  ' if ok else 'FAIL'} reports the file line: {found}")
    print(f"{len(CASES) + 4 - failed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-test"]:
        sys.exit(self_test())
    root = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent
    sys.exit(main(root))
