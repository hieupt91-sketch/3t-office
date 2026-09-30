# Tham khảo từ 3T Reader (dự án cùng chủ sở hữu) — những gì áp dụng được cho 3T Office

Nguồn: `\\192.168.1.8\d\PDF\3T_Reader_Phase1_Win` (chủ sở hữu cho phép tham khảo và dùng lại, 30/09/2026).
Không sao chép phụ thuộc có giấy phép không phù hợp (3T Reader dùng Qt/PyQt cho giao diện — 3T Office dùng pywebview, không lấy phần này).
Thư mục `đăng ký bq` chứa giấy tờ cá nhân — không đọc, không sao chép.

## Áp dụng ngay / sắp tới
| Mảng | Ở 3T Reader | Dùng cho 3T Office |
|---|---|---|
| Dùng Office/WPS có sẵn trên máy qua COM | `packages/document_core/office_com.py`: dò ProgID trong registry (Word/Excel/PowerPoint; WPS `Kwps`/`Ket`/`Kwpp`), `DispatchEx` (tiến trình mới, không bám Office đang mở), `DisplayAlerts=False`, mở ReadOnly, retry có backoff 5 lần, luôn có đường dự phòng LibreOffice | (1) Công cụ đo/oracle của agent đang hay lỗi `RPC_E_CALL_REJECTED` — áp dụng DispatchEx + DisplayAlerts + backoff. (2) Tuỳ chọn "In/PDF chính xác tuyệt đối": nếu máy có Word/Excel/WPS thì lưu .docx/.xlsx qua đường Lưu rồi nhờ Office xuất PDF/in; không có thì LibreOffice. Cần pywin32 (PSF-style, dùng thương mại được) hoặc gọi COM qua PowerShell để không thêm phụ thuộc |
| Chạy một phiên bản (single instance) | `packages/platform/single_instance.py` | Mở file thứ hai (nhấp đúp .docx) nên mở vào cửa sổ/tiến trình đang chạy như Office, không khởi động lại LibreOffice |
| Liên kết định dạng tệp | `packages/platform/pdf_association.py` | Tuỳ chọn "Mở bằng 3T Doc/Sheet/Slide" (bộ cài đã có, đối chiếu cách xử lý UserChoice) |
| Phông chữ | `packages/platform/fonts.py` | Kiểm tra/bổ sung phông tiếng Việt thường dùng khi thiếu |
| Ký số bộ cài | `scripts/sign_windows.py` (signtool + chứng thư OV/EV, timestamp DigiCert) | Khi có chứng thư ký số: ký `3T-Office-Setup.exe` và các exe để hết cảnh báo SmartScreen |
| Kiểm chữ cứng trong giao diện | `scripts/audit_hardcoded_strings.py` | Đối chiếu với bài test quét chữ tiếng Anh của 3T Office |
| Tài sản thương hiệu 3T | `assets/brand_*` , `scripts/build_installer_assets.py` | Logo 3T đã dùng cho bộ cài (branding/3t) |

## Khi phát hành thương mại (gói bản quyền thường / vĩnh viễn)
| Mảng | Ở 3T Reader |
|---|---|
| Kích hoạt bản quyền, dùng thử, dấu vân tay máy, lưu khoá trong Windows Credential Manager, xác minh token | `packages/license_client/` (client, trial, fingerprint, credential_manager, keychain, token_verifier, vps_client) + `license_dialog.py` |
| Máy chủ bản quyền / đơn hàng trên VPS | `vps_license_service.py`, `vps_order_service.py`, `vps_auth_limits.py`, `vps_models.py`, `vps_schemas.py` |
| Cập nhật dạng vá qua VPS | `packages/updater/` (base_version, delta_runtime, update_client), `deploy_delta.py` — so với updater có chữ ký của 3T Office để thống nhất một cơ chế cho cả hai sản phẩm |
| Hồ sơ đăng ký quyền tác giả phần mềm | `scripts/export_source_code_for_copyright.py` |
