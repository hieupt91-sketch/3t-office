/**
 * Trợ lý 3T AI — Nhập liệu bằng giọng nói (Voice Input / Speech-to-Text)
 * Dùng Web Speech API (SpeechRecognition) — API chuẩn có sẵn trong Chromium/Edge.
 * WebView2 (pywebview Windows) dùng Chromium engine → SpeechRecognition khả dụng
 * khi chạy qua HTTP (localhost), KHÔNG cần thêm dependency.
 */

const SpeechRecognition = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

let recognition = null;
let isListening = false;
let statusCallback = null;
let resultCallback = null;
let endCallback = null;
let errorCallback = null;

/**
 * Kiểm tra SpeechRecognition có khả dụng không.
 * @returns {boolean}
 */
export function isVoiceInputSupported() {
  return Boolean(SpeechRecognition);
}

/**
 * Bắt đầu lắng nghe giọng nói.
 * @param {Object} options
 * @param {function(string): void} options.onStatus - Gọi khi trạng thái thay đổi (đang nghe, đã dừng, lỗi...)
 * @param {function(string): void} options.onResult - Gọi khi nhận được kết quả nhận dạng (text)
 * @param {function(): void} options.onEnd - Gọi khi ngừng nghe (tự nhiên hoặc bị dừng)
 * @param {function(string): void} options.onError - Gọi khi có lỗi
 * @param {string} [options.lang="vi-VN"] - Ngôn ngữ nhận dạng
 */
export function startVoiceInput(options = {}) {
  if (!SpeechRecognition) {
    const msg = "Trình duyệt hiện tại không hỗ trợ nhận dạng giọng nói. Vui lòng dùng Microsoft Edge hoặc Google Chrome.";
    if (options.onError) options.onError(msg);
    return;
  }

  if (isListening) {
    if (options.onStatus) options.onStatus("Đang lắng nghe — vui lòng nói...");
    return;
  }

  statusCallback = options.onStatus || null;
  resultCallback = options.onResult || null;
  endCallback = options.onEnd || null;
  errorCallback = options.onError || null;

  recognition = new SpeechRecognition();
  recognition.lang = options.lang || "vi-VN";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true;
    if (statusCallback) statusCallback("Đang lắng nghe — hãy nói vào microphone...");
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    if (finalTranscript && resultCallback) {
      resultCallback(finalTranscript.trim());
    }
    if (interimTranscript && statusCallback) {
      statusCallback(`Đang nghe: "${interimTranscript}"`);
    }
  };

  recognition.onerror = (event) => {
    isListening = false;
    let msg;
    switch (event.error) {
      case "no-speech":
        msg = "Không nhận diện được giọng nói. Vui lòng thử lại.";
        break;
      case "audio-capture":
        msg = "Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập microphone trong cài đặt hệ thống.";
        break;
      case "not-allowed":
        msg = "Quyền truy cập microphone bị từ chối. Vui lòng cấp quyền microphone cho ứng dụng.";
        break;
      case "network":
        msg = "Lỗi mạng khi nhận dạng giọng nói. Kiểm tra kết nối internet.";
        break;
      case "aborted":
        msg = "Đã dừng nhận dạng giọng nói.";
        break;
      default:
        msg = `Lỗi nhận dạng giọng nói: ${event.error}`;
    }
    if (errorCallback) errorCallback(msg);
    if (endCallback) endCallback();
  };

  recognition.onend = () => {
    isListening = false;
    if (statusCallback) statusCallback("Đã dừng lắng nghe.");
    if (endCallback) endCallback();
  };

  try {
    recognition.start();
  } catch (err) {
    isListening = false;
    const msg = `Không thể khởi động nhận dạng giọng nói: ${err.message}`;
    if (errorCallback) errorCallback(msg);
    if (endCallback) endCallback();
  }
}

/**
 * Dừng lắng nghe giọng nói.
 */
export function stopVoiceInput() {
  if (recognition && isListening) {
    recognition.stop();
  }
}

/**
 * Trả về trạng thái hiện tại.
 * @returns {boolean}
 */
export function isVoiceInputActive() {
  return isListening;
}
