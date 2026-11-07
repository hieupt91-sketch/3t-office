"""S1 item 3: a save must not silently overwrite changes another program made to the file on disk."""

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import main
from main import VnOfficeApi

MINE = b"my converted output"
THEIRS = b"bytes written by someone else"


def _stub_open_conversion(src, target_ext, out_dir, **_kwargs):
    out = Path(out_dir) / f"{Path(src).stem}.{target_ext}"
    out.write_text("<html><body><p>x</p></body></html>", encoding="utf-8")
    return str(out)


def _stub_save_conversion(src_path, app_kind, build_format, **_kwargs):
    out = Path(src_path).with_suffix(".out")
    out.write_bytes(MINE)
    return str(out)


class ExternalChangeBase(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.path = self.base / "tai-lieu.rtf"
        self.path.write_bytes(b"{\\rtf1 original}")
        self.api = VnOfficeApi(app_kind="writer")
        self.addCleanup(self.api.close_autorecover_session)
        for target, name, kwargs in (
            (main, "_user_data_dir", {"return_value": self.base / "appdata"}),
            (main, "_run_soffice_convert", {"side_effect": _stub_open_conversion}),
            (main, "_convert_save_source_to_native", {"side_effect": _stub_save_conversion}),
        ):
            stub = patch.object(target, name, **kwargs)
            stub.start()
            self.addCleanup(stub.stop)
        opened = self.api.open_document_dialog("writer", str(self.path))
        self.assertEqual(opened.get("status"), "ok", opened)

    def _save(self):
        return self.api.save_document_in_place("<p>x</p>", "writer", str(self.path), str(self.path))

    def _change_on_disk(self, payload=THEIRS):
        self.path.write_bytes(payload)
        stat = self.path.stat()
        os.utime(self.path, ns=(stat.st_atime_ns, stat.st_mtime_ns + 5_000_000_000))


class ExternalChangeReproductionTests(ExternalChangeBase):
    def test_open_change_on_disk_save_does_not_silently_overwrite(self):
        self._change_on_disk()
        result = self._save()
        self.assertEqual(self.path.read_bytes(), THEIRS, "the other program's bytes were overwritten silently")
        self.assertEqual(result["status"], "external_change")


class ExternalChangeTests(ExternalChangeBase):
    def test_unchanged_file_saves_normally_every_time(self):
        self.assertEqual(self._save()["status"], "ok")
        self.assertEqual(self.path.read_bytes(), MINE)
        self.assertEqual(self._save()["status"], "ok", "our own save must not look like an external change")

    def test_result_is_distinct_and_is_not_reported_as_an_app_error(self):
        self._change_on_disk()
        with patch.object(self.api, "_record_api_failure") as reported:
            result = self._save()
        reported.assert_not_called()
        self.assertEqual(result["path"], str(self.path))
        self.assertTrue(result["fingerprint"])
        self.assertTrue(result["message"])

    def test_change_after_our_save_is_detected(self):
        self.assertEqual(self._save()["status"], "ok")
        self._change_on_disk()
        self.assertEqual(self._save()["status"], "external_change")
        self.assertEqual(self.path.read_bytes(), THEIRS)

    def test_same_size_change_is_detected(self):
        self._change_on_disk(b"x" * self.path.stat().st_size)
        self.assertEqual(self._save()["status"], "external_change")

    def test_same_mtime_different_size_is_detected(self):
        before = self.path.stat()
        self.path.write_bytes(b"longer than the original content, same timestamp")
        os.utime(self.path, ns=(before.st_atime_ns, before.st_mtime_ns))
        self.assertEqual(self._save()["status"], "external_change")

    def test_change_during_conversion_is_detected_before_replace(self):
        def convert_while_someone_edits(src_path, app_kind, build_format, **_kwargs):
            self._change_on_disk()
            return _stub_save_conversion(src_path, app_kind, build_format)

        with patch.object(main, "_convert_save_source_to_native", side_effect=convert_while_someone_edits):
            self.assertEqual(self._save()["status"], "external_change")
        self.assertEqual(self.path.read_bytes(), THEIRS)
        self.assertEqual([path.name for path in self.base.glob("*.vno_tmp")], [])

    def test_change_during_load_is_detected(self):
        api = VnOfficeApi(app_kind="writer")
        self.addCleanup(api.close_autorecover_session)

        def load_while_someone_edits(src, target_ext, out_dir, **kwargs):
            self._change_on_disk()
            return _stub_open_conversion(src, target_ext, out_dir, **kwargs)

        with patch.object(main, "_run_soffice_convert", side_effect=load_while_someone_edits):
            self.assertEqual(api.open_document_dialog("writer", str(self.path)).get("status"), "ok")
        self.assertEqual(api.save_document_in_place("<p>x</p>", "writer", str(self.path), str(self.path))["status"], "external_change")

    def test_overwrite_after_acknowledging_writes_mine_and_backs_up_theirs(self):
        self._change_on_disk()
        conflict = self._save()
        self.assertEqual(self.api.acknowledge_external_change(conflict["path"], conflict["fingerprint"])["status"], "ok")
        self.assertEqual(self._save()["status"], "ok")
        self.assertEqual(self.path.read_bytes(), MINE)
        store = main.SaveBackupStore(self.base / "appdata")
        self.assertEqual((store.folder_for(self.path.resolve()) / self.path.name).read_bytes(), THEIRS)

    def test_acknowledgement_covers_only_the_version_shown_to_the_user(self):
        self._change_on_disk()
        conflict = self._save()
        self.api.acknowledge_external_change(conflict["path"], conflict["fingerprint"])
        self._change_on_disk(b"a second, newer edit from elsewhere")
        self.assertEqual(self._save()["status"], "external_change")
        self.assertEqual(self.path.read_bytes(), b"a second, newer edit from elsewhere")

    def test_acknowledge_rejects_bad_input(self):
        for args in ((None, "1:2"), ("x.docx", None), ("", "1:2"), ("x.docx", 5)):
            with self.subTest(args=args):
                self.assertEqual(self.api.acknowledge_external_change(*args)["status"], "error")

    def test_file_deleted_elsewhere_is_saved_again(self):
        self.path.unlink()
        self.assertEqual(self._save()["status"], "ok")
        self.assertEqual(self.path.read_bytes(), MINE)

    def test_path_never_opened_here_saves_without_a_check(self):
        other = self.base / "chua-mo.rtf"
        other.write_bytes(b"existing")
        result = self.api.save_document_in_place("<p>x</p>", "writer", str(other), None)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(other.read_bytes(), MINE)

    def test_save_as_to_a_new_path_is_unaffected_and_tracks_the_new_file(self):
        self._change_on_disk()
        copy = self.base / "ban-sao.rtf"
        window = object()
        with patch.object(main, "_active_window", return_value=window), patch.object(
            main, "_create_file_dialog", return_value=[str(copy)]
        ), patch.object(main, "_file_dialog_policy", return_value=None):
            result = self.api.save_document_dialog("<p>x</p>", "writer", "rtf", "ban-sao.rtf", str(self.path))
        self.assertEqual(result["status"], "ok")
        self.assertEqual(copy.read_bytes(), MINE)
        self.assertEqual(self.path.read_bytes(), THEIRS)
        # The copy is now the open document; later edits to it from elsewhere are detected too.
        self.path = copy
        self.assertEqual(self._save()["status"], "ok")
        self._change_on_disk()
        self.assertEqual(self._save()["status"], "external_change")

    def test_two_windows_on_one_file_do_not_overwrite_each_other_silently(self):
        other_window = VnOfficeApi(app_kind="writer")
        self.addCleanup(other_window.close_autorecover_session)
        self.assertEqual(other_window.open_document_dialog("writer", str(self.path)).get("status"), "ok")
        self.assertEqual(self._save()["status"], "ok")
        result = other_window.save_document_in_place("<p>y</p>", "writer", str(self.path), str(self.path))
        self.assertEqual(result["status"], "external_change")


if __name__ == "__main__":
    unittest.main()
