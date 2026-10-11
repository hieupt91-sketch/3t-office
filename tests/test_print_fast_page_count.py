"""Fast PDF page count used by the print preview (engine inspection stays the fallback)."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("vno_print_pipeline_fast", ROOT / "platform" / "print" / "print_pipeline.py")
pipeline = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pipeline)


def _pdf(body: bytes) -> str:
    handle = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    handle.write(body)
    handle.close()
    return handle.name


class FastPdfPageCountTests(unittest.TestCase):
    def test_plain_page_tree_is_counted(self):
        body = (b"%PDF-1.6\n1 0 obj\n<</Type/Pages/Kids[2 0 R 3 0 R 4 0 R]/Count 3>>\nendobj\n"
                b"2 0 obj\n<</Type/Page/Parent 1 0 R>>\nendobj\n"
                b"3 0 obj\n<</Type /Page /Parent 1 0 R>>\nendobj\n"
                b"4 0 obj\n<</Type/Page/Parent 1 0 R>>\nendobj\n")
        self.assertEqual(pipeline.fast_pdf_page_count(_pdf(body)), 3)

    def test_disagreement_returns_none(self):
        body = b"%PDF-1.6\n<</Type/Pages/Kids[2 0 R]/Count 5>>\n<</Type/Page/Parent 1 0 R>>\n"
        self.assertIsNone(pipeline.fast_pdf_page_count(_pdf(body)))

    def test_compressed_or_foreign_files_return_none(self):
        self.assertIsNone(pipeline.fast_pdf_page_count(_pdf(b"%PDF-1.7\nstream\x00\x01 only compressed objects")))
        self.assertIsNone(pipeline.fast_pdf_page_count(_pdf(b"not a pdf")))
        self.assertIsNone(pipeline.fast_pdf_page_count(str(ROOT / "missing-file.pdf")))


if __name__ == "__main__":
    unittest.main()
