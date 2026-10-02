import unittest

from main import _extract_clipboard_html_fragment, _extract_clipboard_html_with_styles


class ClipboardHtmlFormatTests(unittest.TestCase):
    def test_extracts_unicode_html_using_windows_byte_offsets(self):
        fragment = "<p>Chào 3T</p>".encode("utf-8")
        header = (
            "Version:1.0\r\n"
            "StartHTML:00000000\r\n"
            "EndHTML:00000000\r\n"
            "StartFragment:00000000\r\n"
            "EndFragment:00000000\r\n"
        )
        prefix = header.encode("ascii")
        start = len(prefix)
        payload = prefix + fragment
        payload = payload.replace(b"StartFragment:00000000", f"StartFragment:{start:08d}".encode("ascii"))
        payload = payload.replace(b"EndFragment:00000000", f"EndFragment:{len(payload):08d}".encode("ascii"))

        self.assertEqual(_extract_clipboard_html_fragment(payload), "<p>Chào 3T</p>")

    def test_falls_back_to_fragment_markers_when_offsets_are_absent(self):
        payload = "<html><body><!--StartFragment--><b>đậm</b><!--EndFragment--></body></html>".encode("utf-8")

        self.assertEqual(_extract_clipboard_html_fragment(payload), "<b>đậm</b>")

    def test_invalid_or_missing_html_fragment_returns_empty_string(self):
        self.assertEqual(_extract_clipboard_html_fragment(b""), "")
        self.assertEqual(_extract_clipboard_html_fragment(b"Version:1.0\r\n"), "")

    def test_rich_html_keeps_office_styles_and_table_around_fragment_offsets(self):
        document = (
            '<html><head><style>.xl65{font-weight:700;background:yellow;}</style></head>'
            '<body><table><!--StartFragment--><tr><td class=xl65>Header</td></tr>'
            '<!--EndFragment--></table></body></html>'
        ).encode("utf-8")
        prefix = (
            "Version:1.0\r\n"
            "StartHTML:0000000000\r\n"
            "EndHTML:0000000000\r\n"
            "StartFragment:0000000000\r\n"
            "EndFragment:0000000000\r\n"
        ).encode("ascii")
        start_html = len(prefix)
        start_fragment = start_html + document.index(b"<tr>")
        end_fragment = start_html + document.index(b"<!--EndFragment-->")
        end_html = start_html + len(document)
        header = (
            "Version:1.0\r\n"
            f"StartHTML:{start_html:010d}\r\n"
            f"EndHTML:{end_html:010d}\r\n"
            f"StartFragment:{start_fragment:010d}\r\n"
            f"EndFragment:{end_fragment:010d}\r\n"
        ).encode("ascii")
        self.assertEqual(len(header), len(prefix))

        html = _extract_clipboard_html_with_styles(header + document)
        self.assertIn("<style>.xl65{font-weight:700;background:yellow;}</style>", html)
        self.assertIn("<table>", html)
        self.assertIn("class=xl65", html)


if __name__ == "__main__":
    unittest.main()
