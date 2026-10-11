#!/usr/bin/env python3
"""Export error reports to CSV for Excel analysis."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from server import sanitize_frame, top_sanitized_frame


def compute_fingerprint(error_type: str, stack: str) -> str:
    fallback = error_type
    top_frame = top_sanitized_frame(stack, fallback)
    label = f"{error_type}: {sanitize_frame(top_frame)}"
    return hashlib.sha256(label.encode("utf-8", errors="replace")).hexdigest()


def parse_date_arg(value: str) -> datetime:
    try:
        return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid date format: {value}. Use YYYY-MM-DD.")


def extract_date_from_filename(filename: str) -> datetime | None:
    match = re.match(r"errors-(\d{4}-\d{2}-\d{2})\.jsonl$", filename)
    if not match:
        return None
    try:
        return datetime.strptime(match.group(1), "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def main(argv=None):
    parser = argparse.ArgumentParser(description="Export error reports to CSV (UTF-8 with BOM).")
    parser.add_argument("data_dir", help="Directory containing errors-YYYY-MM-DD.jsonl files")
    parser.add_argument("out_csv", help="Output CSV file path")
    parser.add_argument("--since", type=parse_date_arg, help="Include reports from this date (inclusive)")
    parser.add_argument("--until", type=parse_date_arg, help="Include reports until this date (inclusive)")
    args = parser.parse_args(argv)

    data_dir = Path(args.data_dir)
    if not data_dir.is_dir():
        print(f"Error: data directory not found: {data_dir}", file=sys.stderr)
        return 1

    since = args.since
    until = args.until

    jsonl_files = []
    for path in data_dir.glob("errors-*.jsonl"):
        file_date = extract_date_from_filename(path.name)
        if file_date is None:
            continue
        if since and file_date < since:
            continue
        if until and file_date > until:
            continue
        jsonl_files.append(path)

    if not jsonl_files:
        print("No matching JSONL files found.", file=sys.stderr)
        return 1

    groups: dict[str, dict] = {}
    malformed_count = 0

    for jsonl_path in jsonl_files:
        try:
            with jsonl_path.open("r", encoding="utf-8", errors="replace") as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        item = json.loads(line)
                    except json.JSONDecodeError:
                        malformed_count += 1
                        continue

                    if not isinstance(item, dict):
                        malformed_count += 1
                        continue

                    fingerprint = item.get("fingerprint")
                    if not fingerprint:
                        error_type = item.get("error_type", "")
                        stack = item.get("stack", "")
                        fingerprint = compute_fingerprint(error_type, stack)

                    group = groups.get(fingerprint)
                    if group is None:
                        group = {
                            "fingerprint": fingerprint,
                            "error_type": item.get("error_type", ""),
                            "operation": item.get("operation", ""),
                            "app": item.get("app", ""),
                            "count": 0,
                            "installations": set(),
                            "first_seen": None,
                            "last_seen": None,
                            "latest_app_version": "",
                            "file_extensions": set(),
                            "example_message": "",
                            "last_received_at": "",
                        }
                        groups[fingerprint] = group

                    group["count"] += 1

                    install_id = item.get("installation_id")
                    if install_id:
                        group["installations"].add(install_id)

                    received_at = item.get("received_at") or item.get("timestamp", "")
                    if received_at:
                        if group["first_seen"] is None or received_at < group["first_seen"]:
                            group["first_seen"] = received_at
                        if received_at >= group["last_received_at"]:
                            group["last_received_at"] = received_at
                            group["last_seen"] = received_at
                            group["latest_app_version"] = item.get("app_version", "")
                            group["example_message"] = item.get("message", "")

                    file_ext = item.get("file_extension")
                    if file_ext:
                        group["file_extensions"].add(file_ext)

        except OSError as e:
            print(f"Error reading {jsonl_path}: {e}", file=sys.stderr)

    sorted_groups = sorted(groups.values(), key=lambda g: (-g["count"], g["fingerprint"]))

    try:
        with open(args.out_csv, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "fingerprint", "error_type", "operation", "app", "count",
                "installations", "first_seen", "last_seen", "latest_app_version",
                "file_extensions", "example_message"
            ])
            for group in sorted_groups:
                writer.writerow([
                    group["fingerprint"],
                    group["error_type"],
                    group["operation"],
                    group["app"],
                    group["count"],
                    len(group["installations"]),
                    group["first_seen"] or "",
                    group["last_seen"] or "",
                    group["latest_app_version"],
                    ";".join(sorted(group["file_extensions"])),
                    group["example_message"],
                ])
    except OSError as e:
        print(f"Error writing CSV: {e}", file=sys.stderr)
        return 1

    if malformed_count:
        print(f"Skipped {malformed_count} malformed JSONL line(s).", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())