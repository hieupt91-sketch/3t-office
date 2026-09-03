# AGENTS.md

## 1. Mission
Phát triển VN Office thành một suite thống nhất gồm VN Writer, VN Sheet và VN Slides, với UI/UX riêng nhưng tận dụng LibreOffice làm nền tảng xử lý tài liệu.

## 2. Non-negotiable
- REUSE BEFORE REWRITE.
- UI KHÔNG gọi LibreOffice implementation trực tiếp.
- Một monorepo; không tách Writer/Sheet/Slides thành 3 codebase.
- Shared capability phải nằm Shared Platform.
- App-specific capability phải nằm app tương ứng.
- Sửa LibreOffice Core là lựa chọn cuối.
- Mỗi coding agent dùng branch + worktree riêng.
- Không 2 coding agent cùng sửa một working tree.
- Không claim PASS nếu chưa chạy test/build.
- Không destructive Git nếu chưa được người phụ trách cho phép.
- Không commit secret.
- Không refactor ngoài scope.
- Không copy-paste component dùng chung sang nhiều app.
- Không gửi nội dung tài liệu ra AI/cloud âm thầm.
- Không làm UI chỉ “chạy được”; phải trực quan, keyboard-usable, có states và error handling.
- Không sao chép tài sản/branding độc quyền của sản phẩm khác.

## 3. Mandatory decision order
Khi cần feature:
1. Tìm implementation hiện hữu trong LibreOffice.
2. Reuse nếu phù hợp.
3. Wrap bằng VN Adapter nếu UI cần abstraction.
4. Extend VN Platform/App Layer.
5. Viết module VN mới nếu thật sự thiếu.
6. Core patch chỉ khi 1–5 không giải quyết đúng.

## 4. Layer boundary
```text
VN App UI
  ↓
VN Platform / Command / Service
  ↓
VN LibreOffice Adapter
  ↓
LibreOffice Core
```

Forbidden:
```text
VN UI → LibreOffice internal implementation
Platform → app-specific internals
Writer → Sheet internals
Sheet → Slides internals
Slides → Writer internals
LibreOffice upstream → VN UI
```

## 5. Ownership
- `apps/writer/**`: Writer owner
- `apps/sheet/**`: Sheet owner
- `apps/slides/**`: Slides owner
- `platform/**`: Platform owner
- `adapters/**`: Integration/Core owner
- `upstream/**`: Core/Upstream owner
- `branding/**`: Design/Brand owner
- `tests/**`: relevant owner + QA

Agent không tự sửa vùng khác. Tạo dependency/handoff.

## 6. Plan gate
Phải plan trước code nếu thay đổi:
- shared platform
- >3 source files
- import/export
- document model
- build system
- security boundary
- AI data flow
- external dependency
- Core/upstream
- nhiều app

Plan: objective, current capability, files/modules, dependency, risk, test plan, rollback.

## 7. Core patch gate
Core patch phải có:
- `VN-CORE-PATCH` ID
- lý do
- vì sao Adapter/Platform không đủ
- affected upstream module
- compatibility risk
- tests
- upstream sync note
- removal condition

## 8. Test truthfulness
Allowed:
- PASS = đã chạy và pass.
- FAIL = đã chạy và fail.
- NOT RUN = chưa chạy.
- BLOCKED = không chạy được + lý do.

Cấm disable test, swallow exception hoặc đổi expected output chỉ để xanh.

## 9. Agent completion
Mỗi task kết thúc bằng handoff chuẩn trong `/09-templates/AGENT-HANDOFF.md`.

## 10. Stop and ask
Dừng và xin quyết định khi:
- đổi framework UI
- đổi build system
- thay file format semantics
- sửa sâu Core
- thêm dependency lớn
- thay security boundary
- external AI nhận document content mới
- license/trademark uncertainty
- destructive Git
- architecture docs và source thực tế mâu thuẫn nghiêm trọng
