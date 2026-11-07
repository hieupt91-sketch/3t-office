"""S1 item 2: one previous version per document, in app data; a backup failure never blocks a save."""

import errno
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import main
from main import SaveBackupStore, VnOfficeApi


class SaveBackupStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.docs = self.base / "docs"
        self.docs.mkdir()
        self.store = SaveBackupStore(self.base / "appdata")

    def _doc(self, name, payload=b"v1"):
        path = self.docs / name
        path.write_bytes(payload)
        return path

    def _backup_path(self, doc):
        return self.store.folder_for(doc) / doc.name

    def test_keeps_exactly_one_generation_with_manifest(self):
        doc = self._doc("Báo cáo.docx", b"v1")
        self.assertTrue(self.store.keep(doc))
        self.assertEqual(self._backup_path(doc).read_bytes(), b"v1")
        doc.write_bytes(b"v2")
        self.assertTrue(self.store.keep(doc))
        self.assertEqual(self._backup_path(doc).read_bytes(), b"v2")
        folder = self.store.folder_for(doc)
        self.assertEqual(sorted(path.name for path in folder.iterdir()), sorted(["Báo cáo.docx", "backup.json"]))
        manifest = json.loads((folder / "backup.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["original_path"], str(doc))
        self.assertEqual(manifest["file_name"], "Báo cáo.docx")

    def test_nothing_is_left_in_the_users_folder(self):
        doc = self._doc("a.docx")
        self.store.keep(doc)
        self.assertEqual([path.name for path in self.docs.iterdir()], ["a.docx"])
        self.assertEqual(list(self.store.root.glob(".backup.*.tmp")), [])

    def test_same_name_in_two_folders_does_not_collide(self):
        other_dir = self.docs / "khac"
        other_dir.mkdir()
        first = self._doc("a.docx", b"first")
        second = other_dir / "a.docx"
        second.write_bytes(b"second")
        self.store.keep(first)
        self.store.keep(second)
        self.assertEqual(self._backup_path(first).read_bytes(), b"first")
        self.assertEqual(self._backup_path(second).read_bytes(), b"second")

    def test_works_when_the_documents_folder_is_read_only(self):
        doc = self._doc("a.docx")
        os.chmod(doc, 0o444)
        self.addCleanup(os.chmod, doc, 0o666)
        self.assertTrue(self.store.keep(doc))
        self.assertEqual(self._backup_path(doc).read_bytes(), b"v1")

    def test_count_limit_evicts_the_oldest_document(self):
        with patch.object(main._AUTORECOVER_STORE_MODULE, "MAX_BACKUP_COUNT", 2):
            docs = [self._doc(f"{index}.docx") for index in range(3)]
            for age, doc in enumerate(docs):
                self.store.keep(doc)
                os.utime(self.store.folder_for(doc) / "backup.json", (1000 + age, 1000 + age))
        self.assertFalse(self.store.folder_for(docs[0]).exists())
        self.assertTrue(self.store.folder_for(docs[1]).exists())
        self.assertTrue(self.store.folder_for(docs[2]).exists())

    def test_total_size_limit_evicts_but_keeps_the_newest(self):
        with patch.object(main._AUTORECOVER_STORE_MODULE, "MAX_BACKUP_TOTAL_BYTES", 1500):
            older = self._doc("old.docx", b"x" * 1000)
            self.store.keep(older)
            os.utime(self.store.folder_for(older) / "backup.json", (1000, 1000))
            newer = self._doc("new.docx", b"y" * 1000)
            self.store.keep(newer)
        self.assertFalse(self.store.folder_for(older).exists())
        self.assertTrue(self._backup_path(newer).is_file())

    def test_oversized_file_is_skipped_and_stale_generation_removed(self):
        doc = self._doc("big.docx", b"small")
        self.store.keep(doc)
        doc.write_bytes(b"z" * 2048)
        with patch.object(main._AUTORECOVER_STORE_MODULE, "MAX_BACKUP_FILE_BYTES", 1024):
            self.assertFalse(self.store.keep(doc))
        self.assertFalse(self.store.folder_for(doc).exists())

    def test_failed_copy_keeps_previous_generation_and_cleans_temp(self):
        doc = self._doc("a.docx", b"v1")
        self.store.keep(doc)
        doc.write_bytes(b"v2")
        with patch.object(main._AUTORECOVER_STORE_MODULE.shutil, "copyfileobj", side_effect=OSError(errno.ENOSPC, "full")):
            with self.assertRaises(OSError):
                self.store.keep(doc)
        self.assertEqual(self._backup_path(doc).read_bytes(), b"v1")
        self.assertEqual(list(self.store.root.glob(".backup.*.tmp")), [])


class SaveKeepsBackupTests(unittest.TestCase):
    """Through the real save method, with only the document conversion stubbed."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.app_data = self.base / "appdata"
        self.target = self.base / "tai-lieu.docx"
        self.target.write_bytes(b"previous version")
        self.api = VnOfficeApi(app_kind="writer")
        self.addCleanup(self.api.close_autorecover_session)
        data_patch = patch.object(main, "_user_data_dir", return_value=self.app_data)
        data_patch.start()
        self.addCleanup(data_patch.stop)
        for name in ("_run_ooxml_shadow",):
            stub = patch.object(main, name, return_value=None)
            stub.start()
            self.addCleanup(stub.stop)
        self.store = SaveBackupStore(self.app_data)

    def _save(self, payload=b"new version"):
        def convert(src_path, app_kind, build_format, **_kwargs):
            out = Path(src_path).with_suffix(".out.docx")
            out.write_bytes(payload)
            return str(out)

        with patch.object(main, "_convert_save_source_to_native", side_effect=convert):
            return self.api.save_document_in_place("<p>x</p>", "writer", str(self.target), str(self.target))

    def _backup(self):
        return self.store.folder_for(self.target.resolve()) / self.target.name

    def test_save_keeps_the_replaced_version(self):
        result = self._save()
        self.assertEqual(result["status"], "ok")
        self.assertEqual(self.target.read_bytes(), b"new version")
        self.assertEqual(self._backup().read_bytes(), b"previous version")

    def test_new_file_has_no_backup(self):
        self.target.unlink()
        self.assertEqual(self._save()["status"], "ok")
        self.assertFalse(self._backup().exists())

    def test_backup_failure_does_not_block_the_save_and_is_logged(self):
        with patch.object(SaveBackupStore, "keep", side_effect=OSError(errno.ENOSPC, "full")), self.assertLogs(
            "vnoffice.save", level="WARNING"
        ) as logs:
            result = self._save()
        self.assertEqual(result["status"], "ok")
        self.assertEqual(self.target.read_bytes(), b"new version")
        self.assertTrue(any("Save backup failed" in line for line in logs.output))
        logged = self.store.log_path.read_text(encoding="utf-8")
        self.assertIn("errno=", logged)
        self.assertNotIn(self.target.name, logged)

    def test_failed_conversion_does_not_disturb_the_backup(self):
        self.store.keep(self.target.resolve())
        self.target.write_bytes(b"edited on disk")
        with patch.object(main, "_convert_save_source_to_native", side_effect=main.DocumentEngineError("fail")):
            result = self.api.save_document_in_place("<p>x</p>", "writer", str(self.target), str(self.target))
        self.assertEqual(result["status"], "error")
        self.assertEqual(self._backup().read_bytes(), b"previous version")

    def test_failed_staging_does_not_disturb_the_backup(self):
        self.store.keep(self.target.resolve())
        self.target.write_bytes(b"current")
        with patch.object(main, "_write_durable_copy", side_effect=OSError(errno.ENOSPC, "full")):
            self.assertEqual(self._save()["status"], "error")
        self.assertEqual(self._backup().read_bytes(), b"previous version")

    def test_adding_a_password_leaves_no_readable_backup(self):
        self.store.keep(self.target.resolve())
        self.assertTrue(self._backup().exists())
        self.api._document_password = "matkhau"
        encrypted = patch.object(main, "_encrypt_ooxml_output", side_effect=lambda out, _fmt, _pw: out)
        with encrypted, patch.object(main, "_is_encrypted_package", return_value=False):
            self.assertEqual(self._save()["status"], "ok")
        self.assertFalse(self.store.folder_for(self.target.resolve()).exists())

    def test_saving_an_already_encrypted_file_keeps_its_encrypted_backup(self):
        self.api._document_password = "matkhau"
        encrypted = patch.object(main, "_encrypt_ooxml_output", side_effect=lambda out, _fmt, _pw: out)
        with encrypted, patch.object(main, "_is_encrypted_package", return_value=True):
            self.assertEqual(self._save()["status"], "ok")
        self.assertEqual(self._backup().read_bytes(), b"previous version")


class EncryptStageHasNoBackupTests(unittest.TestCase):
    def test_atomic_replace_alone_does_not_back_up(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            (base / "dest.docx").write_bytes(b"old")
            (base / "src.docx").write_bytes(b"new")
            with patch.object(SaveBackupStore, "keep") as keep:
                main._atomic_replace_file(str(base / "src.docx"), str(base / "dest.docx"))
            keep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
