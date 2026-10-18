import plistlib
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
IOS = ROOT / "ports" / "ios"


class IOSOfflineShellTests(unittest.TestCase):
    def test_target_is_universal_iphone_and_ipad(self):
        project = (IOS / "VNOfficeIOS.xcodeproj" / "project.pbxproj").read_text()
        self.assertIn('TARGETED_DEVICE_FAMILY = "1,2";', project)
        self.assertIn('SUPPORTED_PLATFORMS = "iphoneos iphonesimulator";', project)

    def test_native_delegate_configures_scene(self):
        with (IOS / "launcher" / "Info.plist").open("rb") as source:
            info = plistlib.load(source)
        self.assertEqual(info["CFBundleIdentifier"], "$(PRODUCT_BUNDLE_IDENTIFIER)")
        app_delegate = (IOS / "launcher" / "AppDelegate.swift").read_text()
        scene_delegate = (IOS / "launcher" / "SceneDelegate.swift").read_text()
        self.assertIn("configuration.delegateClass = SceneDelegate.self", app_delegate)
        self.assertIn("window.rootViewController = MobileOfficeViewController()", scene_delegate)

    def test_shell_serves_only_bundled_assets(self):
        source = (IOS / "launcher" / "MobileOfficeViewController.swift").read_text()
        self.assertIn('setURLSchemeHandler(offlineAssets, forURLScheme: "vno")', source)
        self.assertIn('["vno", "about"].contains(scheme)', source)
        self.assertNotIn("http://", source)
        self.assertNotIn("https://", source)
        self.assertNotIn("serve.js", source)

    def test_capabilities_state_current_prototype_limits(self):
        source = (IOS / "launcher" / "MobileOfficeViewController.swift").read_text()
        for capability in (
            "officeEngine: false",
            "documentPicker: false",
            "ooxmlRoundTrip: false",
            "cloudDocumentUpload: false",
        ):
            self.assertIn(capability, source)

    def test_phone_and_tablet_layouts_have_touch_and_safe_area_rules(self):
        css = (IOS / "Web" / "mobile-shell.css").read_text()
        self.assertIn("min-height: 44px", css)
        native = (IOS / "launcher" / "MobileOfficeViewController.swift").read_text()
        self.assertIn("container.safeAreaLayoutGuide.topAnchor", native)
        self.assertIn("env(safe-area-inset-bottom)", css)
        self.assertIn("@media (max-width: 699px)", css)
        self.assertIn("@media (min-width: 700px)", css)
        self.assertIn(".vno-writer-page", css)
        self.assertIn(".vno-mobile-command-dock", css)
        self.assertIn("--vno-keyboard-inset", css)
        self.assertIn("prefers-reduced-motion", css)

    def test_adaptive_chrome_supports_context_and_accessibility(self):
        source = (IOS / "Web" / "mobile-adaptive.js").read_text()
        self.assertIn('aria-label", "Công cụ nhanh trên thiết bị di động', source)
        self.assertIn("__vnoSetKeyboardInset", source)
        self.assertIn("__vnoSetNativeLayout", source)
        self.assertIn("common.edit.undo", source)
        self.assertIn("appButton.textContent !== label", source)
        self.assertNotIn("http://", source)
        self.assertNotIn("https://", source)

    def test_staged_bundle_excludes_desktop_runtime(self):
        with tempfile.TemporaryDirectory(prefix="vno-ios-assets-") as directory:
            subprocess.run(
                [str(IOS / "scripts" / "stage-web-assets.sh"), directory],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            destination = Path(directory)
            self.assertTrue((destination / "index.html").is_file())
            self.assertTrue((destination / "mobile-shell.css").is_file())
            self.assertTrue((destination / "mobile-adaptive.js").is_file())
            forbidden = {".py", ".pyc", ".exe", ".dll"}
            self.assertFalse(any(path.suffix.lower() in forbidden for path in destination.rglob("*")))


if __name__ == "__main__":
    unittest.main()
