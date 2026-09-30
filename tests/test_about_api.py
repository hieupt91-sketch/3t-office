"""Unit tests for VnOfficeApi get_app_version and get_about_info methods."""

import unittest
from pathlib import Path
import main


class AboutApiTests(unittest.TestCase):
    def setUp(self):
        self.api = main.VnOfficeApi()

    def test_get_app_version_returns_current_version(self):
        version = self.api.get_app_version()
        self.assertIsInstance(version, str)
        self.assertEqual(version, main.APP_VERSION)
        self.assertTrue(len(version) > 0)

    def test_get_about_info_returns_expected_metadata(self):
        info = self.api.get_about_info()
        self.assertIsInstance(info, dict)
        self.assertEqual(info["app_version"], main.APP_VERSION)
        self.assertEqual(info["product_name"], "3T Office")
        self.assertEqual(info["developer"], "3T Technology")
        self.assertIn("3T Technology", info["copyright"])

        # Check suite components
        components = info.get("suite_components", [])
        component_names = [c["name"] for c in components]
        self.assertIn("3T Doc", component_names)
        self.assertIn("3T Sheet", component_names)
        self.assertIn("3T Slide", component_names)

        # Check third party notices
        notices = info.get("third_party_notices", "")
        self.assertIsInstance(notices, str)
        self.assertTrue(len(notices) > 0)
        self.assertIn("Python 3.12", notices)
        self.assertIn("LibreOffice", notices)
        self.assertIn("pywebview", notices)

        # Check third party components breakdown
        third_party = info.get("components", [])
        tp_names = [tp["name"] for tp in third_party]
        self.assertIn("Python", tp_names)
        self.assertIn("LibreOffice", tp_names)
        self.assertIn("pywebview", tp_names)


if __name__ == "__main__":
    unittest.main()
