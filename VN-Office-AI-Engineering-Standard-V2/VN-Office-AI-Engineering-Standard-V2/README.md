# VN Office — AI Engineering Standard V2

Bộ quy định nguồn duy nhất cho Codex, Claude Code, AGY và các coding agent khác.

## Product
VN Office là một Office Suite duy nhất gồm:
- VN Writer
- VN Sheet
- VN Slides

3 ứng dụng dùng chung VN Office Platform và kế thừa LibreOffice Core.

## Mục tiêu
1. UI/UX VN Office riêng, hiện đại, trực quan, thân thiện.
2. Tận dụng tối đa LibreOffice thay vì viết lại engine.
3. Writer/Sheet/Slides có thể phát triển song song.
4. Một monorepo, shared platform, adapter boundary rõ ràng.
5. Giữ fork đủ sạch để tiếp tục nhận cập nhật LibreOffice.
6. AI coding agents làm việc có kiểm soát, không phá kiến trúc.

## Thứ tự đọc bắt buộc
1. `/AGENTS.md`
2. `/00-governance/NON-NEGOTIABLE-RULES.md`
3. `/01-architecture/ARCHITECTURE.md`
4. `/02-development/WORKFLOW.md`
5. File chuẩn của vùng đang làm.
6. `/09-templates/AGENT-HANDOFF.md`

Nếu tài liệu mâu thuẫn: Human instruction > AGENTS.md > NON-NEGOTIABLE > Architecture > domain standards > templates.
