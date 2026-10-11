# LibreOffice Upstream Policy
VN Office fork phải tiếp tục nhận được security, compatibility, rendering và performance fixes.

Priority:
`config → VN Platform/UI → Adapter → isolated VN module → small Core patch → deep fork`.

Mỗi sync:
fetch → sync branch → resolve → build → 3-app smoke → OOXML round-trip → VN regression → review Core patches → integration → main.

Không đợi fork cách upstream quá xa mới sync.
