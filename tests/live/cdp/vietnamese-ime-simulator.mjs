/**
 * Vietnamese IME Simulation Engine for Automated CDP Testing (Telex and VNI)
 * Accurately replicates Unikey/EVKey behavior:
 * - Emits normal character key events
 * - On trigger keys (modifiers/tones): emits N Backspaces followed by replacement string
 * - Supports Telex and VNI input methods
 * - Supports Unicode dựng sẵn (NFC) and Unicode tổ hợp (NFD)
 * - Supports Windows built-in Vietnamese IME composition events
 */

export const VIETNAMESE_TEST_PHRASES = [
  "Cộng hòa xã hội chủ nghĩa Việt Nam",
  "Độc lập - Tự do - Hạnh phúc",
  "Nguyễn Thị Thùy Dương",
  "Trường Mầm non Hoa Hồng",
  "tiếng Việt có dấu đúng chuẩn",
  "31 tháng 12 năm 2026",
  "Ủy ban Nhân dân Thành phố Hà Nội",
  "Quyết định ban hành tiêu chuẩn",
  "Trần Văn Nam",
  "Phạm Quốc Tuấn",
  "Vũ Hoàng My",
  "Đặng Đình Khôi",
  "Bộ Thông tin và Truyền thông",
  "Viện Hàn lâm Khoa học và Công nghệ",
  "Nghị định số 30/2020/NĐ-CP",
  "Căn cứ Luật Tổ chức chính quyền địa phương",
  "Kính gửi Ban Giám đốc",
  "Biên bản họp hội đồng quản trị",
  "Báo cáo tài chính quý tư năm 2026",
  "Tổng công ty Đầu tư và Phát triển",
  "05 tháng 03 năm 2020",
  "Số: 26/QĐ-UBND",
  "Điều 1: Phê duyệt kế hoạch phát triển",
  "Tỷ lệ tăng trưởng đạt 15,8%",
  "Bảng dự toán kinh phí phát triển",
  "Đơn giá và Thành tiền theo hợp đồng",
  "Doanh thu thuần và Lợi nhuận trước thuế",
  "Khấu hao tài sản cố định quý một",
  "Khuấy đều bột gạo làm bánh cuốn",
  "Thuyền buồm lướt sóng ra khơi",
  "Nguyện vọng tha thiết của tập thể",
  "Quả quýt ngọt ngào mọng nước",
  "Khúc khuỷu quanh co đường đèo",
  "Chim én liệng bay giữa trời xanh",
  "Nước biếc non xanh hữu tình non nước",
  "Văn phòng hiện đại tiện ích tối ưu",
  "Chữ viết trang trọng chuẩn mực văn bản",
  "Kỹ thuật gõ tiếng Việt mượt mà",
  "Hồ sơ công chứng chứng thực hợp lệ",
  "Ngân hàng Thương mại Cổ phần Ngoại thương",
  "Đoàn kết tương thân tương ái giúp đỡ",
  "Kính chúc quý khách an khang thịnh vượng",

  // Uppercase phrases for stress testing
  "ĐỘC LẬP - TỰ DO - HẠNH PHÚC",
  "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
  "HÀ NỘI THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG",
  "HỒ CHÍ MINH THÀNH PHỐ LỚN NHẤT VIỆT NAM",
  "BỘ GIAO THÔNG VẬN TẢI",

  // Additional phrases for complete vowel+tone coverage
  "Máy tính xách tay Dell 15.6 inch",
  "Số điện thoại 0987.654.321",
  "Địa chỉ: 123 đường Láng, phường Tràng An, quận Hoàng Mai, Hà Nội",
  "Ngày 01/01/2026 - Ngày đầu năm mới",
  "Tiền tệ: 1.000.000 đồng (một triệu đồng)",
  "Trọng lượng: 500 gram, 2.5 kg",
  "Kích thước: 20cm x 30cm x 5cm",
  "Mã số thuế: 0101234567",
  "Số tài khoản: 1234567890 tại Ngân hàng Vietcombank",
  "Email: nguyen.van.a@company.com.vn",

  // Vowel + all 5 tones coverage (a, ă, â, e, ê, i, o, ô, ơ, u, ư, y)
  "Bà mẹ già đi chợ mua rau củ quả",
  "Ông bố già ngồi sân phơi nắng",
  "Cháu bé út ếch nhảy suối",
  "Cô gái xinh đẹp mặc áo dài",
  "Anh chàng mạnh khỏe đánh bóng đá",
  "Mưa rơi tầm tã trên mái ngói",
  "Nắng vàng ươm chiếu khắp phố",
  "Gió lạnh về từ phương Bắc",
  "Sương mù bao trùm thành phố",
  "Sao Hỏa lấp lánh giữa trời đêm",

  // Administrative/legal phrases
  "Thông tư 01/2026/TT-BTC hướng dẫn mới",
  "Quyết định 123/QĐ-UBND ngày 15/06/2026",
  "Chỉ thị 05/CT-TTg về chuyển đổi số",
  "Nghị quyết 01/NQ-HĐND khóa họp thường niên",
  "Bản vẽ kỹ thuật đồ án xây dựng cầu",

  // Financial/accounting phrases
  "Chi phí sản xuất đạt 2.5 tỷ đồng",
  "Doanh thu thuần quý IV năm 2026",
  "Lãi suất cho vay ưu đãi 6.5%/năm",
  "Tỷ giá USD/VND: 24.500 đồng",
  "Chứng khoán VN-Index đạt 1.250 điểm"
];

// Map of Vietnamese characters to { base, mod, tone }
// tone: 0: none, 1: sắc, 2: huyền, 3: hỏi, 4: ngã, 5: nặng
const CHAR_MAP = {};

function registerChar(char, base, mod, tone) {
  CHAR_MAP[char] = { base, mod, tone };
}

// a
registerChar("a", "a", "", 0);
registerChar("á", "a", "", 1);
registerChar("à", "a", "", 2);
registerChar("ả", "a", "", 3);
registerChar("ã", "a", "", 4);
registerChar("ạ", "a", "", 5);
registerChar("ă", "a", "w", 0);
registerChar("ắ", "a", "w", 1);
registerChar("ằ", "a", "w", 2);
registerChar("ẳ", "a", "w", 3);
registerChar("ẵ", "a", "w", 4);
registerChar("ặ", "a", "w", 5);
registerChar("â", "a", "a", 0);
registerChar("ấ", "a", "a", 1);
registerChar("ầ", "a", "a", 2);
registerChar("ẩ", "a", "a", 3);
registerChar("ẫ", "a", "a", 4);
registerChar("ậ", "a", "a", 5);

// A
registerChar("A", "A", "", 0);
registerChar("Á", "A", "", 1);
registerChar("À", "A", "", 2);
registerChar("Ả", "A", "", 3);
registerChar("Ã", "A", "", 4);
registerChar("Ạ", "A", "", 5);
registerChar("Ă", "A", "w", 0);
registerChar("Ắ", "A", "w", 1);
registerChar("Ằ", "A", "w", 2);
registerChar("Ẳ", "A", "w", 3);
registerChar("Ẵ", "A", "w", 4);
registerChar("Ặ", "A", "w", 5);
registerChar("Â", "A", "a", 0);
registerChar("Ấ", "A", "a", 1);
registerChar("Ầ", "A", "a", 2);
registerChar("Ẩ", "A", "a", 3);
registerChar("Ẫ", "A", "a", 4);
registerChar("Ậ", "A", "a", 5);

// e
registerChar("e", "e", "", 0);
registerChar("é", "e", "", 1);
registerChar("è", "e", "", 2);
registerChar("ẻ", "e", "", 3);
registerChar("ẽ", "e", "", 4);
registerChar("ẹ", "e", "", 5);
registerChar("ê", "e", "e", 0);
registerChar("ế", "e", "e", 1);
registerChar("ề", "e", "e", 2);
registerChar("ể", "e", "e", 3);
registerChar("ễ", "e", "e", 4);
registerChar("ệ", "e", "e", 5);

// E
registerChar("E", "E", "", 0);
registerChar("É", "E", "", 1);
registerChar("È", "E", "", 2);
registerChar("Ẻ", "E", "", 3);
registerChar("Ẽ", "E", "", 4);
registerChar("Ẹ", "E", "", 5);
registerChar("Ê", "E", "e", 0);
registerChar("Ế", "E", "e", 1);
registerChar("Ề", "E", "e", 2);
registerChar("Ể", "E", "e", 3);
registerChar("Ễ", "E", "e", 4);
registerChar("Ệ", "E", "e", 5);

// i
registerChar("i", "i", "", 0);
registerChar("í", "i", "", 1);
registerChar("ì", "i", "", 2);
registerChar("ỉ", "i", "", 3);
registerChar("ĩ", "i", "", 4);
registerChar("ị", "i", "", 5);

// I
registerChar("I", "I", "", 0);
registerChar("Í", "I", "", 1);
registerChar("Ì", "I", "", 2);
registerChar("Ỉ", "I", "", 3);
registerChar("Ĩ", "I", "", 4);
registerChar("Ị", "I", "", 5);

// o
registerChar("o", "o", "", 0);
registerChar("ó", "o", "", 1);
registerChar("ò", "o", "", 2);
registerChar("ỏ", "o", "", 3);
registerChar("õ", "o", "", 4);
registerChar("ọ", "o", "", 5);
registerChar("ô", "o", "o", 0);
registerChar("ố", "o", "o", 1);
registerChar("ồ", "o", "o", 2);
registerChar("ổ", "o", "o", 3);
registerChar("ỗ", "o", "o", 4);
registerChar("ộ", "o", "o", 5);
registerChar("ơ", "o", "w", 0);
registerChar("ớ", "o", "w", 1);
registerChar("ờ", "o", "w", 2);
registerChar("ở", "o", "w", 3);
registerChar("ỡ", "o", "w", 4);
registerChar("ợ", "o", "w", 5);

// O
registerChar("O", "O", "", 0);
registerChar("Ó", "O", "", 1);
registerChar("Ò", "O", "", 2);
registerChar("Ỏ", "O", "", 3);
registerChar("Õ", "O", "", 4);
registerChar("Ọ", "O", "", 5);
registerChar("Ô", "O", "o", 0);
registerChar("Ố", "O", "o", 1);
registerChar("Ồ", "O", "o", 2);
registerChar("Ổ", "O", "o", 3);
registerChar("Ỗ", "O", "o", 4);
registerChar("Ộ", "O", "o", 5);
registerChar("Ơ", "O", "w", 0);
registerChar("Ớ", "O", "w", 1);
registerChar("Ờ", "O", "w", 2);
registerChar("Ở", "O", "w", 3);
registerChar("Ỡ", "O", "w", 4);
registerChar("Ợ", "O", "w", 5);

// u
registerChar("u", "u", "", 0);
registerChar("ú", "u", "", 1);
registerChar("ù", "u", "", 2);
registerChar("ủ", "u", "", 3);
registerChar("ũ", "u", "", 4);
registerChar("ụ", "u", "", 5);
registerChar("ư", "u", "w", 0);
registerChar("ứ", "u", "w", 1);
registerChar("ừ", "u", "w", 2);
registerChar("ử", "u", "w", 3);
registerChar("ữ", "u", "w", 4);
registerChar("ự", "u", "w", 5);

// U
registerChar("U", "U", "", 0);
registerChar("Ú", "U", "", 1);
registerChar("Ù", "U", "", 2);
registerChar("Ủ", "U", "", 3);
registerChar("Ũ", "U", "", 4);
registerChar("Ụ", "U", "", 5);
registerChar("Ư", "U", "w", 0);
registerChar("Ứ", "U", "w", 1);
registerChar("Ừ", "U", "w", 2);
registerChar("Ử", "U", "w", 3);
registerChar("Ữ", "U", "w", 4);
registerChar("Ự", "U", "w", 5);

// y
registerChar("y", "y", "", 0);
registerChar("ý", "y", "", 1);
registerChar("ỳ", "y", "", 2);
registerChar("ỷ", "y", "", 3);
registerChar("ỹ", "y", "", 4);
registerChar("ỵ", "y", "", 5);

// Y
registerChar("Y", "Y", "", 0);
registerChar("Ý", "Y", "", 1);
registerChar("Ỳ", "Y", "", 2);
registerChar("Ỷ", "Y", "", 3);
registerChar("Ỹ", "Y", "", 4);
registerChar("Ỵ", "Y", "", 5);

// d / D
registerChar("đ", "d", "d", 0);
registerChar("Đ", "D", "d", 0);

const TELEX_TONES = { 1: "s", 2: "f", 3: "r", 4: "x", 5: "j" };
const VNI_TONES = { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5" };
const VNI_MODS = { a: "6", e: "6", o: "6", w: "7", d: "9" };

/**
 * Builds the intermediate vowel with modifier (without tone)
 */
function vowelWithMod(base, mod) {
  if (base.toLowerCase() === "d" && mod === "d") return base === "D" ? "Đ" : "đ";
  if (!mod) return base;
  const isUpper = base === base.toUpperCase();
  if (base.toLowerCase() === "a") {
    if (mod === "a") return isUpper ? "Â" : "â";
    if (mod === "w") return isUpper ? "Ă" : "ă";
  }
  if (base.toLowerCase() === "e") return isUpper ? "Ê" : "ê";
  if (base.toLowerCase() === "o") {
    if (mod === "o") return isUpper ? "Ô" : "ô";
    if (mod === "w") return isUpper ? "Ơ" : "ơ";
  }
  if (base.toLowerCase() === "u") return isUpper ? "Ư" : "ư";
  return base;
}

/**
 * Decomposes a word into typing events in Telex or VNI.
 * Simulates the exact Backspace + insert replacement burst that Unikey/EVKey sends.
 * @param {string} word - Vietnamese word (e.g. "Việt", "Độc", "Hà", "2026")
 * @param {{ mode?: "telex"|"vni", encoding?: "nfc"|"nfd" }} options
 * @returns {Array<{ action: "key"|"backspace"|"insert", [key]: any }>}
 */
export function wordToImeEvents(word, options = {}) {
  const mode = options.mode || "telex";
  const encoding = options.encoding || "nfc";
  const events = [];
  let buffer = "";

  const chars = [...word.normalize("NFC")];
  // Analyze characters in the word
  const decomposed = chars.map(ch => CHAR_MAP[ch] || { base: ch, mod: "", tone: 0 });

  // Check if any character has a tone
  let toneToApply = 0;
  let toneCharIndex = -1;
  for (let i = 0; i < decomposed.length; i++) {
    if (decomposed[i].tone > 0) {
      toneToApply = decomposed[i].tone;
      toneCharIndex = i;
      break;
    }
  }

  // Type characters one by one
  for (let i = 0; i < decomposed.length; i++) {
    const { base, mod } = decomposed[i];
    // 1. User types the base letter
    events.push({ action: "key", char: base });
    buffer += base;

    // 2. If letter has a modifier (e.g. â, ê, ô, ơ, ư, ă, đ)
    if (mod) {
      let modKey = mod;
      if (mode === "vni") {
        if (base.toLowerCase() === "a" && mod === "w") modKey = "8";
        else if (mod === "w") modKey = "7";
        else if (mod === "a" || mod === "e" || mod === "o") modKey = "6";
        else if (mod === "d") modKey = "9";
      }

      // Check special pair: "uo" + "w" -> "ươ"
      if (i > 0 && decomposed[i - 1].base.toLowerCase() === "u" && base.toLowerCase() === "o" && mod === "w") {
        // Double horn pair: u + o + w -> ươ
        const isUpperU = decomposed[i - 1].base === decomposed[i - 1].base.toUpperCase();
        const isUpperO = base === base.toUpperCase();
        const rep = (isUpperU ? "Ư" : "ư") + (isUpperO ? "Ơ" : "ơ");
        events.push({ action: "backspace", count: 2 });
        events.push({ action: "insert", text: rep });
        buffer = buffer.slice(0, -2) + rep;
      } else {
        const rep = vowelWithMod(base, mod);
        events.push({ action: "backspace", count: 1 });
        events.push({ action: "insert", text: rep });
        buffer = buffer.slice(0, -1) + rep;
      }
    }
  }

  // 3. Apply tone key at the end of syllable if word has tone
  if (toneToApply > 0 && toneCharIndex >= 0) {
    const toneKey = mode === "vni" ? VNI_TONES[toneToApply] : TELEX_TONES[toneToApply];
    // Distance from caret (at end of buffer) to the target character
    const targetChar = chars[toneCharIndex];
    const encodedTarget = encoding === "nfd" ? targetChar.normalize("NFD") : targetChar.normalize("NFC");
    const trailingChars = chars.slice(toneCharIndex + 1).map(c => encoding === "nfd" ? c.normalize("NFD") : c.normalize("NFC")).join("");
    const backspaceCount = chars.length - toneCharIndex;
    const replacement = encodedTarget + trailingChars;

    events.push({ action: "backspace", count: backspaceCount });
    events.push({ action: "insert", text: replacement });
    buffer = chars.slice(0, toneCharIndex).join("") + replacement;
  }

  return events;
}

/**
 * Converts a full phrase into IME events including spaces and punctuation.
 * @param {string} phrase
 * @param {{ mode?: "telex"|"vni", encoding?: "nfc"|"nfd" }} options
 */
export function phraseToImeEvents(phrase, options = {}) {
  const events = [];
  // Split into tokens: words vs non-words (spaces, punctuation)
  const regex = /([\p{L}\p{M}]+|[^\p{L}\p{M}]+)/gu;
  const tokens = phrase.match(regex) || [phrase];

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      for (const sp of token) events.push({ action: "key", char: sp });
    } else if (/^[\p{L}\p{M}]+$/u.test(token)) {
      events.push(...wordToImeEvents(token, options));
    } else {
      for (const ch of token) events.push({ action: "key", char: ch });
    }
  }
  return events;
}

/**
 * Simulates an IME event stream against a plain JavaScript string buffer
 * to deterministically verify that the event sequence generates the exact expected text.
 */
export function simulateImeLocally(events) {
  let text = "";
  for (const ev of events) {
    if (ev.action === "key") {
      text += ev.char;
    } else if (ev.action === "backspace") {
      text = text.slice(0, Math.max(0, text.length - ev.count));
    } else if (ev.action === "insert") {
      text += ev.text;
    }
  }
  return text.normalize("NFC");
}

/**
 * Replays IME events over Chrome DevTools Protocol (CDP) into the currently focused element.
 * Respects delayMs between keystrokes.
 */
export async function replayImeEventsCdp(cdp, events, delayMs = 30) {
  for (const ev of events) {
    if (ev.action === "key") {
      const char = ev.char;
      const upper = char.toUpperCase();
      const code = char === " " ? "Space"
        : /^[A-Z]$/.test(upper) ? "Key" + upper
        : /^[0-9]$/.test(char) ? "Digit" + char
        : "";
      const keyCode = char === " " ? 32
        : /^[A-Z0-9]$/.test(upper) ? upper.charCodeAt(0)
        : char === "-" ? 189
        : char === ":" ? 186
        : char === "," ? 188
        : char === "." ? 190
        : char === "/" ? 191
        : char === "%" ? 53
        : 0;

      await cdp.send("Input.dispatchKeyEvent", {
        type: "keyDown", key: char, code, windowsVirtualKeyCode: keyCode,
        text: char, unmodifiedText: char
      });
      await cdp.send("Input.dispatchKeyEvent", {
        type: "keyUp", key: char, code, windowsVirtualKeyCode: keyCode
      });
    } else if (ev.action === "backspace") {
      for (let b = 0; b < ev.count; b++) {
        await cdp.send("Input.dispatchKeyEvent", {
          type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8
        });
        await cdp.send("Input.dispatchKeyEvent", {
          type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8
        });
        if (delayMs > 0 && delayMs < 10) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    } else if (ev.action === "insert") {
      await cdp.send("Input.insertText", { text: ev.text });
    }

    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

/**
 * Replays typing using Windows Built-in IME (TSF / composition events).
 */
export async function replayWindowsImeCompositionCdp(cdp, phrase, delayMs = 30) {
  const words = phrase.split(" ");
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Send composition progression
    for (let c = 1; c <= word.length; c++) {
      const partial = word.slice(0, c);
      await cdp.send("Input.imeSetComposition", {
        text: partial,
        selectionStart: partial.length,
        selectionEnd: partial.length
      });
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    }
    // Commit the composition
    await cdp.send("Input.insertText", { text: word });
    if (i < words.length - 1) {
      await cdp.send("Input.dispatchKeyEvent", {
        type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32,
        text: " ", unmodifiedText: " "
      });
      await cdp.send("Input.dispatchKeyEvent", {
        type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32
      });
    }
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }
}
