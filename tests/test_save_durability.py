"""S1 item 1: the staged file reaches the disk before replace, and any failure leaves the original intact."""

import errno
import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import main
from main import DocumentEngineError, _atomic_replace_file

ORIGINAL = b"noi dung goc"
NEW = b"noi dung moi da sua"


def _backend(module_name):
    services = main._os_services()
    if services is None:
        raise unittest.SkipTest("OS services are disabled (legacy mode)")
    return importlib.import_module(f"_vno_os_services.{module_name}")


class DurableReplaceBase(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.dir = Path(self.temp.name)
        self.dest = self.dir / "dest" / "tai lieu.docx"
        self.dest.parent.mkdir()
        self.dest.write_bytes(ORIGINAL)
        self.src = self.dir / "converted.docx"
        self.src.write_bytes(NEW)

    def assert_original_intact_and_no_staging_left(self):
        self.assertEqual(self.dest.read_bytes(), ORIGINAL)
        self.assertEqual([path.name for path in self.dest.parent.iterdir()], [self.dest.name])


class AtomicReplaceDurabilityTests(DurableReplaceBase):
    def test_order_is_flush_staged_file_then_replace_then_flush_directory(self):
        calls = []
        real_replace = os.replace
        durable = main._durable_files()
        self.assertIsNotNone(durable)

        def flush_file(fd):
            # At flush time the staged copy holds all bytes and the destination is still the original.
            self.assertEqual(os.fstat(fd).st_size, len(NEW))
            self.assertEqual(self.dest.read_bytes(), ORIGINAL)
            calls.append("flush_file")

        def replace(src, dst):
            calls.append("replace")
            real_replace(src, dst)

        with patch.object(type(durable), "flush_file", side_effect=flush_file), patch.object(
            type(durable), "flush_directory", side_effect=lambda path: calls.append(("flush_directory", Path(path)))
        ), patch.object(main.os, "replace", side_effect=replace):
            _atomic_replace_file(str(self.src), str(self.dest))

        self.assertEqual(calls, ["flush_file", "replace", ("flush_directory", self.dest.parent.resolve())])
        self.assertEqual(self.dest.read_bytes(), NEW)
        self.assertEqual([path.name for path in self.dest.parent.iterdir()], [self.dest.name])

    def test_real_flush_on_this_platform_succeeds(self):
        _atomic_replace_file(str(self.src), str(self.dest))
        self.assertEqual(self.dest.read_bytes(), NEW)

    def test_failed_copy_keeps_original(self):
        def fail_copy(source, target, length=0):
            target.write(b"partial")
            raise OSError(errno.ENOSPC, "No space left on device")

        with patch.object(main.shutil, "copyfileobj", side_effect=fail_copy):
            with self.assertRaises(DocumentEngineError):
                _atomic_replace_file(str(self.src), str(self.dest))
        self.assert_original_intact_and_no_staging_left()

    def test_missing_source_keeps_original(self):
        with self.assertRaises(DocumentEngineError):
            _atomic_replace_file(str(self.dir / "khong-co.docx"), str(self.dest))
        self.assert_original_intact_and_no_staging_left()

    def test_real_flush_error_is_reported_and_keeps_original(self):
        durable = main._durable_files()
        with patch.object(type(durable), "flush_file", side_effect=OSError(errno.EIO, "I/O error")):
            with self.assertRaises(DocumentEngineError) as caught:
                _atomic_replace_file(str(self.src), str(self.dest))
        self.assertIn("Không thể ghi tệp vào đĩa", str(caught.exception))
        self.assert_original_intact_and_no_staging_left()

    def test_failed_replace_keeps_original(self):
        with patch.object(main.os, "replace", side_effect=PermissionError(errno.EACCES, "locked")):
            with self.assertRaises(DocumentEngineError):
                _atomic_replace_file(str(self.src), str(self.dest))
        self.assert_original_intact_and_no_staging_left()

    def test_empty_converted_output_never_replaces_original(self):
        self.src.write_bytes(b"")
        with self.assertRaises(DocumentEngineError):
            _atomic_replace_file(str(self.src), str(self.dest))
        self.assert_original_intact_and_no_staging_left()

    def test_real_directory_flush_error_is_reported(self):
        durable = main._durable_files()
        with patch.object(type(durable), "flush_directory", side_effect=OSError(errno.EIO, "I/O error")):
            with self.assertRaises(DocumentEngineError):
                _atomic_replace_file(str(self.src), str(self.dest))

    def test_without_durable_service_falls_back_to_fsync(self):
        with patch.object(main, "_durable_files", return_value=None), patch.object(
            main.os, "fsync", wraps=os.fsync
        ) as fsync:
            _atomic_replace_file(str(self.src), str(self.dest))
        self.assertEqual(fsync.call_count, 1)
        self.assertEqual(self.dest.read_bytes(), NEW)


class PortableDurableFilesTests(unittest.TestCase):
    def setUp(self):
        self.files = _backend("portable").PortableDurableFiles()

    def test_refused_file_flush_is_tolerated(self):
        for code in (errno.EINVAL, errno.ENOTSUP, errno.ENOSYS):
            with self.subTest(code=code), patch("os.fsync", side_effect=OSError(code, "refused")):
                self.files.flush_file(0)

    def test_real_file_flush_error_raises(self):
        for code in (errno.EIO, errno.ENOSPC):
            with self.subTest(code=code), patch("os.fsync", side_effect=OSError(code, "failed")):
                with self.assertRaises(OSError):
                    self.files.flush_file(0)

    def test_refused_directory_open_is_tolerated(self):
        for code in (errno.EACCES, errno.EPERM, errno.EISDIR):
            with self.subTest(code=code), patch("os.open", side_effect=OSError(code, "refused")):
                self.files.flush_directory(Path("."))

    def test_real_directory_error_raises(self):
        with patch("os.open", return_value=99), patch("os.close"), patch("os.fsync", side_effect=OSError(errno.EIO, "failed")):
            with self.assertRaises(OSError):
                self.files.flush_directory(Path("."))


@unittest.skipUnless(sys.platform == "win32", "Windows backend")
class WindowsDurableFilesTests(unittest.TestCase):
    def setUp(self):
        self.files = _backend("windows").WindowsDurableFiles()
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)

    def test_real_file_and_directory_flush(self):
        path = Path(self.temp.name) / "a.bin"
        with open(path, "wb") as handle:
            handle.write(b"x")
            handle.flush()
            self.files.flush_file(handle.fileno())
        self.files.flush_directory(Path(self.temp.name))

    def test_missing_directory_is_a_real_error(self):
        with self.assertRaises(OSError):
            self.files.flush_directory(Path(self.temp.name) / "khong-co")

    def test_refused_codes_are_tolerated_and_others_raise(self):
        module = _backend("windows")
        for code in (1, 50, 87, 120):
            self.files._handle_failure(code, module._FLUSH_REFUSED_WINERRORS, "File")
        # ERROR_DISK_FULL, ERROR_NETNAME_DELETED, ERROR_IO_DEVICE
        for code in (112, 64, 1117):
            with self.assertRaises(OSError):
                self.files._handle_failure(code, module._FLUSH_REFUSED_WINERRORS, "File")
        # A directory may deny write access; a file handle opened for writing may not.
        self.files._handle_failure(5, module._DIRECTORY_FLUSH_REFUSED_WINERRORS, "Directory")
        with self.assertRaises(OSError):
            self.files._handle_failure(5, module._FLUSH_REFUSED_WINERRORS, "File")


if __name__ == "__main__":
    unittest.main()
