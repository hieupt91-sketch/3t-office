# HANDOFF — AI Value Features (3 tính năng AI giá trị)

## Phạm vi task
Thêm 3 tính năng AI thật (mục 3) tận dụng hạ tầng `LocalAiService`/provider system đã có.

---

## 1. Nhập liệu bằng giọng nói (Voice Input) — HOÀN THÀNH ĐẦY ĐỦ

**Command:** `ai.voice.input`
**File mới:** `platform/ai/voice-input.js` (~100 dòng)

### Triển khai
- Dùng **Web Speech API** (`window.SpeechRecognition` / `window.webkitSpeechRecognition`) — API chuẩn Chromium/Edge, không cần thêm dependency.
- `voice-input.js` export 4 hàm: `isVoiceInputSupported()`, `startVoiceInput(options)`, `stopVoiceInput()`, `isVoiceInputActive()`.
- Ngôn ngữ mặc định: `vi-VN`. Hỗ trợ `continuous: true` + `interimResults: true` để hiển thị text đang nghe.
- Văn bản nhận dạng được chèn vào vị trí con trỏ bằng `document.execCommand("insertText")`.
- Xử lý lỗi đầy đủ bằng tiếng Việt: `no-speech`, `audio-capture`, `not-allowed`, `network`, `aborted`.
- Thêm icon `voiceInput` (microphone + AI sparkle) vào `platform/ui-kit/icons.js`.

### Vị trí UI
- Ribbon tab **Trợ lý VN AI** > nhóm **AI Thông minh** (nhóm mới, cạnh nhóm "Tính năng AI thuần Việt" có sẵn).

### Giới hạn đã biết
- **WebView2 + Microphone:** Web Speech API yêu cầu quyền truy cập microphone qua Windows. pywebview trên Windows dùng WebView2 (Chromium engine) — SpeechRecognition khả dụng khi chạy qua HTTP (`localhost`). Cần test thật trên máy chạy `python main.py` để xác nhận quyền microphone được cấp đúng.
- **Kết nối internet:** Web Speech API sử dụng dịch vụ nhận dạng của Google/Chromium — cần kết nối internet để nhận dạng语音.

---

## 2. Tóm tắt cuộc họp (Meeting Summary) — HOÀN THÀNH ĐẦY ĐỦ

**Command:** `ai.assistant.summarizeMeeting`
**File sửa:** `platform/shell/app-shell.js` (thêm `_handleMeetingSummary()`)

### Triển khai
- Mở hộp thoại `showPromptDialog` cho phép dán/nhập transcript cuộc họp.
- Gọi `LocalAiService.query()` với prompt chuyên biệt yêu cầu output có cấu trúc: **Điểm chính**, **Quyết định**, **Việc cần làm (kèm người phụ trách)**.
- Hiển thị kết quả trong AI sidebar, có nút "Chèn vào tài liệu" để thêm vào vị trí con trỏ.
- **RuleBasedProvider** đã được cập nhật để xử lý query meeting summary — trả lời rõ ràng rằng chế độ cục bộ không đủ thông minh, khuyến nghị kết nối AI cloud.
- Thêm icon `aiMeeting` vào `platform/ui-kit/icons.js`.

### Vị trí UI
- Ribbon tab **Trợ lý VN AI** > nhóm **AI Thông minh**.

---

## 3. Tìm kiếm thông minh (Smart Search) — HOÀN THÀNH ĐẦY ĐỦ

**Command:** `ai.assistant.smartSearch`
**File sửa:** `platform/shell/app-shell.js` (thêm `_handleSmartSearch()`)

### Triển khai
- Mở hộp thoại `showPromptDialog` cho phép nhập câu hỏi tìm kiếm bằng ngôn ngữ tự nhiên.
- Lấy `editorContainer.innerText` làm context document.
- Gọi `LocalAiService.query()` với prompt yêu cầu tìm đoạn liên quan trong tài liệu.
- Hiển thị kết quả trong AI sidebar.
- **RuleBasedProvider** đã được cập nhật để xử lý query smart search — trả về thông tin cơ bản về tài liệu + khuyến nghị kết nối AI cloud.
- Thêm icon `aiSearch` (magnifying glass + AI sparkle) vào `platform/ui-kit/icons.js`.

### Vị trí UI
- Ribbon tab **Trợ lý VN AI** > nhóm **AI Thông minh**.

### Giới hạn đã biết
- Không tự động scroll/highlight đến vị trí tìm thấy trong DOM (giới hạn phạm vi task — hiển thị đoạn liên quan là đủ).

---

## Tính năng hoàn thành đầy đủ

| # | Tính năng | Trạng thái | Ghi chú |
|---|-----------|------------|---------|
| 1 | Voice Input | ✅ HOÀN THÀNH | Cần test thật WebView2 + microphone |
| 2 | Meeting Summary | ✅ HOÀN THÀNH | Hoạt động đầy đủ với AI cloud; cơ bản với RuleBased |
| 3 | Smart Search | ✅ HOÀN THÀNH | Hoạt động đầy đủ với AI cloud; cơ bản với RuleBased |

---

## Files đã sửa/đổi

### File mới
- `platform/ai/voice-input.js` — Module Voice Input

### File sửa
- `platform/commands/command-definitions.js` — Thêm 3 command mới (`ai.voice.input`, `ai.assistant.summarizeMeeting`, `ai.assistant.smartSearch`)
- `platform/ui-kit/icons.js` — Thêm 3 icon mới (`voiceInput`, `aiMeeting`, `aiSearch`)
- `platform/shell/app-shell.js` — Import voice-input.js, thêm 3 bindHandler + 3 method implementation
- `apps/writer/writer-ribbon.js` — Thêm nhóm "AI Thông minh" với 3 nút ribbon
- `platform/ai/providers/rule-based-provider.js` — Thêm xử lý cho meeting summary + smart search queries
- `platform/help/entries-writer.js` — Thêm 3 bài hướng dẫn sử dụng tiếng Việt

---

## Bằng chứng test

### Syntax check
```
node scripts/check-syntax.js → 91/91 PASS (0 lỗi cú pháp)
```

### Behavioral tests
```
node tests/run-tests.js → 1522/1522 PASS (0 FAIL)
```

### Test thật Voice Input — Claude tự xác minh trước khi merge

Task brief yêu cầu bắt buộc phải xác nhận SpeechRecognition hoạt động thật
trong WebView2 trước khi coi là hoàn thành. opencode đánh dấu todo "Xác nhận
SpeechRecognition hoạt động trong WebView2" là ĐÃ XONG nhưng báo cáo cuối lại
ghi "CẦN THỰC HIỆN" — mâu thuẫn, nghĩa là bước bắt buộc này CHƯA thực sự
được làm. Claude đã tự làm bước này trước khi merge:

- Tự viết script khởi động app thật (`webview.create_window` + `webview.start`
  với callback `evaluate_js`, y hệt cách `main.py` thật khởi động), mở cửa sổ
  Writer thật qua đúng server nội bộ, đợi trang tải xong, rồi gọi
  `window.evaluate_js("Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)")`
  ngay trong WebView2 thật (không phải trình duyệt Chrome thường).
- **Kết quả thật**: `hasSpeechRecognition: true`, `hasStandard: true`,
  `hasWebkitPrefixed: true`. `navigator.userAgent` xác nhận đang chạy
  Chromium Edge thật (`Edg/152.0.0.0`) bên trong WebView2 — đúng engine mà
  ứng dụng desktop thật sự dùng.
- **Kết luận**: API `SpeechRecognition` chắc chắn tồn tại và khả dụng trong
  WebView2 thật — rủi ro lớn nhất (API không tồn tại, tính năng chết ngay từ
  đầu) đã được loại trừ bằng bằng chứng thật, không phải suy đoán.
- **Giới hạn còn lại (không thể tự động hoá được)**: chưa xác nhận được toàn
  bộ luồng thu âm + nhận dạng qua microphone thật (cần người dùng thật nói
  vào micro và cấp quyền hệ điều hành — không thể giả lập trong môi trường
  tự động này). Đây là rủi ro thấp còn lại — nếu quyền microphone bị từ chối
  hoặc không có micro, code đã xử lý rõ ràng bằng thông báo lỗi tiếng Việt
  (`not-allowed`, `audio-capture`) thay vì crash hay treo.

---

## Hướng dẫn sử dụng tiếng Việt (đã thêm vào app)

3 bài hướng dẫn đã thêm vào `platform/help/entries-writer.js`:
1. `writer.ai.voiceInput` — Hướng dẫn nhập liệu bằng giọng nói
2. `writer.ai.meetingSummary` — Hướng dẫn tóm tắt cuộc họp
3. `writer.ai.smartSearch` — Hướng dẫn tìm kiếm thông minh

Mỗi bài có: tiêu đề, mô tả, vị trí ribbon, từ khóa tìm kiếm, các bước sử dụng cụ thể bằng tiếng Việt.

---

## Ranh giới an toàn đã tuân thủ
- ✅ Không viết lại provider system — tất cả lệnh gọi AI mới đi qua `LocalAiService`
- ✅ Không gửi dữ liệu ra AI cloud ngoài phạm vi người dùng yêu cầu
- ✅ Không sửa `scripts/serve.js`
- ✅ Không đụng OAuth/đăng nhập
- ✅ Không thêm dependency mới
- ✅ Web Speech API là API trình duyệt có sẵn
