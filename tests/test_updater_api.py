"""Update check through the 3T Cloud API (signed manifest over HTTPS) with fallback to the static channel files."""

import base64
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from adapters.updater import UpdaterManager
from adapters.updater import source as source_module
from adapters.updater import updater as updater_module
from adapters.updater.source import UpdateSourceError
from tests import test_updater as helpers

HTTPS_SOURCE = "https://office.example.test/updates"


class UpdaterApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.key = helpers.make_test_key()
        cls.public_key = (cls.key["n"], cls.key["e"])

    def _setup(self, root: Path):
        packages = root / "packages"
        packages.mkdir()
        published = root / "published"
        published.mkdir()
        installed = helpers.create_fake_package(packages, "0.9.0", b"old", key=self.key)
        install = root / "install"
        shutil.copytree(installed, install)
        package = helpers.create_fake_package(packages, "0.9.1", b"new", key=self.key)
        helpers.write_source(published, package, "0.9.1", self.key)
        return install, published

    def _manager(self, install: Path, root: Path) -> UpdaterManager:
        return UpdaterManager(
            install_dir=install, updates_dir=root / "updates", current_version="0.9.0",
            sources=[HTTPS_SOURCE], channel="pilot", public_key=self.public_key,
        )

    @staticmethod
    def _api_answer(published: Path, *, tamper: bool = False) -> dict:
        manifest = (published / "0.9.1" / "manifest.json").read_bytes()
        signature = (published / "0.9.1" / "manifest.sig").read_bytes()
        if tamper:
            manifest = manifest.replace(b"0.9.1", b"0.9.1", 1) + b" "
        return {
            "product": "3t-office", "channel": "pilot", "version": "0.9.1", "up_to_date": False,
            "manifest_base64": base64.b64encode(manifest).decode("ascii"),
            "signature_base64": base64.b64encode(signature).decode("ascii"),
        }

    def _patches(self, published: Path, api):
        """Route the API call to `api` and the static/blob reads of the https source to the published folder."""
        real_read = source_module.read_source_bytes
        real_blob = source_module.download_blob
        return (
            mock.patch.object(updater_module, "read_update_api", api),
            mock.patch.object(updater_module, "read_source_bytes",
                              lambda src, rel, **kw: real_read(str(published), rel, **kw)),
            mock.patch.object(updater_module, "download_blob",
                              lambda src, digest, target, **kw: real_blob(str(published), digest, target, **kw)),
        )

    def _run(self, install, root, published, api):
        patches = self._patches(published, api)
        with patches[0], patches[1], patches[2]:
            return self._manager(install, root).check_and_stage()

    def test_api_release_is_verified_staged_and_logged(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            install, published = self._setup(root)
            calls = []

            def api(source, channel, current, **kw):
                calls.append((source, channel, current))
                return self._api_answer(published)

            state = self._run(install, root, published, api)
            self.assertTrue(state["ready"])
            self.assertEqual(state["available_version"], "0.9.1")
            self.assertEqual(calls, [(HTTPS_SOURCE, "pilot", "0.9.0")])
            log = (root / "updates" / "update-log.txt").read_text(encoding="utf-8")
            self.assertIn("update-api-used", log)

    def test_api_up_to_date_answer_skips_manifest_and_blobs(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            install, published = self._setup(root)
            manager = UpdaterManager(
                install_dir=install, updates_dir=root / "updates", current_version="0.9.1",
                sources=[HTTPS_SOURCE], channel="pilot", public_key=self.public_key,
            )
            blobs = mock.Mock()
            with mock.patch.object(updater_module, "read_update_api",
                                   lambda *a, **k: {"channel": "pilot", "version": "0.9.1", "up_to_date": True}), \
                    mock.patch.object(updater_module, "read_source_bytes", side_effect=AssertionError("static read")), \
                    mock.patch.object(updater_module, "download_blob", blobs):
                state = manager.check_and_stage()
            self.assertEqual(state["status"], "up-to-date")
            blobs.assert_not_called()

    def test_tampered_api_manifest_is_rejected_and_static_files_are_used(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            install, published = self._setup(root)
            state = self._run(install, root, published, lambda *a, **k: self._api_answer(published, tamper=True))
            self.assertTrue(state["ready"])
            log = (root / "updates" / "update-log.txt").read_text(encoding="utf-8")
            self.assertIn("update-api-rejected", log)

    def test_unavailable_api_falls_back_to_static_channel_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            install, published = self._setup(root)

            def api(*args, **kwargs):
                raise UpdateSourceError("404")

            state = self._run(install, root, published, api)
            self.assertTrue(state["ready"])
            log = (root / "updates" / "update-log.txt").read_text(encoding="utf-8")
            self.assertIn("update-api-unavailable", log)

    def test_local_and_unc_sources_never_call_the_api(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            install, published = self._setup(root)
            manager = UpdaterManager(
                install_dir=install, updates_dir=root / "updates", current_version="0.9.0",
                sources=[str(published)], channel="pilot", public_key=self.public_key,
            )
            with mock.patch.object(updater_module, "read_update_api", side_effect=AssertionError("api called")):
                self.assertTrue(manager.check_and_stage()["ready"])


class ReadUpdateApiTests(unittest.TestCase):
    def _response(self, body: bytes, url: str = "https://office.example.test/api/v1/updates/3t-office/pilot/latest"):
        response = mock.MagicMock()
        response.read.side_effect = lambda n=-1: body[:n] if n >= 0 else body
        response.geturl.return_value = url
        response.__enter__.return_value = response
        return response

    def test_builds_the_api_url_from_the_source_origin_with_current_version(self):
        captured = {}

        def fake_open(request, timeout=0):
            captured["url"] = request.full_url
            return self._response(b'{"channel":"pilot","version":"0.9.1","up_to_date":true}')

        with mock.patch.object(source_module.urllib.request, "urlopen", fake_open):
            answer = source_module.read_update_api("https://office.example.test/updates", "pilot", "0.9.0")
        self.assertTrue(answer["version"] == "0.9.1")
        self.assertEqual(
            captured["url"],
            "https://office.example.test/api/v1/updates/3t-office/pilot/latest?compact=1&current=0.9.0",
        )

    def test_rejects_non_https_sources_bad_channels_and_wrong_channel_answers(self):
        with self.assertRaises(UpdateSourceError):
            source_module.read_update_api(r"\\192.168.1.252\share\updates", "pilot", "0.9.0")
        with self.assertRaises(UpdateSourceError):
            source_module.read_update_api("http://office.example.test/updates", "pilot", "0.9.0")
        with self.assertRaises(UpdateSourceError):
            source_module.read_update_api("https://office.example.test/updates", "../x", "0.9.0")
        wrong = self._response(b'{"channel":"stable","version":"0.9.1"}')
        with mock.patch.object(source_module.urllib.request, "urlopen", lambda *a, **k: wrong):
            with self.assertRaises(UpdateSourceError):
                source_module.read_update_api("https://office.example.test/updates", "pilot", "0.9.0")

    def test_redirect_away_from_https_and_oversized_answers_are_refused(self):
        downgrade = self._response(b"{}", url="http://evil.test/x")
        with mock.patch.object(source_module.urllib.request, "urlopen", lambda *a, **k: downgrade):
            with self.assertRaises(UpdateSourceError):
                source_module.read_update_api("https://office.example.test/updates", "pilot", "0.9.0")
        huge = self._response(b"x" * (source_module.MAX_API_BYTES + 10))
        with mock.patch.object(source_module.urllib.request, "urlopen", lambda *a, **k: huge):
            with self.assertRaises(UpdateSourceError):
                source_module.read_update_api("https://office.example.test/updates", "pilot", "0.9.0")


if __name__ == "__main__":
    unittest.main()
