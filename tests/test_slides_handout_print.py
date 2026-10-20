import importlib.util
import math
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
PIPELINE_PATH = ROOT / "platform" / "print" / "print_pipeline.py"
SPEC = importlib.util.spec_from_file_location("vno_slides_handout_pipeline_test", PIPELINE_PATH)
PIPELINE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PIPELINE)


class SlidesHandoutPdfTests(unittest.TestCase):
    def test_handout_page_count_and_a4_landscape_layout_for_3_6_9(self):
        with TemporaryDirectory() as temp_dir:
            source_pdf = Path(temp_dir) / "slides.pdf"
            writer = PdfWriter()
            for _ in range(10):
                writer.add_blank_page(width=960, height=540)
            with source_pdf.open("wb") as handle:
                writer.write(handle)

            for slides_per_page in (3, 6, 9):
                output_pdf = Path(temp_dir) / f"handout-{slides_per_page}.pdf"
                page_count = PIPELINE.build_slides_handout_pdf(
                    str(source_pdf), str(output_pdf), slides_per_page,
                )
                result = PdfReader(str(output_pdf))
                self.assertEqual(page_count, math.ceil(10 / slides_per_page))
                self.assertEqual(len(result.pages), page_count)
                self.assertAlmostEqual(float(result.pages[0].mediabox.width), 841.89, places=2)
                self.assertAlmostEqual(float(result.pages[0].mediabox.height), 595.28, places=2)

    def test_handout_rejects_unsupported_slides_per_page(self):
        with TemporaryDirectory() as temp_dir:
            source_pdf = Path(temp_dir) / "slides.pdf"
            writer = PdfWriter()
            writer.add_blank_page(width=960, height=540)
            with source_pdf.open("wb") as handle:
                writer.write(handle)
            with self.assertRaisesRegex(ValueError, "3, 6 hoặc 9"):
                PIPELINE.build_slides_handout_pdf(
                    str(source_pdf), str(Path(temp_dir) / "handout.pdf"), 4,
                )


if __name__ == "__main__":
    unittest.main()
