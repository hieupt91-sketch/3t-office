"""Keep Python imports used by the app covered by the pilot runtime package list."""

import ast
import re
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
BUILD_SCRIPT = ROOT / "scripts" / "build-pilot.ps1"

# Import name -> site-packages directory copied by build-pilot.ps1.
THIRD_PARTY_IMPORTS = {
    "webview": "webview",
    "cryptography": "cryptography",
    "pypdf": "pypdf",
}

# These modules are supplied by the adjacent LibreOffice installation at runtime.
RUNTIME_PROVIDED_IMPORTS = {
    "com": "LibreOffice UNO bridge namespace, provided by its bundled Python modules",
    "uno": "LibreOffice UNO bridge module, provided by the adjacent program directory",
}


def _application_imports():
    modules = set()
    sources = [ROOT / "main.py"]
    for folder in (ROOT / "platform", ROOT / "adapters"):
        sources.extend(folder.rglob("*.py"))

    for source in sources:
        tree = ast.parse(source.read_text(encoding="utf-8-sig"), filename=str(source))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                modules.update(alias.name.split(".", 1)[0] for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                modules.add(node.module.split(".", 1)[0])
    return modules


def _build_package_metadata():
    script = BUILD_SCRIPT.read_text(encoding="utf-8-sig")
    package_block = re.search(r"\$packages\s*=\s*@\((.*?)\)", script, re.S)
    assert package_block, "build-pilot.ps1 must declare its copied package directories"
    package_dirs = set(re.findall(r'"([A-Za-z0-9_.-]+)"', package_block.group(1)))

    module_line = re.search(r"\$siteIn.*?\n.*?\.Name\s+-match\s+'\^\(([^']+)\)\\\.'", script, re.S)
    assert module_line, "build-pilot.ps1 must declare copied top-level Python modules"
    loose_modules = set(module_line.group(1).split("|"))

    dist_line = re.search(r"\.Name\s+-match\s+'\^\(([^']+)\)-\.\*\\\.dist-info\$'", script)
    assert dist_line, "build-pilot.ps1 must declare copied distribution metadata"
    dist_names = set(dist_line.group(1).split("|"))
    return package_dirs, loose_modules, dist_names


def test_application_imports_are_in_the_pilot_runtime():
    package_dirs, loose_modules, _ = _build_package_metadata()
    local_modules = {path.stem for path in ROOT.glob("*.py")}
    local_modules.update(path.name for path in (ROOT / "platform", ROOT / "adapters"))
    imports = _application_imports()

    uncovered = []
    for module in sorted(imports):
        if module in sys.stdlib_module_names or module in local_modules:
            continue
        if module in RUNTIME_PROVIDED_IMPORTS:
            assert RUNTIME_PROVIDED_IMPORTS[module], f"Document why {module} is supplied outside site-packages"
            continue
        package = THIRD_PARTY_IMPORTS.get(module)
        if package is None or (package not in package_dirs and module not in loose_modules):
            uncovered.append(module)

    assert not uncovered, (
        "Application imports are not copied by scripts/build-pilot.ps1: "
        + ", ".join(uncovered)
    )


@pytest.mark.parametrize("distribution", ["cryptography", "pypdf"])
def test_new_runtime_dependencies_include_distribution_metadata(distribution):
    _, _, dist_names = _build_package_metadata()
    normalized = {name.lower().replace("_", "-") for name in dist_names}
    assert distribution in normalized, (
        f"build-pilot.ps1 must copy {distribution}-*.dist-info for license and dependency metadata"
    )
