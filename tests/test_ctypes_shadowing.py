"""Regression coverage for function-local ctypes imports shadowing main imports."""

import ast
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _module_level_ctypes_aliases(tree: ast.Module) -> set[str]:
    aliases: set[str] = set()
    for node in tree.body:
        if isinstance(node, ast.Import):
            for imported in node.names:
                if imported.name == "ctypes" or imported.name.startswith("ctypes."):
                    aliases.add(imported.asname or imported.name.split(".", 1)[0])
        elif isinstance(node, ast.ImportFrom) and node.module == "ctypes":
            aliases.update(imported.asname or imported.name for imported in node.names)
    return aliases


def _function_local_ctypes_imports(tree: ast.Module, aliases: set[str]) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []

    class FunctionImports(ast.NodeVisitor):
        def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
            self._visit_function(node)

        def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
            self._visit_function(node)

        def _visit_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
            for child in ast.walk(node):
                if isinstance(child, ast.Import):
                    for imported in child.names:
                        bound = imported.asname or imported.name.split(".", 1)[0]
                        if bound in aliases and (imported.name == "ctypes" or imported.name.startswith("ctypes.")):
                            findings.append((child.lineno, bound))
                elif isinstance(child, ast.ImportFrom) and child.module == "ctypes":
                    for imported in child.names:
                        bound = imported.asname or imported.name
                        if bound in aliases:
                            findings.append((child.lineno, bound))
            # Nested functions are checked independently to avoid duplicate findings.
            for child in node.body:
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    self.visit(child)

    FunctionImports().visit(tree)
    return findings


def test_no_function_local_ctypes_import_shadows_module_import() -> None:
    roots = [ROOT / "main.py", ROOT / "platform", ROOT / "adapters", ROOT / "tests"]
    files: list[Path] = []
    for root in roots:
        if root.is_file():
            files.append(root)
        elif root.exists():
            files.extend(root.rglob("*.py"))

    findings: list[str] = []
    for path in files:
        tree = ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
        aliases = _module_level_ctypes_aliases(tree)
        if not aliases:
            continue
        for line, alias in _function_local_ctypes_imports(tree, aliases):
            findings.append(f"{path.relative_to(ROOT)}:{line}: local {alias} import shadows module import")

    assert not findings, "\n".join(findings)
