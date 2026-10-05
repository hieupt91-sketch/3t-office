"""Machine identity on macOS/Linux (parsing is pure, so it is testable on Windows); Windows behaviour is unchanged."""

from __future__ import annotations

import os
import sys
import unittest
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from adapters.license import device  # noqa: E402

IOREG = '''+-o Root  <class IORegistryEntry, id 0x100000100, retain 29>
  +-o MacBookPro18,3  <class IOPlatformExpertDevice, id 0x10000020c, registered, matched, active, busy 0 (233 ms), retain 40>
    {
      "IOPlatformSerialNumber" = "C02XXXXXXXXX"
      "IOPlatformUUID" = "9a1b2c3d-4e5f-6789-abcd-ef0123456789"
      "manufacturer" = <"Apple Inc.">
    }
'''


class MacMachineIdTests(unittest.TestCase):
    def test_parse_ioreg_output(self):
        self.assertEqual(device.parse_ioreg_platform_uuid(IOREG), "9A1B2C3D-4E5F-6789-ABCD-EF0123456789")
        self.assertIsNone(device.parse_ioreg_platform_uuid(""))
        self.assertIsNone(device.parse_ioreg_platform_uuid('"IOPlatformUUID" = ""'))
        self.assertIsNone(device.parse_ioreg_platform_uuid("nothing here"))

    def test_machine_id_on_macos_uses_the_hardware_uuid_and_falls_back_to_the_mac_address(self):
        with mock.patch.object(device.sys, "platform", "darwin"), \
             mock.patch.object(device, "_macos_platform_uuid", return_value="9A1B2C3D-4E5F-6789-ABCD-EF0123456789"):
            self.assertEqual(device.machine_id(), "mac-uuid-9A1B2C3D-4E5F-6789-ABCD-EF0123456789")
        with mock.patch.object(device.sys, "platform", "darwin"), mock.patch.object(device, "_macos_platform_uuid", return_value=None):
            self.assertTrue(device.machine_id().startswith("mac-"))
            self.assertFalse(device.machine_id().startswith("mac-uuid-"))

    def test_macos_probe_never_raises(self):
        with mock.patch("subprocess.run", side_effect=FileNotFoundError):
            self.assertIsNone(device._macos_platform_uuid())
        with mock.patch("subprocess.run", return_value=mock.Mock(returncode=1, stdout=IOREG)):
            self.assertIsNone(device._macos_platform_uuid())

    def test_linux_machine_id_is_read_and_validated(self):
        m = mock.mock_open(read_data="0123456789abcdef0123456789abcdef\n")
        with mock.patch("builtins.open", m):
            self.assertEqual(device._linux_machine_id(), "0123456789abcdef0123456789abcdef")
        with mock.patch("builtins.open", mock.mock_open(read_data="not-hex")):
            self.assertIsNone(device._linux_machine_id())
        with mock.patch.object(device.sys, "platform", "linux"), mock.patch.object(device, "_linux_machine_id", return_value="abc0123456789def"):
            self.assertEqual(device.machine_id(), "linux-abc0123456789def")

    @unittest.skipUnless(sys.platform == "win32", "Windows registry")
    def test_windows_still_uses_machine_guid(self):
        value = device.machine_id()
        self.assertFalse(value.startswith(("mac-uuid-", "linux-")))
        self.assertEqual(value, device.machine_id())  # stable


if __name__ == "__main__":
    unittest.main()
