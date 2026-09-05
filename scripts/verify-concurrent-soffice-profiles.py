"""Run real LibreOffice conversions concurrently in two independent Python processes."""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]


def worker(app_kind: str, source: Path, output_dir: Path) -> int:
    sys.path.insert(0, str(ROOT_DIR))
    import main

    result = main._run_soffice_convert(str(source), "pdf", str(output_dir), app_kind=app_kind)
    print(f"{app_kind}: {result}")
    print(f"{app_kind} profile: {main._profile_uri(app_kind)}")
    return 0


def coordinator() -> int:
    jobs = (
        ("writer", ROOT_DIR / "tests/fixtures/real-office-samples/src/sample-writer.fodt"),
        ("sheet", ROOT_DIR / "tests/fixtures/real-office-samples/src/sample-sheet.fods"),
    )
    with tempfile.TemporaryDirectory(prefix="vnoffice_multiprocess_") as temp_dir:
        processes = []
        for app_kind, source in jobs:
            output_dir = Path(temp_dir) / app_kind
            output_dir.mkdir()
            processes.append((
                app_kind,
                subprocess.Popen(
                    [sys.executable, __file__, "--worker", app_kind, str(source), str(output_dir)],
                    cwd=ROOT_DIR,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                ),
            ))

        failed = False
        for app_kind, process in processes:
            output, _ = process.communicate(timeout=150)
            print(output, end="")
            if process.returncode != 0:
                failed = True
                print(f"FAIL: {app_kind} exited with {process.returncode}")

    if failed:
        return 1
    print("PASS: concurrent Writer and Sheet soffice conversions used independent profiles.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker", choices=("writer", "sheet"))
    parser.add_argument("source", nargs="?", type=Path)
    parser.add_argument("output_dir", nargs="?", type=Path)
    args = parser.parse_args()
    if args.worker:
        if args.source is None or args.output_dir is None:
            parser.error("worker requires source and output_dir")
        raise SystemExit(worker(args.worker, args.source, args.output_dir))
    raise SystemExit(coordinator())
