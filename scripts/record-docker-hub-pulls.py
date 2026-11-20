#!/usr/bin/env python3
"""Record today's Docker Hub pull counts in a CSV.

Docker Hub only shows an all-time total and keeps no history, so the trend has
to be collected a day at a time. Usage: record-docker-hub-pulls.py <csv-path>

Writes nothing unless every image answered with a number. Running it twice on
the same day replaces that day's row.
"""
import csv
import datetime
import json
import sys
import urllib.request

IMAGES = ["smashingtags/homelabarr-frontend", "smashingtags/homelabarr-backend"]
HEADER = ["date"] + [image.split("/")[1].removeprefix("homelabarr-") + "_pulls" for image in IMAGES]


def pull_count(image):
    with urllib.request.urlopen(f"https://hub.docker.com/v2/repositories/{image}/", timeout=30) as response:
        count = json.load(response)["pull_count"]
    if not isinstance(count, int) or count < 0:
        raise ValueError(f"{image}: pull_count is {count!r}")
    return count


def record(rows, today, counts):
    """Return rows with today's row replaced or appended, oldest first."""
    kept = [row for row in rows if row and row[0] != today and row[0] != "date"]
    kept.append([today] + [str(count) for count in counts])
    return sorted(kept)


def main(path):
    counts = [pull_count(image) for image in IMAGES]
    try:
        with open(path, newline="") as handle:
            rows = list(csv.reader(handle))
    except FileNotFoundError:
        rows = []
    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    with open(path, "w", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(HEADER)
        writer.writerows(record(rows, today, counts))
    print(f"{today}: " + ", ".join(f"{image} {count}" for image, count in zip(IMAGES, counts)))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
