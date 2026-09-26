# HANDOFF-CLOUD-OAUTH-SCAFFOLDING.md

## Tóm tắt
Đã hoàn thành khung kết nối tài khoản Cloud (Google Drive + OneDrive) cho VN Office sử dụng **OAuth 2.0 PKCE + loopback redirect** — chuẩn RFC 8252 dành cho ứng dụng desktop/native. Không cần backend, không lưu Client Secret.

---

## 1. Kiến trúc

```
VN App UI (Backstage "Kết nối Cloud")
    ↓
VN Platform (CloudOAuth, CloudTokenManager, CloudService, CloudConfig)
    ↓
VN LibreOffice Adapter (chỉ để đọc/ghi file, không liên quan OAuth)
    ↓
LibreOffice Core
```

### Các module mới trong `platform/cloud/`

| File | Chức năng |
|------|-----------|
| `cloud-config.js` | Cấu hình provider (endpoints, scopes), đọc/ghi Client ID từ localStorage, validate Client ID |
| `cloud-oauth.js` | OAuth PKCE flow: sinh code_verifier/code_challenge (Web Crypto), mở loopback server qua Python, mở trình duyệt, polling callback, đổi code lấy token, refresh token |
| `cloud-token-manager.js` | Lưu/đọc access_token + refresh_token (localStorage + memory fallback), kiểm tra hết hạn, tự động refresh |
| `cloud-service.js` | Upload/Download/Liệt kê file Google Drive & OneDrive (REST API) |
| `index.js` | Export thống nhất |

### Python (`main.py`)

- `_start_oauth_loopback_server()`: Tìm cổng trống 9100–9119, khởi động `ThreadingHTTPServer` trên daemon thread, handler `/callback` nhận `code`/`state`/`error`.
- `VnOfficeApi.startOAuthLoopback()` / `stopOAuthLoopback()` / `pollOAuthCallback()`: Phơi ra cho JS qua `pywebview.js_api`.
- `VnOfficeApi.openExternalUrl()`: Mở trình duyệt mặc định.

**Tách biệt hoàn toàn** với `_start_static_server()` (cổng 8080–8099 phục vụ giao diện).

---

## 2. Luồng OAuth PKCE (Desktop App — RFC 8252)

```
1. JS: generateCodeVerifier() → 32 bytes random → base64url (43-128 chars)
2. JS: generateCodeChallenge(verifier) → SHA-256 → base64url (S256 method)
3. JS: generateState() → 16 bytes random → base64url (CSRF protection)
4. JS: saveState(state) vào localStorage
5. JS: pywebviewApi.startOAuthLoopback() → Python mở cổng 127.0.0.1:<port>
6. JS: redirect_uri = http://127.0.0.1:<port>/callback
7. JS: buildAuthUrl(provider, clientId, redirectUri, codeChallenge, state)
8. JS: pywebviewApi.openExternalUrl(authUrl) → Mở trình duyệt
9. User đăng nhập → Provider redirect về http://127.0.0.1:<port>/callback?code=...&state=...
10. Python handler: parse query → lưu vào server._callback_data → trả HTML thành công/thất bại
11. JS: polling pywebviewApi.pollOAuthCallback() mỗi 500ms
12. JS: consumeState(state) → xác thực CSRF
13. JS: exchangeCodeForToken(provider, code, codeVerifier, redirectUri) → fetch() trực tiếp token endpoint
14. JS: CloudTokenManager.saveToken(providerId, tokenResponse)
15. JS: pywebviewApi.stopOAuthLoopback() → đóng cổng
```

**Không có Client Secret** — PKCE thay thế bằng `code_verifier` chỉ biết phía client.

---

## 3. Hướng dẫn Chủ dự án: Đăng ký Client ID

### 3.1 Google Drive (Google Cloud Console)

1. Truy cập https://console.cloud.google.com/
2. Tạo project mới hoặc chọn project hiện có
3. **APIs & Services → Library** → Tìm "Google Drive API" → **Enable**
4. **APIs & Services → Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Desktop app**
   - Name: "VN Office" (tùy chọn)
5. Copy **Client ID** (dạng `123456789-abcdef.apps.googleusercontent.com`)
6. **Không cần Client Secret** (PKCE không dùng)

**Cấu hình vào VN Office:**
- Mở VN Office → Alt+F (Backstage) → Tab "Kết nối Cloud"
- Nhấn nút cài đặt (nếu có) hoặc vào file config → điền Client ID cho Google
- Hoặc đặt biến môi trường: `VNO_CLOUD_GOOGLE_CLIENT_ID=...`

### 3.2 OneDrive (Microsoft Azure Portal)

1. Truy cập https://portal.azure.com/
2. **Microsoft Entra ID (Azure AD)** → **App registrations** → **New registration**
   - Name: "VN Office"
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: **Public client/native** → `http://localhost` (cho phép cổng bất kỳ)
3. Copy **Application (client) ID** (GUID dạng `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
4. **Authentication** → **Advanced settings** → **Allow public client flows**: **Yes**
5. **API permissions** → Add permission → Microsoft Graph → Delegated → `Files.ReadWrite`

**Cấu hình vào VN Office:**
- Giống Google: điền Client ID vào Backstage "Kết nối Cloud" hoặc biến môi trường `VNO_CLOUD_ONEDRIVE_CLIENT_ID=...`

---

## 4. Cấu hình Client ID (cho developer)

Client ID được lưu trong `localStorage` với key:
- Google: `vno-cloud-clientid-google`
- OneDrive: `vno-cloud-clientid-onedrive`

**Cách đặt qua code (dev):**
```js
import { CloudConfig } from "platform/cloud/index.js";
CloudConfig.setClientId("google", "YOUR_GOOGLE_CLIENT_ID");
CloudConfig.setClientId("onedrive", "YOUR_ONEDRIVE_CLIENT_ID");
```

**Cách đặt qua biến môi trường (production build):**
- Build-time inject vào `window.__VNO_CLOUD_CONFIG__` hoặc đọc từ file config JSON đi kèm bản đóng gói.

---

## 5. UI: Backstage "Kết nối Cloud"

- **Vị trí**: Alt+F → Sidebar → nút "Kết nối Cloud" (icon ☁️)
- **Hiển thị**: 2 card riêng biệt: Google Drive & OneDrive
- **Trạng thái**:
  - Chưa cấu hình Client ID: Nút "Kết nối" disabled, banner đỏ "Chưa cấu hình Client ID..."
  - Chưa kết nối: Nút "Kết nối Google Drive/OneDrive" enabled
  - Đã kết nối: Badge xanh "Đã kết nối", nút "Ngắt kết nối"
- **Keyboard accessible**: Tab/Enter/Space điều hướng, Escape đóng Backstage

---

## 6. Thao tác cơ bản (Phạm vi task này)

| Hành động | API | Mô tả |
|-----------|-----|-------|
| Upload file hiện tại | `CloudService.uploadFile(providerId, fileName, fileContent)` | Tạo file mới trong thư mục gốc "VN Office" (Google) hoặc root (OneDrive) |
| Liệt kê file gần đây | `CloudService.listFiles(providerId, pageSize=10)` | Trả về [{id, name, mimeType, modifiedTime, size}] |
| Download & mở file | `CloudService.downloadFile(providerId, fileId)` → blob → `VnOfficeApi.open_document_dialog()` | Tải về file tạm, mở qua luồng hiện có |

**KHÔNG làm**: Đồng bộ 2 chiều tự động, real-time collaboration, conflict resolution.

---

## 7. Kiểm thử

### 7.1 Unit Test (JS) — `tests/unit/cloud-oauth.test.js`
- `generateCodeVerifier`: độ dài 43-128, chỉ base64url chars, ngẫu nhiên
- `base64UrlEncode`: không padding, không +/_, URL-safe
- `generateCodeChallenge`: SHA-256 → base64url, deterministic, khác verifier cho challenge khác
- `generateState`: đủ dài, ngẫu nhiên
- **Chạy**: `node tests/run-tests.js` → Suite "9d. Unit Tests — Cloud OAuth PKCE & Loopback": **10/10 PASS**

### 7.2 Unit Test (Python) — `tests/test_cloud_oauth_loopback.py`
- `_start_oauth_loopback_server`: tìm cổng trống, skip cổng bận, raise khi hết cổng
- Callback handler: lưu code/state, lưu error, 404 cho wrong path, error cho missing code
- `VnOfficeApi`: start/stop/poll loopback, thay thế server khi gọi lại
- **Chạy**: `python -m unittest tests.test_cloud_oauth_loopback -v` → **15/15 PASS**

### 7.3 Tổng thể
- `node scripts/check-syntax.js`: **95/95 PASS**
- `node tests/run-tests.js`: **1535/1535 PASS**
- `python -m unittest discover tests`: **172 tests** (tăng 15 so với baseline 157)

---

## 8. Bảo mật & Hạn chế đã biết

| Vấn đề | Trạng thái | Ghi chú |
|--------|------------|---------|
| Token lưu plaintext localStorage | **Hạn chế tạm thời** | Không có encrypted storage tích hợp trong pywebview. Nâng cấp: Windows Credential Manager qua Python `keyring` (cần dependency mới → §11 AGENTS.md) |
| Không có PKCE code_verifier rotation | Theo chuẩn RFC 7636 | Mỗi lần auth sinh mới, không reuse |
| State CSRF timeout | 5 phút | `OAUTH_STATE_TIMEOUT_MS = 5*60*1000` |
| Loopback port collision | Handled | Thử 20 cổng (9100–9119), `SO_REUSEADDR=0` |
| Client ID validation | ✅ Vietnamese error | `CloudConfig.validateClientId()` trả message tiếng Việt rõ ràng |

---

## 9. Các file đã thêm/sửa

### Mới (5 file JS)
- `platform/cloud/cloud-config.js`
- `platform/cloud/cloud-oauth.js`
- `platform/cloud/cloud-token-manager.js`
- `platform/cloud/cloud-service.js`
- `platform/cloud/index.js`

### Mới (2 file test)
- `tests/unit/cloud-oauth.test.js`
- `tests/test_cloud_oauth_loopback.py`

### Sửa
- `main.py`: +150 dòng (OAuth loopback server, VnOfficeApi methods)
- `platform/i18n/strings-vi.js`: +12 keys backstage cloud
- `platform/i18n/strings-en.js`: +12 keys backstage cloud
- `platform/shell/app-shell.js`: +Cloud tab + `_renderBackstageCloudPanel()`
- `tests/run-tests.js`: +import & suite cloud-oauth

---

## 10. Ranh giới an toàn (Stop and ask)

Nếu phát hiện cần:
- Thêm dependency Python (`keyring`, `cryptography`, etc.) → **DỪNG LẠI**, xin phép theo AGENTS.md §11
- Thay đổi luồng PKCE (dùng client secret, implicit flow, etc.) → **KHÔNG** cho phép
- Sửa `scripts/serve.js` → **CẤM**
- Gộp loopback server với static server → **CẤM**
- Tự động sync 2 chiều → **NGOÀI PHẠM VI** (Phase 5, cần duyệt riêng)

---

## 11. Handoff cho agent tiếp theo

### Việc có thể làm tiếp (Phase 2+)
1. **File Picker UI**: Chọn thư mục/file thay vì chỉ root folder (Google Picker API / OneDrive File Picker)
2. **Token encryption**: Tích hợp Windows Credential Manager (cần `keyring` dependency, xin phép trước)
3. **Multi-account**: Hỗ trợ nhiều tài khoản Google/OneDrive cùng lúc
4. **Sync engine**: Đồng bộ 2 chiều có conflict resolution (Phase 5)
5. **Offline queue**: Hàng đợi upload khi mất mạng, retry khi online

### Việc KHÔNG được làm
- Thêm client secret vào bất kỳ đâu
- Sửa `scripts/serve.js`
- Dùng `_start_static_server()` cho OAuth
- Đọc/ghi file nội bộ app khác (Writer/Sheet/Slides) từ platform/cloud

---

## 12. Checklist hoàn thành

- [x] PKCE code_verifier/code_challenge (Web Crypto, no external lib)
- [x] Loopback server riêng (9100–9119, tách biệt static server)
- [x] OAuth flow: auth URL → browser → callback → token exchange → save token
- [x] Refresh token tự động khi hết hạn
- [x] Client ID config + validate (Vietnamese error)
- [x] Backstage "Kết nối Cloud" UI (connect/disconnect, status)
- [x] Upload / List / Download cơ bản
- [x] Unit tests: PKCE, loopback, Client ID validation
- [x] Syntax check: 95/95 PASS
- [x] Test count: 172 (baseline 157 + 15 new)
- [x] Handoff doc này

---

*Ngày tạo: 2026-09-26 | Nhánh: feature/cloud-oauth-scaffolding | Worktree: E:\VNOffice-opencode-cloud-oauth*