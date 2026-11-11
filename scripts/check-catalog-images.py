#!/usr/bin/env python3
"""Fail when a catalog app's image cannot be pulled (HLCE-392).

Reads every `image:` line in apps/*/*.yml, skips ones built from a setting
(${...}, resolved by the backend's defaults), and asks each registry whether
the tag exists. Prints the app file and image for every one that does not.
Standard library only, so CI needs nothing installed.
"""
import concurrent.futures
import glob
import json
import sys
import urllib.error
import urllib.request

ACCEPT = ", ".join([
    "application/vnd.oci.image.index.v1+json",
    "application/vnd.docker.distribution.manifest.list.v2+json",
    "application/vnd.oci.image.manifest.v1+json",
    "application/vnd.docker.distribution.manifest.v2+json",
])


def parse(ref):
    ref = ref.split("@")[0]
    last = ref.split("/")[-1]
    name, tag = ref.rsplit(":", 1) if ":" in last else (ref, "latest")
    first = name.split("/")[0]
    if "." in first or ":" in first or first == "localhost":
        registry, repo = first, name[len(first) + 1:]
    else:
        registry, repo = "registry-1.docker.io", name if "/" in name else "library/" + name
    if registry == "docker.io":
        registry = "registry-1.docker.io"
    return registry, repo, tag


def head(url, token=None):
    headers = {"Accept": ACCEPT}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    urllib.request.urlopen(urllib.request.Request(url, method="HEAD", headers=headers), timeout=30)


def bearer(challenge, repo):
    fields = dict(p.split("=", 1) for p in challenge[len("Bearer "):].replace('"', "").split(","))
    url = f"{fields['realm']}?service={fields.get('service', '')}&scope=repository:{repo}:pull"
    with urllib.request.urlopen(url, timeout=30) as r:
        body = json.load(r)
    return body.get("token") or body.get("access_token")


def resolves(ref):
    registry, repo, tag = parse(ref)
    url = f"https://{registry}/v2/{repo}/manifests/{tag}"
    for attempt in range(3):
        try:
            try:
                head(url)
            except urllib.error.HTTPError as e:
                challenge = e.headers.get("WWW-Authenticate") or ""
                if e.code != 401 or not challenge.startswith("Bearer"):
                    raise
                head(url, bearer(challenge, repo))
            return None
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < 2:
                continue
            return f"HTTP {e.code}"
        except Exception as e:  # network trouble: retry, then report it
            if attempt == 2:
                return f"{type(e).__name__}"
    return "unreachable"


def catalog_images(root="apps"):
    found = {}
    for path in sorted(glob.glob(f"{root}/*/*.yml")):
        with open(path, encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if not stripped.startswith("image:"):
                    continue
                ref = stripped[len("image:"):].split("#")[0].strip().strip("\"'")
                if ref and "${" not in ref:
                    found.setdefault(ref, []).append(path)
    return found


def main():
    images = catalog_images()
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        results = dict(zip(images, pool.map(resolves, images)))
    broken = {ref: why for ref, why in results.items() if why}
    for ref, why in sorted(broken.items()):
        for path in images[ref]:
            print(f"::error file={path}::{ref} cannot be pulled ({why})")
    print(f"Checked {len(images)} catalog images: {len(broken)} cannot be pulled.")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
