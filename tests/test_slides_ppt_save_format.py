"""G8 D8: VN Slides "Lưu thành *.ppt" must write a real PowerPoint 97-2003 file.

Measured before the fix (scripts/layout-audit/_slides_basic_ops.py): saving to
"bai.ppt" fell back to the default pptx format, so the .ppt file contained a
PPTX ZIP package. FORMAT_FILTERS had no "ppt" entry.
"""

import os
import tempfile
import unittest

import main
from main import FORMAT_FILTERS, _infer_save_format_from_path

FODP = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:body><office:presentation>
    <draw:page draw:name="page1" draw:master-page-name="Standard">
      <draw:frame presentation:class="title" svg:x="2cm" svg:y="2cm" svg:width="20cm" svg:height="3cm">
        <draw:text-box><text:p>Bao cao</text:p></draw:text-box>
      </draw:frame>
    </draw:page>
    <draw:page draw:name="page2" draw:master-page-name="Standard">
      <draw:frame presentation:class="title" svg:x="2cm" svg:y="2cm" svg:width="20cm" svg:height="3cm">
        <draw:text-box><text:p>Trang hai</text:p></draw:text-box>
      </draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>
"""


class SlidesPptSaveFormatTests(unittest.TestCase):
    def test_ppt_has_powerpoint97_filter(self):
        self.assertEqual(FORMAT_FILTERS.get("ppt"), "MS PowerPoint 97")

    def test_save_path_with_ppt_extension_keeps_ppt_format(self):
        path, fmt = _infer_save_format_from_path(r"C:\docs\bai_giang.ppt", "slides")
        self.assertEqual(path, r"C:\docs\bai_giang.ppt")
        self.assertEqual(fmt, "ppt")

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice (soffice) not installed")
    def test_real_conversion_writes_ole2_binary(self):
        with tempfile.TemporaryDirectory(prefix="vno_ppt_") as tmp:
            src = os.path.join(tmp, "draft.fodp")
            with open(src, "w", encoding="utf-8") as fh:
                fh.write(FODP)
            out = main._run_soffice_convert(src, "ppt", tmp, app_kind="slides")
            with open(out, "rb") as fh:
                head = fh.read(8)
            self.assertEqual(head[:4], b"\xd0\xcf\x11\xe0", "PowerPoint 97-2003 .ppt must be an OLE2 compound file, not a ZIP")


if __name__ == "__main__":
    unittest.main()
