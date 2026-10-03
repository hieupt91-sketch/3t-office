/**
 * 3T Office — Kịch bản Đặt mua & Cấp mã bản quyền trực tuyến
 * Hỗ trợ đơn hàng 0 VNĐ (cấp key tự động tức thì) và đơn hàng thanh toán chuyển khoản VietQR.
 */

document.addEventListener("DOMContentLoaded", () => {
  initShopCheckout();
});

function initShopCheckout() {
  const priceEl = document.getElementById("plan-perpetual-price");
  const priceNoteEl = document.getElementById("plan-perpetual-note");
  const btnBuyPerpetual = document.getElementById("btn-buy-perpetual");

  const modalCheckout = document.getElementById("modal-checkout");
  const btnCloseCheckout = document.getElementById("btn-close-checkout");
  const checkoutAlert = document.getElementById("checkout-alert");

  const formCheckout = document.getElementById("form-checkout");
  const inputCustName = document.getElementById("checkout-name");
  const inputCustEmail = document.getElementById("checkout-email");
  const inputCustPhone = document.getElementById("checkout-phone");
  const inputCustOrg = document.getElementById("checkout-org");
  const inputCustTax = document.getElementById("checkout-tax");
  const inputQuantity = document.getElementById("checkout-quantity");
  const checkoutTotalEl = document.getElementById("checkout-total-amount");

  const viewForm = document.getElementById("checkout-view-form");
  const viewVietQR = document.getElementById("checkout-view-vietqr");
  const viewSuccess = document.getElementById("checkout-view-success");

  const qrOrderCodeEl = document.getElementById("qr-order-code");
  const qrAmountEl = document.getElementById("qr-amount");
  const qrBankNameEl = document.getElementById("qr-bank-name");
  const qrAccountNoEl = document.getElementById("qr-account-no");
  const qrAccountNameEl = document.getElementById("qr-account-name");
  const qrImageEl = document.getElementById("qr-image");
  const qrTransferContentEl = document.getElementById("qr-transfer-content");

  const successKeyListEl = document.getElementById("success-key-list");
  const btnCopySuccessKey = document.getElementById("btn-copy-success-key");

  let currentPlanCode = "perpetual";
  let unitPriceVnd = 0;
  let pollTimer = null;
  let activeOrderCode = null;

  function showAlert(msg, type = "danger") {
    if (!checkoutAlert) return;
    checkoutAlert.className = `alert alert-${type}`;
    checkoutAlert.textContent = msg;
    checkoutAlert.style.display = "block";
  }

  function hideAlert() {
    if (checkoutAlert) checkoutAlert.style.display = "none";
  }

  // 1. Tải bảng giá từ máy chủ
  async function loadPlans() {
    try {
      const res = await fetch("/api/v1/shop/plans");
      if (res.ok) {
        const data = await res.json();
        const plans = data.plans || [];
        const perpetual = plans.find((p) => p.code === "perpetual");
        if (perpetual) {
          unitPriceVnd = perpetual.price_vnd || 0;
          if (priceEl) {
            priceEl.innerHTML = `${unitPriceVnd.toLocaleString("vi-VN")} đ <span style="font-size: 0.9rem; font-weight: normal; color: var(--text-dim);">/ máy</span>`;
          }
          if (priceNoteEl) {
            priceNoteEl.textContent = unitPriceVnd === 0 ? "(Chương trình thử nghiệm nội bộ 0 đ)" : "(Giá đã bao gồm 1 năm cập nhật)";
          }
          updateTotalAmount();
        }
      }
    } catch (_) {
      // Giữ mặc định nếu máy chủ chưa bật hoặc offline
    }
  }

  function updateTotalAmount() {
    if (!checkoutTotalEl || !inputQuantity) return;
    const qty = parseInt(inputQuantity.value, 10) || 1;
    const total = qty * unitPriceVnd;
    checkoutTotalEl.textContent = `${total.toLocaleString("vi-VN")} VNĐ`;
  }

  if (inputQuantity) {
    inputQuantity.addEventListener("input", updateTotalAmount);
  }

  // Mở modal đặt mua
  if (btnBuyPerpetual) {
    btnBuyPerpetual.addEventListener("click", () => {
      hideAlert();
      if (viewForm) viewForm.style.display = "block";
      if (viewVietQR) viewVietQR.style.display = "none";
      if (viewSuccess) viewSuccess.style.display = "none";
      updateTotalAmount();
      if (modalCheckout) modalCheckout.style.display = "flex";
    });
  }

  if (btnCloseCheckout) {
    btnCloseCheckout.addEventListener("click", () => {
      if (pollTimer) clearInterval(pollTimer);
      if (modalCheckout) modalCheckout.style.display = "none";
    });
  }

  // 2. Xử lý đặt mua bản quyền
  if (formCheckout) {
    formCheckout.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      const name = inputCustName.value.trim();
      const email = inputCustEmail.value.trim().toLowerCase();
      const phone = inputCustPhone.value.trim();
      const company = inputCustOrg.value.trim();
      const tax_code = inputCustTax.value.trim();
      const quantity = parseInt(inputQuantity.value, 10) || 1;

      if (!name || !email) {
        showAlert("Vui lòng điền họ tên và email nhận bản quyền.");
        return;
      }

      const submitBtn = formCheckout.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang xử lý...";

      try {
        const res = await fetch("/api/v1/shop/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: currentPlanCode,
            quantity,
            customer: { name, email, phone, company, tax_code },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          showAlert(data.detail || "Không thể tạo đơn hàng. Vui lòng thử lại.");
          submitBtn.disabled = false;
          submitBtn.textContent = "Xác nhận đặt mua";
          return;
        }

        activeOrderCode = data.order_code;

        // Trường hợp 1: Đơn hàng 0 VNĐ -> Hoàn tất tức thì và cấp key ngay
        if (data.status === "fulfilled" && data.keys && data.keys.length > 0) {
          showSuccessView(data.keys, data.order_code);
          return;
        }

        // Trường hợp 2: Đơn hàng có tiền -> Chuyển sang màn hình chuyển khoản VietQR
        if (data.payment_instruction) {
          showVietQRView(data.order_code, data.amount_vnd, data.payment_instruction);
          startOrderPolling(data.order_code);
          return;
        }

        // Trường hợp khác:
        showAlert("Đơn hàng đã được ghi nhận. Mã đơn: " + data.order_code, "info");
      } catch (err) {
        showAlert("Lỗi khi kết nối tới máy chủ thanh toán.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Xác nhận đặt mua";
      }
    });
  }

  // 3. Hiển thị màn hình chuyển khoản VietQR và tự động kiểm tra trạng thái
  function showVietQRView(orderCode, amountVnd, instruction) {
    if (viewForm) viewForm.style.display = "none";
    if (viewVietQR) viewVietQR.style.display = "block";
    if (viewSuccess) viewSuccess.style.display = "none";

    if (qrOrderCodeEl) qrOrderCodeEl.textContent = orderCode;
    if (qrAmountEl) qrAmountEl.textContent = `${(amountVnd || 0).toLocaleString("vi-VN")} đ`;
    if (qrBankNameEl) qrBankNameEl.textContent = instruction.bank_name || "Ngân hàng Thương mại";
    if (qrAccountNoEl) qrAccountNoEl.textContent = instruction.account_no || "—";
    if (qrAccountNameEl) qrAccountNameEl.textContent = instruction.account_name || "3T COMPUTER";
    if (qrTransferContentEl) qrTransferContentEl.textContent = instruction.content || orderCode;

    if (qrImageEl && instruction.vietqr_url) {
      qrImageEl.src = instruction.vietqr_url;
      qrImageEl.style.display = "block";
    }
  }

  function startOrderPolling(orderCode) {
    if (pollTimer) clearInterval(pollTimer);

    pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/shop/orders/${orderCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "fulfilled" && data.keys && data.keys.length > 0) {
            clearInterval(pollTimer);
            showSuccessView(data.keys, orderCode);
          }
        }
      } catch (_) {}
    }, 3000);
  }

  // 4. Hiển thị màn hình cấp key thành công
  function showSuccessView(keys, orderCode) {
    if (viewForm) viewForm.style.display = "none";
    if (viewVietQR) viewVietQR.style.display = "none";
    if (viewSuccess) viewSuccess.style.display = "block";

    if (successKeyListEl) {
      successKeyListEl.innerHTML = keys.map((k) => `
        <div style="padding: 10px 14px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 1.1rem; font-weight: 700; color: var(--brand-blue); word-break: break-all; margin-bottom: 8px;">
          ${k}
        </div>
      `).join("");
    }

    if (btnCopySuccessKey) {
      btnCopySuccessKey.onclick = () => {
        const allKeys = keys.join("\n");
        navigator.clipboard.writeText(allKeys).then(() => {
          btnCopySuccessKey.textContent = "Đã sao chép!";
          setTimeout(() => (btnCopySuccessKey.textContent = "Sao chép toàn bộ mã"), 2000);
        });
      };
    }
  }

  // Khởi chạy
  loadPlans();
}
