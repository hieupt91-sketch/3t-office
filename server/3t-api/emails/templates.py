"""Mau email tieng Viet cho he thong 3T Office."""

from __future__ import annotations

from typing import Any

PORTAL_URL_DEFAULT = "https://office.3tcomputer.com/tai-khoan/"
SUPPORT_EMAIL = "hotro@3tcomputer.com"
COMPANY_NAME = "3T Office — Công ty TNHH Đầu tư Công nghệ và Xây lắp 3T"


def render_template(template_name: str, data: dict[str, Any], raw_keys: list[str] | None = None) -> tuple[str, str]:
    """Ket xuat tieu de (subject) va noi dung van ban (body) cua email."""
    portal_url = data.get("portal_url", PORTAL_URL_DEFAULT)

    if template_name == "portal_login_code":
        code = data.get("code", "")
        expires_minutes = data.get("expires_minutes", 15)
        subject = f"[{code}] Mã xác nhận đăng nhập Cổng khách hàng 3T Office"
        body = f"""Kính gửi Quý khách,

Mã xác thực đăng nhập Cổng khách hàng 3T Office của Quý khách là:

    {code}

Mã này có hiệu lực trong {expires_minutes} phút và chỉ sử dụng một lần.
Nếu Quý khách không yêu cầu đăng nhập, vui lòng bỏ qua thư này.

Trân trọng,
{COMPANY_NAME}
Hỗ trợ: {SUPPORT_EMAIL}
"""
        return subject, body

    elif template_name == "order_confirmation":
        order_code = data.get("order_code", "")
        amount_vnd = f"{data.get('amount_vnd', 0):,}".replace(",", ".")
        transfer_content = data.get("transfer_content", order_code)
        bank_name = data.get("bank_name", "MB (Ngân hàng Quân đội)")
        bank_account = data.get("bank_account", "3101126773")
        account_holder = data.get("account_holder", "CONG TY TNHH DT CN VA XL 3T")
        expires_at = data.get("expires_at", "24 giờ")

        subject = f"Xác nhận đơn hàng #{order_code} — 3T Office"
        body = f"""Kính gửi Quý khách,

Cảm ơn Quý khách đã đặt mua bản quyền 3T Office.
Thông tin đơn hàng #{order_code}:
- Gói dịch vụ: {data.get('plan_name', 'Bản quyền vĩnh viễn')}
- Số lượng key: {data.get('quantity', 1)}
- Tổng thanh toán: {amount_vnd} VND

HƯỚNG DẪN THANH TOÁN CHUYỂN KHOẢN:
- Ngân hàng: {bank_name}
- Số tài khoản: {bank_account}
- Chủ tài khoản: {account_holder}
- Số tiền: {amount_vnd} VND
- Nội dung chuyển khoản: {transfer_content} (Bắt buộc ghi chính xác mã đơn hàng)

Thời hạn thanh toán: {expires_at}. Sau khi hệ thống nhận được chuyển khoản, mã bản quyền sẽ được tự động kích hoạt và gửi tới email của Quý khách ngay lập tức.

Trân trọng,
{COMPANY_NAME}
"""
        return subject, body

    elif template_name == "order_fulfilled":
        order_code = data.get("order_code", "")
        keys_display = ""
        if raw_keys:
            keys_display = "\n".join(f"    MÃ BẢN QUYỀN: {k}" for k in raw_keys)
        else:
            hints = data.get("key_hints", [])
            keys_display = "\n".join(f"    MÃ BẢN QUYỀN (Đuôi mã): …{h}" for h in hints)

        subject = f"Bàn giao mã bản quyền 3T Office — Đơn hàng #{order_code}"
        body = f"""Kính gửi Quý khách,

Hệ thống 3T Office đã nhận đủ thanh toán cho đơn hàng #{order_code}.
Dưới đây là thông tin mã bản quyền của Quý khách:

{keys_display}

HƯỚNG DẪN KÍCH HOẠT 3 BƯỚC:
1. Mở ứng dụng 3T Office (Doc, Sheet hoặc Slide) trên máy tính của Quý khách.
2. Vào trình đơn: Tệp ▸ Tài khoản và bản quyền.
3. Bấm 'Nhập mã bản quyền', dán mã ở trên vào và bấm 'Kích hoạt'.

Sau khi kích hoạt, Quý khách có thể sử dụng bình thường ngoại tuyến không cần mạng Internet.
Quý khách có thể quản lý các thiết bị, gỡ máy hoặc kích hoạt ngoại tuyến tại Cổng khách hàng:
{portal_url}

Trân trọng,
{COMPANY_NAME}
Hỗ trợ kỹ thuật: {SUPPORT_EMAIL}
"""
        return subject, body

    elif template_name == "license_reissued":
        new_key_str = raw_keys[0] if raw_keys else f"…{data.get('new_hint', '')}"
        old_hint = data.get("old_hint", "")
        subject = "Cấp lại mã bản quyền mới — 3T Office"
        body = f"""Kính gửi Quý khách,

Mã bản quyền cũ (đuôi …{old_hint}) đã được thu hồi và thay thế bằng mã bản quyền mới:

    MÃ BẢN QUYỀN MỚI: {new_key_str}

Vui lòng nhập mã mới vào ứng dụng 3T Office theo hướng dẫn tại:
{portal_url}

Trân trọng,
{COMPANY_NAME}
"""
        return subject, body

    elif template_name == "license_revoked":
        hints = data.get("key_hints", [])
        reason = data.get("reason", "Yêu cầu hoàn tiền hoặc hủy đơn hàng")
        hints_str = ", ".join(f"…{h}" for h in hints)
        subject = "Thông báo thu hồi giấy phép bản quyền — 3T Office"
        body = f"""Kính gửi Quý khách,

Giấy phép bản quyền (mã {hints_str}) đã bị thu hồi trên hệ thống.
Lý do: {reason}

Nếu Quý khách có thắc mắc hoặc cần hỗ trợ, vui lòng phản hồi email này.

Trân trọng,
{COMPANY_NAME}
"""
        return subject, body

    else:
        subject = f"Thông báo từ {COMPANY_NAME}"
        body = f"Nội dung thông báo:\n{data}"
        return subject, body
