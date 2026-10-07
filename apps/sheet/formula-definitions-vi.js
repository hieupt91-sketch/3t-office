/**
 * VN Office — Vietnamese Formula Definitions & IntelliSense Catalog
 * Kho dữ liệu ngữ nghĩa, cú pháp tham số tiếng Việt và ví dụ thực tế cho các hàm bảng tính
 */

export function parseSyntaxParamNames(syntax) {
  if (!syntax) return [];
  const openParen = syntax.indexOf("(");
  const closeParen = syntax.lastIndexOf(")");
  if (openParen === -1 || closeParen === -1) return [];
  const inner = syntax.substring(openParen + 1, closeParen).trim();
  if (!inner) return [];
  return inner.split(",").map(s => s.trim()).filter(Boolean);
}

export const VI_FORMULA_CATALOG = [
  // ==========================================
  // 1. TRA CỨU & THAM CHIẾU (LOOKUP & REFERENCE)
  // ==========================================
  {
    name: "VLOOKUP",
    category: "Tra cứu",
    desc: "Tra theo cột đầu của bảng và trả về giá trị ở cột chỉ định.",
    syntax: "VLOOKUP(lookup_value, table_array, col_index, [range_lookup])",
    syntaxVi: "VLOOKUP(giá_trị_tìm, bảng_dữ_liệu, số_cột, [tìm_gần_đúng])",
    params: [
      { name: "giá_trị_tìm", desc: "Giá trị cần tìm kiếm ở cột đầu tiên bên trái của bảng dữ liệu." },
      { name: "bảng_dữ_liệu", desc: "Bảng hoặc vùng ô chứa cột tra cứu và cột lấy kết quả (ví dụ: A2:D100)." },
      { name: "số_cột", desc: "Số thứ tự của cột trong bảng lấy giá trị trả về, tính từ cột đầu tiên là 1." },
      { name: "[tìm_gần_đúng]", desc: "Tùy chọn kiểu tìm: 0 hoặc FALSE (chính xác tuyệt đối), 1 hoặc TRUE (gần đúng).", optional: true }
    ],
    example: "=VLOOKUP(A2; Bảng!A:C; 3; 0)"
  },
  {
    name: "HLOOKUP",
    category: "Tra cứu",
    desc: "Tra theo hàng đầu của bảng và trả về giá trị ở hàng chỉ định.",
    syntax: "HLOOKUP(lookup_value, table_array, row_index, [range_lookup])",
    syntaxVi: "HLOOKUP(giá_trị_tìm, bảng_dữ_liệu, số_hàng, [tìm_gần_đúng])",
    params: [
      { name: "giá_trị_tìm", desc: "Giá trị cần tìm kiếm ở hàng đầu tiên trên cùng của bảng dữ liệu." },
      { name: "bảng_dữ_liệu", desc: "Bảng hoặc vùng ô chứa hàng tra cứu và hàng lấy kết quả." },
      { name: "số_hàng", desc: "Số thứ tự của hàng trong bảng lấy giá trị trả về, tính từ hàng đầu tiên là 1." },
      { name: "[tìm_gần_đúng]", desc: "Tùy chọn kiểu tìm: 0 hoặc FALSE (chính xác), 1 hoặc TRUE (gần đúng).", optional: true }
    ],
    example: "=HLOOKUP(B1; A1:Z5; 3; 0)"
  },
  {
    name: "XLOOKUP",
    category: "Tra cứu",
    desc: "Tra cứu một giá trị trong một vùng và trả về giá trị tương ứng từ vùng khác.",
    syntax: "XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode])",
    syntaxVi: "XLOOKUP(giá_trị_tìm, mảng_tìm_kiếm, mảng_kết_quả, [nếu_không_thấy], [kiểu_khớp])",
    params: [
      { name: "giá_trị_tìm", desc: "Giá trị cần tìm kiếm." },
      { name: "mảng_tìm_kiếm", desc: "Mảng hoặc cột chứa giá trị cần tìm." },
      { name: "mảng_kết_quả", desc: "Mảng hoặc cột chứa giá trị cần lấy về tương ứng." },
      { name: "[nếu_không_thấy]", desc: "Giá trị trả về thay thế nếu không tìm thấy kết quả phù hợp.", optional: true },
      { name: "[kiểu_khớp]", desc: "Chế độ khớp: 0 (chính xác), -1 (khớp tiếp theo nhỏ hơn), 1 (khớp tiếp theo lớn hơn), 2 (ký tự đại diện).", optional: true }
    ],
    example: "=XLOOKUP(A2; DanhMuc!A:A; DanhMuc!C:C; \"Không thấy\"; 0)"
  },
  {
    name: "INDEX",
    category: "Tra cứu",
    desc: "Trả về giá trị tại hàng và cột trong vùng.",
    syntax: "INDEX(array, row_num, [col_num])",
    syntaxVi: "INDEX(vùng_dữ_liệu, số_hàng, [số_cột])",
    params: [
      { name: "vùng_dữ_liệu", desc: "Vùng ô hoặc mảng dữ liệu cần trích xuất giá trị." },
      { name: "số_hàng", desc: "Vị trí hàng trong vùng dữ liệu cần lấy giá trị." },
      { name: "[số_cột]", desc: "Vị trí cột trong vùng dữ liệu cần lấy giá trị (tùy chọn nếu mảng chỉ có 1 cột).", optional: true }
    ],
    example: "=INDEX(A2:D20; 3; 2)"
  },
  {
    name: "MATCH",
    category: "Tra cứu",
    desc: "Trả về vị trí tương đối của giá trị trong vùng.",
    syntax: "MATCH(lookup_value, lookup_array, [match_type])",
    syntaxVi: "MATCH(giá_trị_tìm, mảng_tìm_kiếm, [kiểu_khớp])",
    params: [
      { name: "giá_trị_tìm", desc: "Giá trị cần xác định vị trí tương đối trong mảng." },
      { name: "mảng_tìm_kiếm", desc: "Một hàng hoặc một cột ô liên tục chứa các giá trị tra cứu." },
      { name: "[kiểu_khớp]", desc: "Kiểu so khớp: 0 (chính xác), 1 (nhỏ hơn hoặc bằng, tăng dần), -1 (lớn hơn hoặc bằng, giảm dần).", optional: true }
    ],
    example: "=MATCH(A2; B2:B100; 0)"
  },
  {
    name: "LOOKUP",
    category: "Tra cứu",
    desc: "Tra cứu gần đúng trong một hàng hoặc cột đã sắp xếp.",
    syntax: "LOOKUP(lookup_value, lookup_vector, [result_vector])",
    syntaxVi: "LOOKUP(giá_trị_tìm, vectơ_tìm_kiếm, [vectơ_kết_quả])",
    params: [
      { name: "giá_trị_tìm", desc: "Giá trị cần tìm kiếm trong vectơ đã được sắp xếp tăng dần." },
      { name: "vectơ_tìm_kiếm", desc: "Vùng một hàng hoặc một cột chứa giá trị tra cứu." },
      { name: "[vectơ_kết_quả]", desc: "Vùng một hàng hoặc một cột chứa giá trị trả về tương ứng.", optional: true }
    ],
    example: "=LOOKUP(8.5; A2:A10; B2:B10)"
  },
  {
    name: "CHOOSE",
    category: "Tra cứu",
    desc: "Chọn một giá trị từ danh sách theo số thứ tự.",
    syntax: "CHOOSE(index_num, value1, [value2], ...)",
    syntaxVi: "CHOOSE(vị_trí_chọn, giá_trị1, [giá_trị2], ...)",
    params: [
      { name: "vị_trí_chọn", desc: "Số thứ tự chỉ định giá trị cần lấy trong danh sách (từ 1 đến 254)." },
      { name: "giá_trị1", desc: "Giá trị thứ nhất trả về khi vị_trí_chọn là 1." },
      { name: "[giá_trị2]", desc: "Giá trị thứ hai trở đi cần chọn.", optional: true },
      { name: "...", desc: "Các giá trị bổ sung tiếp theo.", optional: true }
    ],
    example: "=CHOOSE(2; \"Nhất\"; \"Nhì\"; \"Ba\")"
  },
  {
    name: "INDIRECT",
    category: "Tra cứu",
    desc: "Trả về giá trị của tham chiếu được tạo từ chuỗi văn bản.",
    syntax: "INDIRECT(ref_text)",
    syntaxVi: "INDIRECT(chuỗi_tham_chiếu)",
    params: [
      { name: "chuỗi_tham_chiếu", desc: "Chuỗi văn bản biểu diễn một địa chỉ ô hoặc tên vùng (ví dụ: \"A1\" hoặc \"B\" & 5)." }
    ],
    example: "=INDIRECT(\"B\" & 5)"
  },
  {
    name: "OFFSET",
    category: "Tra cứu",
    desc: "Trả về giá trị hoặc vùng được dịch chuyển từ một tham chiếu ban đầu.",
    syntax: "OFFSET(reference, rows, cols, [height], [width])",
    syntaxVi: "OFFSET(ô_gốc, số_hàng_dịch, số_cột_dịch, [chiều_cao], [chiều_rộng])",
    params: [
      { name: "ô_gốc", desc: "Ô hoặc vùng ô làm mốc xuất phát ban đầu." },
      { name: "số_hàng_dịch", desc: "Số hàng cần dịch chuyển lên (số âm) hoặc xuống (số dương) từ ô gốc." },
      { name: "số_cột_dịch", desc: "Số cột cần dịch chuyển sang trái (số âm) hoặc sang phải (số dương) từ ô gốc." },
      { name: "[chiều_cao]", desc: "Số hàng của vùng ô kết quả cần lấy (tùy chọn).", optional: true },
      { name: "[chiều_rộng]", desc: "Số cột của vùng ô kết quả cần lấy (tùy chọn).", optional: true }
    ],
    example: "=OFFSET(A1; 2; 3; 1; 1)"
  },
  {
    name: "COLUMNS",
    category: "Tra cứu",
    desc: "Trả về số lượng cột có trong một vùng ô hoặc mảng.",
    syntax: "COLUMNS(array)",
    syntaxVi: "COLUMNS(vùng_ô)",
    params: [
      { name: "vùng_ô", desc: "Vùng ô hoặc mảng cần đếm tổng số cột." }
    ],
    example: "=COLUMNS(A1:D10)"
  },
  {
    name: "ROWS",
    category: "Tra cứu",
    desc: "Trả về số lượng hàng có trong một vùng ô hoặc mảng.",
    syntax: "ROWS(array)",
    syntaxVi: "ROWS(vùng_ô)",
    params: [
      { name: "vùng_ô", desc: "Vùng ô hoặc mảng cần đếm tổng số hàng." }
    ],
    example: "=ROWS(A1:D10)"
  },
  {
    name: "TRANSPOSE",
    category: "Tra cứu",
    desc: "Chuyển đổi một vùng ô ngang thành dọc hoặc ngược lại.",
    syntax: "TRANSPOSE(array)",
    syntaxVi: "TRANSPOSE(mảng_dữ_liệu)",
    params: [
      { name: "mảng_dữ_liệu", desc: "Vùng ô hoặc mảng cần chuyển đổi hàng thành cột và cột thành hàng." }
    ],
    example: "=TRANSPOSE(A1:B5)"
  },
  {
    name: "UNIQUE",
    category: "Tra cứu",
    desc: "Trả về danh sách các giá trị duy nhất từ một vùng dữ liệu.",
    syntax: "UNIQUE(array)",
    syntaxVi: "UNIQUE(vùng_dữ_liệu)",
    params: [
      { name: "vùng_dữ_liệu", desc: "Vùng dữ liệu cần lọc và trả về danh sách các giá trị duy nhất không trùng lặp." }
    ],
    example: "=UNIQUE(A2:A50)"
  },
  {
    name: "SORT",
    category: "Tra cứu",
    desc: "Sắp xếp nội dung của một vùng hoặc mảng theo thứ tự chỉ định.",
    syntax: "SORT(array, [sort_index], [sort_order])",
    syntaxVi: "SORT(vùng_dữ_liệu, [cột_sắp_xếp], [thứ_tự])",
    params: [
      { name: "vùng_dữ_liệu", desc: "Vùng dữ liệu cần sắp xếp." },
      { name: "[cột_sắp_xếp]", desc: "Số thứ tự của cột dùng để sắp xếp (mặc định là cột 1).", optional: true },
      { name: "[thứ_tự]", desc: "Thứ tự sắp xếp: 1 (tăng dần, mặc định), -1 (giảm dần).", optional: true }
    ],
    example: "=SORT(A2:C20; 2; 1)"
  },
  {
    name: "FILTER",
    category: "Tra cứu",
    desc: "Lọc một vùng dữ liệu dựa trên một hoặc nhiều điều kiện logic.",
    syntax: "FILTER(array, include, [if_empty])",
    syntaxVi: "FILTER(vùng_dữ_liệu, điều_kiện_lọc, [nếu_rỗng])",
    params: [
      { name: "vùng_dữ_liệu", desc: "Vùng dữ liệu cần trích lọc." },
      { name: "điều_kiện_lọc", desc: "Mảng logic biểu thức điều kiện (ví dụ: B2:B20 > 50)." },
      { name: "[nếu_rỗng]", desc: "Giá trị trả về nếu không có hàng nào thỏa mãn điều kiện.", optional: true }
    ],
    example: "=FILTER(A2:C20; B2:B20>50; \"Không có\")"
  },
  {
    name: "HYPERLINK",
    category: "Tra cứu",
    desc: "Tạo liên kết chuyển hướng đến trang web hoặc tệp tài liệu.",
    syntax: "HYPERLINK(link_location, [friendly_name])",
    syntaxVi: "HYPERLINK(đường_dẫn_liên_kết, [tên_hiển_thị])",
    params: [
      { name: "đường_dẫn_liên_kết", desc: "Đường dẫn URL hoặc tệp tài liệu cần mở." },
      { name: "[tên_hiển_thị]", desc: "Văn bản hiển thị thay thế trong ô.", optional: true }
    ],
    example: "=HYPERLINK(\"https://vn-office.vn\"; \"Trang chủ VN Office\")"
  },
  {
    name: "ADDRESS",
    category: "Tra cứu",
    desc: "Tạo địa chỉ ô dạng văn bản từ số hàng và số cột.",
    syntax: "ADDRESS(row_num, column_num, [abs_num])",
    syntaxVi: "ADDRESS(số_hàng, số_cột, [kiểu_tuyệt_đối])",
    params: [
      { name: "số_hàng", desc: "Số thứ tự hàng để tạo địa chỉ ô." },
      { name: "số_cột", desc: "Số thứ tự cột để tạo địa chỉ ô (1 cho A, 2 cho B...)." },
      { name: "[kiểu_tuyệt_đối]", desc: "Kiểu địa chỉ: 1 ($A$1), 2 (A$1), 3 ($A1), 4 (A1). Mặc định là 1.", optional: true }
    ],
    example: "=ADDRESS(1; 1; 1)"
  },
  {
    name: "ROW",
    category: "Tra cứu",
    desc: "Trả về số thứ tự hàng của một ô tham chiếu.",
    syntax: "ROW([reference])",
    syntaxVi: "ROW([ô_tham_chiếu])",
    params: [
      { name: "[ô_tham_chiếu]", desc: "Ô cần lấy số thứ tự hàng. Nếu bỏ trống, trả về hàng của ô chứa công thức.", optional: true }
    ],
    example: "=ROW(A5)"
  },
  {
    name: "COLUMN",
    category: "Tra cứu",
    desc: "Trả về số thứ tự cột của một ô tham chiếu.",
    syntax: "COLUMN([reference])",
    syntaxVi: "COLUMN([ô_tham_chiếu])",
    params: [
      { name: "[ô_tham_chiếu]", desc: "Ô cần lấy số thứ tự cột. Nếu bỏ trống, trả về cột của ô chứa công thức.", optional: true }
    ],
    example: "=COLUMN(C1)"
  },
  {
    name: "FORMULATEXT",
    category: "Tra cứu",
    desc: "Trả về công thức trong ô tham chiếu dưới dạng chuỗi văn bản.",
    syntax: "FORMULATEXT(reference)",
    syntaxVi: "FORMULATEXT(ô_tham_chiếu)",
    params: [
      { name: "ô_tham_chiếu", desc: "Ô chứa công thức cần lấy chuỗi công thức dạng văn bản." }
    ],
    example: "=FORMULATEXT(A1)"
  },

  // ==========================================
  // 2. TOÁN HỌC & LƯỢNG GIÁC (MATH & TRIG)
  // ==========================================
  {
    name: "SUM",
    category: "Toán học",
    desc: "Tính tổng tất cả các số trong một phạm vi ô được chọn.",
    syntax: "SUM(number1, [number2], ...)",
    syntaxVi: "SUM(số1, [số2], ...)",
    params: [
      { name: "số1", desc: "Số hoặc vùng ô đầu tiên cần tính tổng." },
      { name: "[số2]", desc: "Số hoặc vùng ô thứ hai trở đi cần cộng dồn (tùy chọn).", optional: true },
      { name: "...", desc: "Các số hoặc vùng ô tiếp theo (tối đa 255 đối số).", optional: true }
    ],
    example: "=SUM(A1:A10)"
  },
  {
    name: "PRODUCT",
    category: "Toán học",
    desc: "Nhân tất cả các số được cung cấp làm đối số và trả về tích.",
    syntax: "PRODUCT(number1, [number2], ...)",
    syntaxVi: "PRODUCT(số1, [số2], ...)",
    params: [
      { name: "số1", desc: "Số hoặc vùng ô đầu tiên cần tính tích." },
      { name: "[số2]", desc: "Số hoặc vùng ô thứ hai trở đi cần nhân (tùy chọn).", optional: true },
      { name: "...", desc: "Các số hoặc vùng ô tiếp theo.", optional: true }
    ],
    example: "=PRODUCT(A1:A5)"
  },
  {
    name: "ROUND",
    category: "Toán học",
    desc: "Làm tròn một số đến số lượng chữ số thập phân đã định trước (làm tròn nửa ra xa số 0 chuẩn Excel).",
    syntax: "ROUND(number, num_digits)",
    syntaxVi: "ROUND(số, số_chữ_số)",
    params: [
      { name: "số", desc: "Giá trị số cần làm tròn (làm tròn nửa ra xa số 0 cho cả số dương và số âm)." },
      { name: "số_chữ_số", desc: "Số lượng chữ số thập phân cần giữ lại (0 để làm tròn số nguyên, số âm để làm tròn hàng chục/trăm)." }
    ],
    example: "=ROUND(123.456; 2)"
  },
  {
    name: "ROUNDUP",
    category: "Toán học",
    desc: "Làm tròn một số ra xa số không đến số chữ số chỉ định.",
    syntax: "ROUNDUP(number, num_digits)",
    syntaxVi: "ROUNDUP(số, số_chữ_số)",
    params: [
      { name: "số", desc: "Giá trị số cần làm tròn tiến (ra xa số 0)." },
      { name: "số_chữ_số", desc: "Số lượng chữ số thập phân cần làm tròn tới." }
    ],
    example: "=ROUNDUP(12.31; 1)"
  },
  {
    name: "ROUNDDOWN",
    category: "Toán học",
    desc: "Làm tròn một số về phía số không đến số chữ số chỉ định.",
    syntax: "ROUNDDOWN(number, num_digits)",
    syntaxVi: "ROUNDDOWN(số, số_chữ_số)",
    params: [
      { name: "số", desc: "Giá trị số cần làm tròn lùi (về phía số 0)." },
      { name: "số_chữ_số", desc: "Số lượng chữ số thập phân cần làm tròn tới." }
    ],
    example: "=ROUNDDOWN(12.39; 1)"
  },
  {
    name: "INT",
    category: "Toán học",
    desc: "Làm tròn một số xuống số nguyên gần nhất.",
    syntax: "INT(number)",
    syntaxVi: "INT(số)",
    params: [
      { name: "số", desc: "Giá trị số thực cần làm tròn xuống số nguyên gần nhất nhỏ hơn hoặc bằng nó." }
    ],
    example: "=INT(8.9)"
  },
  {
    name: "TRUNC",
    category: "Toán học",
    desc: "Cắt bớt phần thập phân của một số đến số chữ số chỉ định.",
    syntax: "TRUNC(number, [num_digits])",
    syntaxVi: "TRUNC(số, [số_chữ_số])",
    params: [
      { name: "số", desc: "Số cần cắt bớt phần thập phân." },
      { name: "[số_chữ_số]", desc: "Số chữ số thập phân muốn giữ lại (mặc định là 0).", optional: true }
    ],
    example: "=TRUNC(8.756; 2)"
  },
  {
    name: "ABS",
    category: "Toán học",
    desc: "Trả về giá trị tuyệt đối của một số.",
    syntax: "ABS(number)",
    syntaxVi: "ABS(số)",
    params: [
      { name: "số", desc: "Giá trị số thực cần lấy giá trị tuyệt đối không âm." }
    ],
    example: "=ABS(-15.5)"
  },
  {
    name: "MOD",
    category: "Toán học",
    desc: "Trả về số dư sau khi chia một số cho một số chia.",
    syntax: "MOD(number, divisor)",
    syntaxVi: "MOD(số_bị_chia, số_chia)",
    params: [
      { name: "số_bị_chia", desc: "Số cần chia để lấy số dư." },
      { name: "số_chia", desc: "Số dùng để chia (phải khác 0)." }
    ],
    example: "=MOD(10; 3)"
  },
  {
    name: "SQRT",
    category: "Toán học",
    desc: "Trả về căn bậc hai dương của một số.",
    syntax: "SQRT(number)",
    syntaxVi: "SQRT(số)",
    params: [
      { name: "số", desc: "Số dương cần tính căn bậc hai." }
    ],
    example: "=SQRT(16)"
  },
  {
    name: "POWER",
    category: "Toán học",
    desc: "Nâng một số lên lũy thừa đã cho.",
    syntax: "POWER(number, power)",
    syntaxVi: "POWER(cơ_số, số_mũ)",
    params: [
      { name: "cơ_số", desc: "Số gốc cần nâng lên lũy thừa." },
      { name: "số_mũ", desc: "Bậc lũy thừa cần nhân." }
    ],
    example: "=POWER(2; 8)"
  },
  {
    name: "SUMPRODUCT",
    category: "Toán học",
    desc: "Nhân các phần tử tương ứng trong các vùng rồi tính tổng các tích.",
    syntax: "SUMPRODUCT(array1, [array2], ...)",
    syntaxVi: "SUMPRODUCT(mảng1, [mảng2], ...)",
    params: [
      { name: "mảng1", desc: "Mảng hoặc vùng dữ liệu đầu tiên có các phần tử cần nhân." },
      { name: "[mảng2]", desc: "Mảng thứ hai cùng kích thước với mảng đầu để nhân tương ứng.", optional: true },
      { name: "...", desc: "Các mảng bổ sung tiếp theo.", optional: true }
    ],
    example: "=SUMPRODUCT(A2:A10; B2:B10)"
  },
  {
    name: "CEILING",
    category: "Toán học",
    desc: "Làm tròn một số lên bội số gần nhất của mức chính xác.",
    syntax: "CEILING(number, significance)",
    syntaxVi: "CEILING(số, mức_làm_tròn)",
    params: [
      { name: "số", desc: "Số cần làm tròn lên bội số gần nhất." },
      { name: "mức_làm_tròn", desc: "Bội số chuẩn dùng để làm tròn." }
    ],
    example: "=CEILING(2.5; 1)"
  },
  {
    name: "FLOOR",
    category: "Toán học",
    desc: "Làm tròn một số xuống bội số gần nhất của mức chính xác.",
    syntax: "FLOOR(number, significance)",
    syntaxVi: "FLOOR(số, mức_làm_tròn)",
    params: [
      { name: "số", desc: "Số cần làm tròn xuống bội số gần nhất." },
      { name: "mức_làm_tròn", desc: "Bội số chuẩn dùng để làm tròn." }
    ],
    example: "=FLOOR(2.5; 1)"
  },
  {
    name: "SIGN",
    category: "Toán học",
    desc: "Trả về dấu của một số: -1, 0 hoặc 1.",
    syntax: "SIGN(number)",
    syntaxVi: "SIGN(số)",
    params: [
      { name: "số", desc: "Số cần xác định dấu: trả về 1 nếu dương, 0 nếu bằng 0, -1 nếu âm." }
    ],
    example: "=SIGN(-42)"
  },
  {
    name: "MROUND",
    category: "Toán học",
    desc: "Làm tròn một số đến bội số mong muốn.",
    syntax: "MROUND(number, multiple)",
    syntaxVi: "MROUND(số, bội_số)",
    params: [
      { name: "số", desc: "Giá trị số cần làm tròn." },
      { name: "bội_số", desc: "Bội số mục tiêu cần làm tròn tới." }
    ],
    example: "=MROUND(10; 3)"
  },
  {
    name: "EVEN",
    category: "Toán học",
    desc: "Làm tròn một số lên số nguyên chẵn gần nhất.",
    syntax: "EVEN(number)",
    syntaxVi: "EVEN(số)",
    params: [
      { name: "số", desc: "Số cần làm tròn lên số nguyên chẵn gần nhất." }
    ],
    example: "=EVEN(1.5)"
  },
  {
    name: "ODD",
    category: "Toán học",
    desc: "Làm tròn một số lên số nguyên lẻ gần nhất.",
    syntax: "ODD(number)",
    syntaxVi: "ODD(số)",
    params: [
      { name: "số", desc: "Số cần làm tròn lên số nguyên lẻ gần nhất." }
    ],
    example: "=ODD(2.1)"
  },
  {
    name: "FACT",
    category: "Toán học",
    desc: "Trả về giai thừa của một số.",
    syntax: "FACT(number)",
    syntaxVi: "FACT(số)",
    params: [
      { name: "số", desc: "Số nguyên không âm cần tính giai thừa." }
    ],
    example: "=FACT(5)"
  },
  {
    name: "COMBIN",
    category: "Toán học",
    desc: "Trả về số tổ hợp cho một số lượng phần tử đã cho.",
    syntax: "COMBIN(number, number_chosen)",
    syntaxVi: "COMBIN(tập_hợp, chọn)",
    params: [
      { name: "tập_hợp", desc: "Tổng số phần tử của tập hợp." },
      { name: "chọn", desc: "Số phần tử chọn ra trong mỗi tổ hợp." }
    ],
    example: "=COMBIN(8; 3)"
  },
  {
    name: "PI",
    category: "Toán học",
    desc: "Trả về giá trị của số pi chính xác đến 15 chữ số (3.14159265358979).",
    syntax: "PI()",
    syntaxVi: "PI()",
    params: [],
    example: "=PI()"
  },
  {
    name: "RAND",
    category: "Toán học",
    desc: "Trả về một số thực ngẫu nhiên lớn hơn hoặc bằng 0 và nhỏ hơn 1.",
    syntax: "RAND()",
    syntaxVi: "RAND()",
    params: [],
    example: "=RAND()"
  },
  {
    name: "RANDBETWEEN",
    category: "Toán học",
    desc: "Trả về một số nguyên ngẫu nhiên giữa các số bạn chỉ định.",
    syntax: "RANDBETWEEN(bottom, top)",
    syntaxVi: "RANDBETWEEN(số_nhỏ_nhất, số_lớn_nhất)",
    params: [
      { name: "số_nhỏ_nhất", desc: "Giới hạn số nguyên nhỏ nhất của khoảng ngẫu nhiên." },
      { name: "số_lớn_nhất", desc: "Giới hạn số nguyên lớn nhất của khoảng ngẫu nhiên." }
    ],
    example: "=RANDBETWEEN(1; 100)"
  },
  {
    name: "LN",
    category: "Toán học",
    desc: "Trả về logarit tự nhiên (cơ số e) của một số.",
    syntax: "LN(number)",
    syntaxVi: "LN(số)",
    params: [
      { name: "số", desc: "Số dương cần tính logarit tự nhiên (cơ số e)." }
    ],
    example: "=LN(2.71828)"
  },
  {
    name: "LOG",
    category: "Toán học",
    desc: "Trả về logarit của một số theo cơ số đã chỉ định.",
    syntax: "LOG(number, [base])",
    syntaxVi: "LOG(số, [cơ_số])",
    params: [
      { name: "số", desc: "Số dương cần tính logarit." },
      { name: "[cơ_số]", desc: "Cơ số của logarit (mặc định là 10 nếu bỏ qua).", optional: true }
    ],
    example: "=LOG(8; 2)"
  },
  {
    name: "LOG10",
    category: "Toán học",
    desc: "Trả về logarit cơ số 10 của một số.",
    syntax: "LOG10(number)",
    syntaxVi: "LOG10(số)",
    params: [
      { name: "số", desc: "Số dương cần tính logarit cơ số 10." }
    ],
    example: "=LOG10(100)"
  },
  {
    name: "EXP",
    category: "Toán học",
    desc: "Trả về hằng số e nâng lên lũy thừa của một số đã cho.",
    syntax: "EXP(number)",
    syntaxVi: "EXP(số_mũ)",
    params: [
      { name: "số_mũ", desc: "Số mũ để nâng hằng số e (khoảng 2.71828) lên lũy thừa." }
    ],
    example: "=EXP(1)"
  },
  {
    name: "DEGREES",
    category: "Toán học",
    desc: "Chuyển đổi góc từ đơn vị radian sang độ.",
    syntax: "DEGREES(angle)",
    syntaxVi: "DEGREES(góc_radian)",
    params: [
      { name: "góc_radian", desc: "Góc đo bằng radian cần đổi sang độ." }
    ],
    example: "=DEGREES(PI())"
  },
  {
    name: "RADIANS",
    category: "Toán học",
    desc: "Chuyển đổi góc từ đơn vị độ sang radian.",
    syntax: "RADIANS(angle)",
    syntaxVi: "RADIANS(góc_độ)",
    params: [
      { name: "góc_độ", desc: "Góc đo bằng độ cần đổi sang radian." }
    ],
    example: "=RADIANS(180)"
  },
  {
    name: "SIN",
    category: "Toán học",
    desc: "Trả về sin của một góc đã cho theo radian.",
    syntax: "SIN(number)",
    syntaxVi: "SIN(góc_radian)",
    params: [
      { name: "góc_radian", desc: "Góc đo bằng radian cần tính sin." }
    ],
    example: "=SIN(PI()/2)"
  },
  {
    name: "COS",
    category: "Toán học",
    desc: "Trả về cosin của một góc đã cho theo radian.",
    syntax: "COS(number)",
    syntaxVi: "COS(góc_radian)",
    params: [
      { name: "góc_radian", desc: "Góc đo bằng radian cần tính cosin." }
    ],
    example: "=COS(0)"
  },
  {
    name: "TAN",
    category: "Toán học",
    desc: "Trả về tang của một góc đã cho theo radian.",
    syntax: "TAN(number)",
    syntaxVi: "TAN(góc_radian)",
    params: [
      { name: "góc_radian", desc: "Góc đo bằng radian cần tính tang." }
    ],
    example: "=TAN(PI()/4)"
  },

  // ==========================================
  // 3. THỐNG KÊ (STATISTICAL)
  // ==========================================
  {
    name: "AVERAGE",
    category: "Thống kê",
    desc: "Tính giá trị trung bình cộng của các đối số.",
    syntax: "AVERAGE(number1, [number2], ...)",
    syntaxVi: "AVERAGE(số1, [số2], ...)",
    params: [
      { name: "số1", desc: "Số hoặc vùng ô đầu tiên cần tính trung bình cộng." },
      { name: "[số2]", desc: "Số hoặc vùng ô thứ hai trở đi (tùy chọn).", optional: true },
      { name: "...", desc: "Các số hoặc vùng ô bổ sung tiếp theo.", optional: true }
    ],
    example: "=AVERAGE(A1:A10)"
  },
  {
    name: "COUNT",
    category: "Thống kê",
    desc: "Đếm số lượng các ô chứa giá trị số.",
    syntax: "COUNT(value1, [value2], ...)",
    syntaxVi: "COUNT(giá_trị1, [giá_trị2], ...)",
    params: [
      { name: "giá_trị1", desc: "Giá trị hoặc vùng ô đầu tiên cần đếm các ô chứa số." },
      { name: "[giá_trị2]", desc: "Giá trị hoặc vùng ô thứ hai trở đi cần đếm.", optional: true },
      { name: "...", desc: "Các vùng ô tiếp theo.", optional: true }
    ],
    example: "=COUNT(A1:A50)"
  },
  {
    name: "COUNTA",
    category: "Thống kê",
    desc: "Đếm số lượng ô không rỗng (chứa bất kỳ dữ liệu nào).",
    syntax: "COUNTA(value1, [value2], ...)",
    syntaxVi: "COUNTA(giá_trị1, [giá_trị2], ...)",
    params: [
      { name: "giá_trị1", desc: "Giá trị hoặc vùng ô đầu tiên cần đếm các ô không rỗng." },
      { name: "[giá_trị2]", desc: "Giá trị hoặc vùng ô thứ hai trở đi cần đếm.", optional: true },
      { name: "...", desc: "Các vùng ô tiếp theo.", optional: true }
    ],
    example: "=COUNTA(A1:A50)"
  },
  {
    name: "COUNTBLANK",
    category: "Thống kê",
    desc: "Đếm số ô trống trong một vùng.",
    syntax: "COUNTBLANK(range)",
    syntaxVi: "COUNTBLANK(vùng_ô)",
    params: [
      { name: "vùng_ô", desc: "Vùng ô cần đếm số lượng ô hoàn toàn trống." }
    ],
    example: "=COUNTBLANK(B2:B50)"
  },
  {
    name: "MIN",
    category: "Thống kê",
    desc: "Trả về số nhỏ nhất trong một tập hợp các giá trị.",
    syntax: "MIN(number1, [number2], ...)",
    syntaxVi: "MIN(số1, [số2], ...)",
    params: [
      { name: "số1", desc: "Số hoặc vùng ô đầu tiên cần tìm giá trị nhỏ nhất." },
      { name: "[số2]", desc: "Số hoặc vùng ô thứ hai trở đi.", optional: true },
      { name: "...", desc: "Các số hoặc vùng ô tiếp theo.", optional: true }
    ],
    example: "=MIN(A1:A20)"
  },
  {
    name: "MAX",
    category: "Thống kê",
    desc: "Trả về số lớn nhất trong một tập hợp các giá trị.",
    syntax: "MAX(number1, [number2], ...)",
    syntaxVi: "MAX(số1, [số2], ...)",
    params: [
      { name: "số1", desc: "Số hoặc vùng ô đầu tiên cần tìm giá trị lớn nhất." },
      { name: "[số2]", desc: "Số hoặc vùng ô thứ hai trở đi.", optional: true },
      { name: "...", desc: "Các số hoặc vùng ô tiếp theo.", optional: true }
    ],
    example: "=MAX(A1:A20)"
  },
  {
    name: "COUNTIF",
    category: "Thống kê",
    desc: "Đếm các ô thỏa một điều kiện.",
    syntax: "COUNTIF(range, criteria)",
    syntaxVi: "COUNTIF(vùng_đếm, điều_kiện)",
    params: [
      { name: "vùng_đếm", desc: "Vùng ô cần kiểm tra điều kiện để đếm." },
      { name: "điều_kiện", desc: "Tiêu chí để đếm (ví dụ: \">100\", \"Đạt\", hoặc tham chiếu ô B1)." }
    ],
    example: "=COUNTIF(B2:B20; \">50\")"
  },
  {
    name: "SUMIF",
    category: "Thống kê",
    desc: "Tính tổng các ô tương ứng thỏa một điều kiện.",
    syntax: "SUMIF(range, criteria, [sum_range])",
    syntaxVi: "SUMIF(vùng_điều_kiện, điều_kiện, [vùng_tính_tổng])",
    params: [
      { name: "vùng_điều_kiện", desc: "Vùng ô chứa dữ liệu để so sánh với điều kiện." },
      { name: "điều_kiện", desc: "Tiêu chí xác định ô nào sẽ được cộng (ví dụ: \">=1000\")." },
      { name: "[vùng_tính_tổng]", desc: "Vùng ô chứa các số thực tế cần cộng (nếu bỏ qua sẽ cộng trên vùng_điều_kiện).", optional: true }
    ],
    example: "=SUMIF(A2:A20; \"Hà Nội\"; C2:C20)"
  },
  {
    name: "COUNTIFS",
    category: "Thống kê",
    desc: "Đếm các hàng thỏa đồng thời nhiều điều kiện.",
    syntax: "COUNTIFS(range1, criteria1, [range2], [criteria2], ...)",
    syntaxVi: "COUNTIFS(vùng_đk1, điều_kiện1, [vùng_đk2], [điều_kiện2], ...)",
    params: [
      { name: "vùng_đk1", desc: "Vùng ô thứ nhất cần đánh giá theo điều kiện 1." },
      { name: "điều_kiện1", desc: "Điều kiện thứ nhất để đếm." },
      { name: "[vùng_đk2]", desc: "Vùng ô thứ hai cần đánh giá theo điều kiện 2.", optional: true },
      { name: "[điều_kiện2]", desc: "Điều kiện thứ hai để đếm.", optional: true },
      { name: "...", desc: "Các cặp vùng và điều kiện bổ sung tiếp theo.", optional: true }
    ],
    example: "=COUNTIFS(A2:A50; \"Nam\"; B2:B50; \">18\")"
  },
  {
    name: "SUMIFS",
    category: "Thống kê",
    desc: "Tính tổng các hàng thỏa đồng thời nhiều điều kiện (vùng tổng và các vùng điều kiện phải cùng kích thước).",
    syntax: "SUMIFS(sum_range, range1, criteria1, [range2], [criteria2], ...)",
    syntaxVi: "SUMIFS(vùng_tổng, vùng_đk1, điều_kiện1, [vùng_đk2], [điều_kiện2], ...)",
    params: [
      { name: "vùng_tổng", desc: "Vùng ô chứa các số thực tế cần tính tổng (phải cùng kích thước hàng và cột với các vùng điều kiện)." },
      { name: "vùng_đk1", desc: "Vùng ô thứ nhất dùng để kiểm tra điều kiện 1 (phải cùng kích thước với vùng tổng)." },
      { name: "điều_kiện1", desc: "Điều kiện thứ nhất áp dụng cho vùng 1." },
      { name: "[vùng_đk2]", desc: "Vùng ô thứ hai dùng để kiểm tra điều kiện 2.", optional: true },
      { name: "[điều_kiện2]", desc: "Điều kiện thứ hai áp dụng cho vùng 2.", optional: true },
      { name: "...", desc: "Các cặp vùng và điều kiện bổ sung tiếp theo.", optional: true }
    ],
    example: "=SUMIFS(C2:C50; A2:A50; \"Đã bán\"; B2:B50; \">100\")"
  },
  {
    name: "AVERAGEIF",
    category: "Thống kê",
    desc: "Tính trung bình các ô tương ứng thỏa một điều kiện.",
    syntax: "AVERAGEIF(range, criteria, [average_range])",
    syntaxVi: "AVERAGEIF(vùng_điều_kiện, điều_kiện, [vùng_trung_bình])",
    params: [
      { name: "vùng_điều_kiện", desc: "Vùng ô chứa dữ liệu để so sánh với điều kiện." },
      { name: "điều_kiện", desc: "Tiêu chí để chọn các ô tính trung bình." },
      { name: "[vùng_trung_bình]", desc: "Vùng ô chứa số thực tế cần tính trung bình (nếu bỏ qua sẽ tính trên vùng_điều_kiện).", optional: true }
    ],
    example: "=AVERAGEIF(A2:A20; \"Phòng A\"; B2:B20)"
  },
  {
    name: "AVERAGEIFS",
    category: "Thống kê",
    desc: "Tính trung bình các ô thỏa đồng thời nhiều điều kiện.",
    syntax: "AVERAGEIFS(average_range, criteria_range1, criteria1, ...)",
    syntaxVi: "AVERAGEIFS(vùng_trung_bình, vùng_đk1, điều_kiện1, ...)",
    params: [
      { name: "vùng_trung_bình", desc: "Vùng ô chứa các số thực tế cần tính trung bình." },
      { name: "vùng_đk1", desc: "Vùng ô thứ nhất để kiểm tra điều kiện." },
      { name: "điều_kiện1", desc: "Điều kiện áp dụng cho vùng 1." },
      { name: "...", desc: "Các cặp vùng và điều kiện tiếp theo.", optional: true }
    ],
    example: "=AVERAGEIFS(D2:D50; A2:A50; \"Nam\"; B2:B50; \">20\")"
  },
  {
    name: "MEDIAN",
    category: "Thống kê",
    desc: "Trả về trung vị của tập hợp số.",
    syntax: "MEDIAN(number1, [number2], ...)",
    syntaxVi: "MEDIAN(số1, [số2], ...)",
    params: [
      { name: "số1", desc: "Số hoặc vùng ô đầu tiên cần tìm số trung vị." },
      { name: "[số2]", desc: "Số hoặc vùng ô thứ hai trở đi.", optional: true },
      { name: "...", desc: "Các số hoặc vùng ô tiếp theo.", optional: true }
    ],
    example: "=MEDIAN(A1:A15)"
  },
  {
    name: "RANK",
    category: "Thống kê",
    desc: "Trả về thứ hạng của một số trong danh sách.",
    syntax: "RANK(number, ref, [order])",
    syntaxVi: "RANK(số_cần_xếp, danh_sách_so_sánh, [thứ_tự])",
    params: [
      { name: "số_cần_xếp", desc: "Số cần tìm thứ hạng xếp loại trong danh sách." },
      { name: "danh_sách_so_sánh", desc: "Vùng ô hoặc mảng số dùng làm danh sách so sánh thứ hạng." },
      { name: "[thứ_tự]", desc: "Thứ tự xếp hạng: 0 (giảm dần - điểm cao nhất xếp hạng 1, mặc định), 1 (tăng dần).", optional: true }
    ],
    example: "=RANK(B2; $B$2:$B$50; 0)"
  },
  {
    name: "RANK.EQ",
    category: "Thống kê",
    desc: "Trả về thứ hạng bằng nhau của một số trong danh sách.",
    syntax: "RANK.EQ(number, ref, [order])",
    syntaxVi: "RANK.EQ(số_cần_xếp, danh_sách_so_sánh, [thứ_tự])",
    params: [
      { name: "số_cần_xếp", desc: "Số cần tìm thứ hạng xếp loại trong danh sách." },
      { name: "danh_sách_so_sánh", desc: "Vùng ô hoặc mảng số dùng làm danh sách so sánh thứ hạng." },
      { name: "[thứ_tự]", desc: "Thứ tự xếp hạng: 0 (giảm dần, mặc định), 1 (tăng dần).", optional: true }
    ],
    example: "=RANK.EQ(B2; $B$2:$B$50; 0)"
  },
  {
    name: "LARGE",
    category: "Thống kê",
    desc: "Trả về giá trị lớn thứ k trong tập dữ liệu.",
    syntax: "LARGE(array, k)",
    syntaxVi: "LARGE(vùng_dữ_liệu, vị_trí_k)",
    params: [
      { name: "vùng_dữ_liệu", desc: "Vùng ô hoặc mảng số cần tìm giá trị lớn." },
      { name: "vị_trí_k", desc: "Vị trí thứ hạng lớn cần lấy (1 là lớn nhất, 2 là lớn thứ nhì...)." }
    ],
    example: "=LARGE(A1:A50; 2)"
  },
  {
    name: "SMALL",
    category: "Thống kê",
    desc: "Trả về giá trị nhỏ thứ k trong tập dữ liệu.",
    syntax: "SMALL(array, k)",
    syntaxVi: "SMALL(vùng_dữ_liệu, vị_trí_k)",
    params: [
      { name: "vùng_dữ_liệu", desc: "Vùng ô hoặc mảng số cần tìm giá trị nhỏ." },
      { name: "vị_trí_k", desc: "Vị trí thứ hạng nhỏ cần lấy (1 là nhỏ nhất, 2 là nhỏ thứ nhì...)." }
    ],
    example: "=SMALL(A1:A50; 1)"
  },
  {
    name: "STDEV",
    category: "Thống kê",
    desc: "Ước tính độ lệch chuẩn mẫu từ các đối số.",
    syntax: "STDEV(number1, [number2], ...)",
    syntaxVi: "STDEV(số1, [số2], ...)",
    params: [
      { name: "số1", desc: "Số hoặc vùng ô đầu tiên để ước tính độ lệch chuẩn mẫu." },
      { name: "[số2]", desc: "Số hoặc vùng ô thứ hai trở đi.", optional: true },
      { name: "...", desc: "Các số hoặc vùng ô tiếp theo.", optional: true }
    ],
    example: "=STDEV(A1:A30)"
  },
  {
    name: "VAR",
    category: "Thống kê",
    desc: "Ước tính phương sai mẫu từ các đối số.",
    syntax: "VAR(number1, [number2], ...)",
    syntaxVi: "VAR(số1, [số2], ...)",
    params: [
      { name: "số1", desc: "Số hoặc vùng ô đầu tiên để ước tính phương sai mẫu." },
      { name: "[số2]", desc: "Số hoặc vùng ô thứ hai trở đi.", optional: true },
      { name: "...", desc: "Các số hoặc vùng ô tiếp theo.", optional: true }
    ],
    example: "=VAR(A1:A30)"
  },
  {
    name: "MODE",
    category: "Thống kê",
    desc: "Trả về giá trị có tần suất xuất hiện nhiều nhất trong một mảng.",
    syntax: "MODE(number1, [number2], ...)",
    syntaxVi: "MODE(số1, [số2], ...)",
    params: [
      { name: "số1", desc: "Số hoặc vùng ô đầu tiên để tìm giá trị xuất hiện nhiều nhất." },
      { name: "[số2]", desc: "Số hoặc vùng ô thứ hai trở đi.", optional: true },
      { name: "...", desc: "Các số hoặc vùng ô tiếp theo.", optional: true }
    ],
    example: "=MODE(A1:A50)"
  },
  {
    name: "PERCENTILE",
    category: "Thống kê",
    desc: "Trả về phân vị thứ k của các giá trị trong một phạm vi.",
    syntax: "PERCENTILE(array, k)",
    syntaxVi: "PERCENTILE(mảng_dữ_liệu, k)",
    params: [
      { name: "mảng_dữ_liệu", desc: "Vùng dữ liệu số cần tính phân vị." },
      { name: "k", desc: "Giá trị phân vị trong khoảng từ 0 đến 1 (ví dụ 0.9 cho phân vị thứ 90)." }
    ],
    example: "=PERCENTILE(A1:A100; 0.9)"
  },

  // ==========================================
  // 4. LOGIC
  // ==========================================
  {
    name: "IF",
    category: "Logic",
    desc: "Kiểm tra điều kiện và trả về giá trị thứ nhất nếu đúng, thứ hai nếu sai.",
    syntax: "IF(logical_test, value_if_true, [value_if_false])",
    syntaxVi: "IF(điều_kiện, giá_trị_nếu_đúng, [giá_trị_nếu_sai])",
    params: [
      { name: "điều_kiện", desc: "Biểu thức so sánh trả về kết quả ĐÚNG (TRUE) hoặc SAI (FALSE)." },
      { name: "giá_trị_nếu_đúng", desc: "Giá trị hoặc kết quả trả về khi điều kiện là ĐÚNG." },
      { name: "[giá_trị_nếu_sai]", desc: "Giá trị hoặc kết quả trả về khi điều kiện là SAI (mặc định là FALSE nếu bỏ qua).", optional: true }
    ],
    example: "=IF(A2>=5; \"Đậu\"; \"Hỏng\")"
  },
  {
    name: "IFS",
    category: "Logic",
    desc: "Kiểm tra xem một hoặc nhiều điều kiện có được đáp ứng hay không và trả về giá trị tương ứng với điều kiện TRUE đầu tiên.",
    syntax: "IFS(logical_test1, value_if_true1, [logical_test2], [value_if_true2], ...)",
    syntaxVi: "IFS(điều_kiện1, giá_trị1, [điều_kiện2], [giá_trị2], ...)",
    params: [
      { name: "điều_kiện1", desc: "Điều kiện logic thứ nhất cần kiểm tra." },
      { name: "giá_trị1", desc: "Giá trị trả về nếu điều kiện 1 đúng." },
      { name: "[điều_kiện2]", desc: "Điều kiện logic thứ hai cần kiểm tra nếu điều kiện 1 sai.", optional: true },
      { name: "[giá_trị2]", desc: "Giá trị trả về nếu điều kiện 2 đúng.", optional: true },
      { name: "...", desc: "Các cặp điều kiện và giá trị bổ sung tiếp theo.", optional: true }
    ],
    example: "=IFS(A1>=8; \"Giỏi\"; A1>=6.5; \"Khá\"; TRUE; \"Trung bình\")"
  },
  {
    name: "AND",
    category: "Logic",
    desc: "Trả về TRUE nếu tất cả các đối số là TRUE.",
    syntax: "AND(logical1, [logical2], ...)",
    syntaxVi: "AND(điều_kiện1, [điều_kiện2], ...)",
    params: [
      { name: "điều_kiện1", desc: "Điều kiện logic thứ nhất." },
      { name: "[điều_kiện2]", desc: "Điều kiện logic thứ hai trở đi (tùy chọn).", optional: true },
      { name: "...", desc: "Các điều kiện bổ sung tiếp theo.", optional: true }
    ],
    example: "=AND(A2>0; B2<10)"
  },
  {
    name: "OR",
    category: "Logic",
    desc: "Trả về TRUE nếu bất kỳ đối số nào là TRUE.",
    syntax: "OR(logical1, [logical2], ...)",
    syntaxVi: "OR(điều_kiện1, [điều_kiện2], ...)",
    params: [
      { name: "điều_kiện1", desc: "Điều kiện logic thứ nhất." },
      { name: "[điều_kiện2]", desc: "Điều kiện logic thứ hai trở đi (tùy chọn).", optional: true },
      { name: "...", desc: "Các điều kiện bổ sung tiếp theo.", optional: true }
    ],
    example: "=OR(A2=\"Đậu\"; B2=\"Đặc cách\")"
  },
  {
    name: "NOT",
    category: "Logic",
    desc: "Đảo ngược giá trị logic của đối số.",
    syntax: "NOT(logical)",
    syntaxVi: "NOT(điều_kiện)",
    params: [
      { name: "điều_kiện", desc: "Giá trị hoặc biểu thức logic cần đảo ngược (TRUE thành FALSE, FALSE thành TRUE)." }
    ],
    example: "=NOT(ISBLANK(A1))"
  },
  {
    name: "IFERROR",
    category: "Logic",
    desc: "Trả về giá trị thay thế khi biểu thức tạo ra bất kỳ lỗi nào.",
    syntax: "IFERROR(value, value_if_error)",
    syntaxVi: "IFERROR(giá_trị_hoặc_công_thức, giá_trị_khi_lỗi)",
    params: [
      { name: "giá_trị_hoặc_công_thức", desc: "Biểu thức tính toán cần kiểm tra xem có tạo ra lỗi không." },
      { name: "giá_trị_khi_lỗi", desc: "Giá trị hiển thị thay thế nếu công thức phát sinh bất kỳ lỗi nào (#N/A, #VALUE!, #DIV/0!...). " }
    ],
    example: "=IFERROR(VLOOKUP(A2; B:C; 2; 0); \"\")"
  },
  {
    name: "IFNA",
    category: "Logic",
    desc: "Trả về giá trị thay thế khi biểu thức tạo ra lỗi #N/A.",
    syntax: "IFNA(value, value_if_na)",
    syntaxVi: "IFNA(giá_trị_hoặc_công_thức, giá_trị_khi_na)",
    params: [
      { name: "giá_trị_hoặc_công_thức", desc: "Biểu thức tính toán cần kiểm tra xem có tạo ra lỗi #N/A không." },
      { name: "giá_trị_khi_na", desc: "Giá trị hiển thị thay thế nếu phát sinh lỗi #N/A." }
    ],
    example: "=IFNA(VLOOKUP(A2; B:C; 2; 0); 0)"
  },
  {
    name: "SWITCH",
    category: "Logic",
    desc: "Đánh giá một biểu thức so với danh sách các giá trị và trả về kết quả tương ứng.",
    syntax: "SWITCH(expression, val1, result1, [default_or_val2], ...)",
    syntaxVi: "SWITCH(biểu_thức, giá_trị1, kết_quả1, [mặc_định_hoặc_giá_trị2], ...)",
    params: [
      { name: "biểu_thức", desc: "Giá trị cần so sánh với danh sách các trường hợp." },
      { name: "giá_trị1", desc: "Giá trị trường hợp thứ nhất." },
      { name: "kết_quả1", desc: "Kết quả trả về khi khớp với giá trị 1." },
      { name: "[mặc_định_hoặc_giá_trị2]", desc: "Giá trị mặc định nếu không khớp hoặc trường hợp so sánh thứ hai.", optional: true },
      { name: "...", desc: "Các cặp trường hợp và kết quả tiếp theo.", optional: true }
    ],
    example: "=SWITCH(A1; 1; \"Nhất\"; 2; \"Nhì\"; \"Khác\")"
  },
  {
    name: "ISBLANK",
    category: "Logic",
    desc: "Kiểm tra giá trị có phải là ô trống hay không.",
    syntax: "ISBLANK(value)",
    syntaxVi: "ISBLANK(ô_cần_kiểm_tra)",
    params: [
      { name: "ô_cần_kiểm_tra", desc: "Ô cần kiểm tra xem có hoàn toàn trống không." }
    ],
    example: "=ISBLANK(A1)"
  },
  {
    name: "ISNUMBER",
    category: "Logic",
    desc: "Kiểm tra giá trị có phải là số hay không.",
    syntax: "ISNUMBER(value)",
    syntaxVi: "ISNUMBER(giá_trị_kiểm_tra)",
    params: [
      { name: "giá_trị_kiểm_tra", desc: "Giá trị hoặc ô cần kiểm tra xem có phải là kiểu số hay không." }
    ],
    example: "=ISNUMBER(B2)"
  },
  {
    name: "ISTEXT",
    category: "Logic",
    desc: "Kiểm tra giá trị có phải là văn bản hay không.",
    syntax: "ISTEXT(value)",
    syntaxVi: "ISTEXT(giá_trị_kiểm_tra)",
    params: [
      { name: "giá_trị_kiểm_tra", desc: "Giá trị hoặc ô cần kiểm tra xem có phải là kiểu văn bản chuỗi hay không." }
    ],
    example: "=ISTEXT(C3)"
  },
  {
    name: "ISNONTEXT",
    category: "Logic",
    desc: "Kiểm tra giá trị có phải không phải là văn bản (số, ngày, logic, ô trống) hay không.",
    syntax: "ISNONTEXT(value)",
    syntaxVi: "ISNONTEXT(giá_trị_kiểm_tra)",
    params: [
      { name: "giá_trị_kiểm_tra", desc: "Giá trị cần kiểm tra xem có phải KHÔNG phải văn bản hay không." }
    ],
    example: "=ISNONTEXT(A1)"
  },
  {
    name: "ISLOGICAL",
    category: "Logic",
    desc: "Kiểm tra giá trị có phải là giá trị logic (TRUE/FALSE) hay không.",
    syntax: "ISLOGICAL(value)",
    syntaxVi: "ISLOGICAL(giá_trị_kiểm_tra)",
    params: [
      { name: "giá_trị_kiểm_tra", desc: "Giá trị cần kiểm tra xem có phải là giá trị logic TRUE hoặc FALSE hay không." }
    ],
    example: "=ISLOGICAL(A1)"
  },
  {
    name: "ISERROR",
    category: "Logic",
    desc: "Kiểm tra giá trị có phải là mã lỗi hay không.",
    syntax: "ISERROR(value)",
    syntaxVi: "ISERROR(giá_trị_kiểm_tra)",
    params: [
      { name: "giá_trị_kiểm_tra", desc: "Giá trị hoặc biểu thức cần kiểm tra xem có phải là mã lỗi bất kỳ hay không." }
    ],
    example: "=ISERROR(1/0)"
  },
  {
    name: "ISNA",
    category: "Logic",
    desc: "Kiểm tra giá trị có phải là lỗi #N/A hay không.",
    syntax: "ISNA(value)",
    syntaxVi: "ISNA(giá_trị_kiểm_tra)",
    params: [
      { name: "giá_trị_kiểm_tra", desc: "Giá trị hoặc biểu thức cần kiểm tra xem có phải là lỗi #N/A hay không." }
    ],
    example: "=ISNA(VLOOKUP(A1; B:C; 2; 0))"
  },
  {
    name: "NA",
    category: "Logic",
    desc: "Trả về lỗi #N/A (giá trị không có sẵn). Lan truyền qua phép tính; IFERROR/IFNA bắt được.",
    syntax: "NA()",
    syntaxVi: "NA()",
    params: [],
    example: "=NA()"
  },
  {
    name: "ISFORMULA",
    category: "Logic",
    desc: "Kiểm tra xem ô tham chiếu có chứa công thức hay không.",
    syntax: "ISFORMULA(reference)",
    syntaxVi: "ISFORMULA(ô_tham_chiếu)",
    params: [
      { name: "ô_tham_chiếu", desc: "Ô cần kiểm tra xem có chứa công thức hay không." }
    ],
    example: "=ISFORMULA(C5)"
  },

  // ==========================================
  // 5. VĂN BẢN (TEXT)
  // ==========================================
  {
    name: "CONCAT",
    category: "Văn bản",
    desc: "Nối hai hoặc nhiều chuỗi văn bản thành một chuỗi duy nhất.",
    syntax: "CONCAT(text1, [text2], ...)",
    syntaxVi: "CONCAT(văn_bản1, [văn_bản2], ...)",
    params: [
      { name: "văn_bản1", desc: "Chuỗi văn bản hoặc vùng ô đầu tiên cần nối lại." },
      { name: "[văn_bản2]", desc: "Chuỗi văn bản hoặc vùng ô thứ hai trở đi cần nối.", optional: true },
      { name: "...", desc: "Các chuỗi văn bản tiếp theo.", optional: true }
    ],
    example: "=CONCAT(A1; \" \"; B1)"
  },
  {
    name: "CONCATENATE",
    category: "Văn bản",
    desc: "Nối nhiều chuỗi văn bản.",
    syntax: "CONCATENATE(text1, [text2], ...)",
    syntaxVi: "CONCATENATE(văn_bản1, [văn_bản2], ...)",
    params: [
      { name: "văn_bản1", desc: "Chuỗi văn bản đầu tiên cần nối." },
      { name: "[văn_bản2]", desc: "Chuỗi văn bản thứ hai trở đi cần nối.", optional: true },
      { name: "...", desc: "Các chuỗi văn bản tiếp theo.", optional: true }
    ],
    example: "=CONCATENATE(A1; \"-\"; B1)"
  },
  {
    name: "TEXTJOIN",
    category: "Văn bản",
    desc: "Nối các chuỗi bằng dấu phân cách và có thể bỏ qua ô trống.",
    syntax: "TEXTJOIN(delimiter, ignore_empty, text1, ...)",
    syntaxVi: "TEXTJOIN(ký_tự_ngăn_cách, bỏ_qua_ô_trống, văn_bản1, ...)",
    params: [
      { name: "ký_tự_ngăn_cách", desc: "Ký tự hoặc chuỗi dùng để ngăn cách giữa các đoạn văn bản (ví dụ: \", \" hoặc \"-\")." },
      { name: "bỏ_qua_ô_trống", desc: "Giá trị TRUE (bỏ qua các ô trống) hoặc FALSE (giữ nguyên ô trống)." },
      { name: "văn_bản1", desc: "Chuỗi hoặc vùng ô đầu tiên chứa văn bản cần nối." },
      { name: "...", desc: "Các chuỗi hoặc vùng ô tiếp theo.", optional: true }
    ],
    example: "=TEXTJOIN(\", \"; TRUE; A1:A5)"
  },
  {
    name: "LEFT",
    category: "Văn bản",
    desc: "Lấy số lượng ký tự đầu tiên từ bên trái chuỗi văn bản.",
    syntax: "LEFT(text, [num_chars])",
    syntaxVi: "LEFT(văn_bản, [số_ký_tự])",
    params: [
      { name: "văn_bản", desc: "Chuỗi văn bản cần trích xuất ký tự." },
      { name: "[số_ký_tự]", desc: "Số lượng ký tự muốn lấy tính từ bên trái sang (mặc định là 1).", optional: true }
    ],
    example: "=LEFT(A1; 3)"
  },
  {
    name: "RIGHT",
    category: "Văn bản",
    desc: "Lấy số lượng ký tự cuối cùng từ bên phải chuỗi văn bản.",
    syntax: "RIGHT(text, [num_chars])",
    syntaxVi: "RIGHT(văn_bản, [số_ký_tự])",
    params: [
      { name: "văn_bản", desc: "Chuỗi văn bản cần trích xuất ký tự." },
      { name: "[số_ký_tự]", desc: "Số lượng ký tự muốn lấy tính từ bên phải sang (mặc định là 1).", optional: true }
    ],
    example: "=RIGHT(A1; 4)"
  },
  {
    name: "MID",
    category: "Văn bản",
    desc: "Trả về số ký tự chỉ định từ giữa chuỗi văn bản.",
    syntax: "MID(text, start_num, num_chars)",
    syntaxVi: "MID(văn_bản, vị_trí_bắt_đầu, số_ký_tự)",
    params: [
      { name: "văn_bản", desc: "Chuỗi văn bản gốc cần trích xuất đoạn giữa." },
      { name: "vị_trí_bắt_đầu", desc: "Vị trí của ký tự đầu tiên muốn lấy (bắt đầu từ 1)." },
      { name: "số_ký_tự", desc: "Số lượng ký tự cần lấy ra từ vị trí bắt đầu." }
    ],
    example: "=MID(A1; 2; 5)"
  },
  {
    name: "LEN",
    category: "Văn bản",
    desc: "Trả về số lượng ký tự trong một chuỗi văn bản.",
    syntax: "LEN(text)",
    syntaxVi: "LEN(văn_bản)",
    params: [
      { name: "văn_bản", desc: "Chuỗi văn bản cần đếm tổng số lượng ký tự (bao gồm cả khoảng trắng)." }
    ],
    example: "=LEN(A1)"
  },
  {
    name: "TRIM",
    category: "Văn bản",
    desc: "Xóa bỏ tất cả các khoảng trắng thừa giữa các từ trong chuỗi.",
    syntax: "TRIM(text)",
    syntaxVi: "TRIM(văn_bản)",
    params: [
      { name: "văn_bản", desc: "Chuỗi văn bản cần xóa bỏ các khoảng trắng thừa ở đầu, cuối và giữa các từ." }
    ],
    example: "=TRIM(A1)"
  },
  {
    name: "UPPER",
    category: "Văn bản",
    desc: "Chuyển đổi toàn bộ văn bản thành chữ in hoa.",
    syntax: "UPPER(text)",
    syntaxVi: "UPPER(văn_bản)",
    params: [
      { name: "văn_bản", desc: "Chuỗi văn bản cần chuyển đổi toàn bộ thành chữ in hoa." }
    ],
    example: "=UPPER(A1)"
  },
  {
    name: "LOWER",
    category: "Văn bản",
    desc: "Chuyển đổi toàn bộ văn bản thành chữ in thường.",
    syntax: "LOWER(text)",
    syntaxVi: "LOWER(văn_bản)",
    params: [
      { name: "văn_bản", desc: "Chuỗi văn bản cần chuyển đổi toàn bộ thành chữ in thường." }
    ],
    example: "=LOWER(A1)"
  },
  {
    name: "PROPER",
    category: "Văn bản",
    desc: "Viết hoa chữ cái đầu của mỗi từ trong văn bản.",
    syntax: "PROPER(text)",
    syntaxVi: "PROPER(văn_bản)",
    params: [
      { name: "văn_bản", desc: "Chuỗi văn bản cần viết hoa chữ cái đầu tiên của mỗi từ." }
    ],
    example: "=PROPER(\"nguyễn văn an\")"
  },
  {
    name: "SUBSTITUTE",
    category: "Văn bản",
    desc: "Thay thế chuỗi con trong văn bản.",
    syntax: "SUBSTITUTE(text, old_text, new_text, [instance_num])",
    syntaxVi: "SUBSTITUTE(văn_bản, chuỗi_cũ, chuỗi_mới, [lần_xuất_hiện])",
    params: [
      { name: "văn_bản", desc: "Văn bản gốc chứa chuỗi con cần thay thế." },
      { name: "chuỗi_cũ", desc: "Chuỗi con hiện tại cần được thay thế." },
      { name: "chuỗi_mới", desc: "Chuỗi con mới sẽ được chèn thay cho chuỗi cũ." },
      { name: "[lần_xuất_hiện]", desc: "Chỉ định thứ tự lần xuất hiện cụ thể cần thay thế (nếu bỏ qua sẽ thay thế tất cả).", optional: true }
    ],
    example: "=SUBSTITUTE(A1; \"Hà Nội\"; \"TP.HCM\")"
  },
  {
    name: "TEXT",
    category: "Văn bản",
    desc: "Định dạng số hoặc ngày thành văn bản.",
    syntax: "TEXT(value, format_text)",
    syntaxVi: "TEXT(giá_trị, mẫu_định_dạng)",
    params: [
      { name: "giá_trị", desc: "Số hoặc ngày tháng cần định dạng thành chuỗi văn bản." },
      { name: "mẫu_định_dạng", desc: "Mã định dạng chuẩn trong dấu nháy kép (ví dụ: \"dd/mm/yyyy\" hoặc \"#,##0 đ\")." }
    ],
    example: "=TEXT(TODAY(); \"dd/mm/yyyy\")"
  },
  {
    name: "VALUE",
    category: "Văn bản",
    desc: "Chuyển đổi chuỗi biểu diễn số thành giá trị số.",
    syntax: "VALUE(text)",
    syntaxVi: "VALUE(chuỗi_số)",
    params: [
      { name: "chuỗi_số", desc: "Chuỗi văn bản biểu diễn số hoặc ngày cần chuyển đổi thành giá trị số thực." }
    ],
    example: "=VALUE(\"1250000\")"
  },
  {
    name: "FIND",
    category: "Văn bản",
    desc: "Tìm chuỗi con có phân biệt hoa thường.",
    syntax: "FIND(find_text, within_text, [start_num])",
    syntaxVi: "FIND(chuỗi_tìm, trong_văn_bản, [vị_trí_bắt_đầu])",
    params: [
      { name: "chuỗi_tìm", desc: "Chuỗi con cần tìm kiếm (có phân biệt chữ HOA và chữ thường)." },
      { name: "trong_văn_bản", desc: "Văn bản gốc chứa chuỗi cần tìm." },
      { name: "[vị_trí_bắt_đầu]", desc: "Vị trí ký tự bắt đầu tìm kiếm (mặc định là 1).", optional: true }
    ],
    example: "=FIND(\"A\"; A1; 1)"
  },
  {
    name: "SEARCH",
    category: "Văn bản",
    desc: "Tìm chuỗi con không phân biệt chữ hoa và chữ thường.",
    syntax: "SEARCH(find_text, within_text, [start_num])",
    syntaxVi: "SEARCH(chuỗi_tìm, trong_văn_bản, [vị_trí_bắt_đầu])",
    params: [
      { name: "chuỗi_tìm", desc: "Chuỗi con cần tìm kiếm (không phân biệt hoa thường, hỗ trợ ký tự đại diện ? và *)." },
      { name: "trong_văn_bản", desc: "Văn bản gốc chứa chuỗi cần tìm." },
      { name: "[vị_trí_bắt_đầu]", desc: "Vị trí ký tự bắt đầu tìm kiếm (mặc định là 1).", optional: true }
    ],
    example: "=SEARCH(\"abc\"; A1)"
  },
  {
    name: "EXACT",
    category: "Văn bản",
    desc: "So sánh chính xác hai chuỗi có phân biệt chữ hoa và chữ thường.",
    syntax: "EXACT(text1, text2)",
    syntaxVi: "EXACT(chuỗi1, chuỗi2)",
    params: [
      { name: "chuỗi1", desc: "Chuỗi văn bản thứ nhất để so sánh." },
      { name: "chuỗi2", desc: "Chuỗi văn bản thứ hai để so sánh (phân biệt hoa thường)." }
    ],
    example: "=EXACT(A1; B1)"
  },
  {
    name: "REPT",
    category: "Văn bản",
    desc: "Lặp lại văn bản theo số lần chỉ định.",
    syntax: "REPT(text, number_times)",
    syntaxVi: "REPT(văn_bản, số_lần_lặp)",
    params: [
      { name: "văn_bản", desc: "Chuỗi văn bản cần lặp lại." },
      { name: "số_lần_lặp", desc: "Số lần lặp lại chuỗi văn bản (số nguyên dương)." }
    ],
    example: "=REPT(\"*\"; 5)"
  },
  {
    name: "CLEAN",
    category: "Văn bản",
    desc: "Xóa bỏ tất cả các ký tự không in được khỏi văn bản.",
    syntax: "CLEAN(text)",
    syntaxVi: "CLEAN(văn_bản)",
    params: [
      { name: "văn_bản", desc: "Văn bản chứa các ký tự không in được cần loại bỏ." }
    ],
    example: "=CLEAN(A1)"
  },
  {
    name: "CHAR",
    category: "Văn bản",
    desc: "Trả về ký tự được xác định bởi số mã từ bảng mã ký tự.",
    syntax: "CHAR(number)",
    syntaxVi: "CHAR(mã_ký_tự)",
    params: [
      { name: "mã_ký_tự", desc: "Mã số nguyên từ 1 đến 255 tương ứng với ký tự trong bảng mã." }
    ],
    example: "=CHAR(65)"
  },
  {
    name: "CODE",
    category: "Văn bản",
    desc: "Trả về mã số của ký tự đầu tiên trong chuỗi văn bản.",
    syntax: "CODE(text)",
    syntaxVi: "CODE(văn_bản)",
    params: [
      { name: "văn_bản", desc: "Văn bản cần lấy mã số của ký tự đầu tiên." }
    ],
    example: "=CODE(\"A\")"
  },
  {
    name: "T",
    category: "Văn bản",
    desc: "Trả về giá trị văn bản nếu đối số là văn bản, ngược lại trả về chuỗi rỗng.",
    syntax: "T(value)",
    syntaxVi: "T(giá_trị)",
    params: [
      { name: "giá_trị", desc: "Giá trị cần kiểm tra: trả về chính nó nếu là văn bản, trả về rỗng nếu là số hoặc lỗi." }
    ],
    example: "=T(A1)"
  },
  {
    name: "N",
    category: "Văn bản",
    desc: "Chuyển đổi một giá trị không phải số thành số.",
    syntax: "N(value)",
    syntaxVi: "N(giá_trị)",
    params: [
      { name: "giá_trị", desc: "Giá trị cần chuyển đổi thành số: trả về số, TRUE=1, FALSE=0, văn bản=0." }
    ],
    example: "=N(A1)"
  },

  // ==========================================
  // 6. NGÀY THÁNG (DATE & TIME)
  // ==========================================
  {
    name: "DATE",
    category: "Ngày tháng",
    desc: "Tạo một ngày từ năm, tháng và ngày.",
    syntax: "DATE(year, month, day)",
    syntaxVi: "DATE(năm, tháng, ngày)",
    params: [
      { name: "năm", desc: "Năm theo 4 chữ số (ví dụ: 2026)." },
      { name: "tháng", desc: "Tháng trong năm từ 1 đến 12." },
      { name: "ngày", desc: "Ngày trong tháng từ 1 đến 31." }
    ],
    example: "=DATE(2026; 10; 3)"
  },
  {
    name: "TODAY",
    category: "Ngày tháng",
    desc: "Trả về ngày hiện tại của hệ thống.",
    syntax: "TODAY()",
    syntaxVi: "TODAY()",
    params: [],
    example: "=TODAY()"
  },
  {
    name: "NOW",
    category: "Ngày tháng",
    desc: "Trả về ngày và giờ hiện tại của hệ thống.",
    syntax: "NOW()",
    syntaxVi: "NOW()",
    params: [],
    example: "=NOW()"
  },
  {
    name: "YEAR",
    category: "Ngày tháng",
    desc: "Trả về năm tương ứng của một ngày cụ thể.",
    syntax: "YEAR(date)",
    syntaxVi: "YEAR(ngày_tháng)",
    params: [
      { name: "ngày_tháng", desc: "Giá trị ngày hợp lệ hoặc ô chứa ngày cần lấy năm." }
    ],
    example: "=YEAR(TODAY())"
  },
  {
    name: "MONTH",
    category: "Ngày tháng",
    desc: "Trả về tháng trong năm (từ 1 đến 12).",
    syntax: "MONTH(date)",
    syntaxVi: "MONTH(ngày_tháng)",
    params: [
      { name: "ngày_tháng", desc: "Giá trị ngày hợp lệ hoặc ô chứa ngày cần lấy tháng (1 đến 12)." }
    ],
    example: "=MONTH(TODAY())"
  },
  {
    name: "DAY",
    category: "Ngày tháng",
    desc: "Trả về ngày trong tháng (từ 1 đến 31).",
    syntax: "DAY(date)",
    syntaxVi: "DAY(ngày_tháng)",
    params: [
      { name: "ngày_tháng", desc: "Giá trị ngày hợp lệ hoặc ô chứa ngày cần lấy ngày trong tháng (1 đến 31)." }
    ],
    example: "=DAY(TODAY())"
  },
  {
    name: "DATEDIF",
    category: "Ngày tháng",
    desc: "Tính số ngày, tháng hoặc năm trọn vẹn giữa hai ngày.",
    syntax: "DATEDIF(start_date, end_date, unit)",
    syntaxVi: "DATEDIF(ngày_bắt_đầu, ngày_kết_thúc, đơn_vị)",
    params: [
      { name: "ngày_bắt_đầu", desc: "Ngày mốc bắt đầu của khoảng thời gian." },
      { name: "ngày_kết_thúc", desc: "Ngày mốc kết thúc của khoảng thời gian (phải lớn hơn hoặc bằng ngày bắt đầu)." },
      { name: "đơn_vị", desc: "Đơn vị tính khoảng cách: \"Y\" (năm), \"M\" (tháng), \"D\" (ngày), \"YM\", \"YD\", \"MD\"." }
    ],
    example: "=DATEDIF(A1; TODAY(); \"Y\")"
  },
  {
    name: "EDATE",
    category: "Ngày tháng",
    desc: "Cộng hoặc trừ số tháng vào một ngày.",
    syntax: "EDATE(start_date, months)",
    syntaxVi: "EDATE(ngày_bắt_đầu, số_tháng)",
    params: [
      { name: "ngày_bắt_đầu", desc: "Ngày mốc xuất phát." },
      { name: "số_tháng", desc: "Số tháng cần cộng thêm (số dương) hoặc trừ lùi (số âm)." }
    ],
    example: "=EDATE(TODAY(); 3)"
  },
  {
    name: "EOMONTH",
    category: "Ngày tháng",
    desc: "Trả về ngày cuối tháng trước hoặc sau số tháng chỉ định.",
    syntax: "EOMONTH(start_date, months)",
    syntaxVi: "EOMONTH(ngày_bắt_đầu, số_tháng)",
    params: [
      { name: "ngày_bắt_đầu", desc: "Ngày mốc xuất phát." },
      { name: "số_tháng", desc: "Số tháng trước hoặc sau ngày bắt đầu (0 là ngày cuối tháng hiện tại)." }
    ],
    example: "=EOMONTH(TODAY(); 0)"
  },
  {
    name: "WEEKDAY",
    category: "Ngày tháng",
    desc: "Trả về số thứ tự của ngày trong tuần theo kiểu đánh số chỉ định.",
    syntax: "WEEKDAY(date, [return_type])",
    syntaxVi: "WEEKDAY(ngày_tháng, [kiểu_trả_về])",
    params: [
      { name: "ngày_tháng", desc: "Ngày cần xác định thứ trong tuần." },
      { name: "[kiểu_trả_về]", desc: "Kiểu đánh số thứ: 1 (Chủ nhật=1 đến Thứ bảy=7, mặc định), 2 (Thứ hai=1 đến Chủ nhật=7).", optional: true }
    ],
    example: "=WEEKDAY(TODAY(); 2)"
  },
  {
    name: "DAYS",
    category: "Ngày tháng",
    desc: "Trả về số ngày giữa ngày kết thúc và ngày bắt đầu.",
    syntax: "DAYS(end_date, start_date)",
    syntaxVi: "DAYS(ngày_kết_thúc, ngày_bắt_đầu)",
    params: [
      { name: "ngày_kết_thúc", desc: "Ngày kết thúc của khoảng thời gian." },
      { name: "ngày_bắt_đầu", desc: "Ngày bắt đầu của khoảng thời gian." }
    ],
    example: "=DAYS(B1; A1)"
  },
  {
    name: "NETWORKDAYS",
    category: "Ngày tháng",
    desc: "Đếm số ngày làm việc giữa hai ngày, loại trừ cuối tuần và ngày nghỉ.",
    syntax: "NETWORKDAYS(start_date, end_date, [holidays])",
    syntaxVi: "NETWORKDAYS(ngày_bắt_đầu, ngày_kết_thúc, [ngày_nghỉ_lễ])",
    params: [
      { name: "ngày_bắt_đầu", desc: "Ngày bắt đầu kỳ làm việc." },
      { name: "ngày_kết_thúc", desc: "Ngày kết thúc kỳ làm việc." },
      { name: "[ngày_nghỉ_lễ]", desc: "Vùng ô chứa danh sách các ngày nghỉ lễ cần loại trừ (tùy chọn).", optional: true }
    ],
    example: "=NETWORKDAYS(A1; B1; C1:C10)"
  },
  {
    name: "WORKDAY",
    category: "Ngày tháng",
    desc: "Trả về ngày làm việc trước hoặc sau một số ngày làm việc chỉ định.",
    syntax: "WORKDAY(start_date, days, [holidays])",
    syntaxVi: "WORKDAY(ngày_bắt_đầu, số_ngày_làm_việc, [ngày_nghỉ_lễ])",
    params: [
      { name: "ngày_bắt_đầu", desc: "Ngày bắt đầu công việc." },
      { name: "số_ngày_làm_việc", desc: "Số ngày làm việc không bao gồm thứ 7 và Chủ nhật." },
      { name: "[ngày_nghỉ_lễ]", desc: "Vùng ô chứa danh sách các ngày nghỉ lễ cần bỏ qua (tùy chọn).", optional: true }
    ],
    example: "=WORKDAY(A1; 10; C1:C5)"
  },
  {
    name: "TIME",
    category: "Ngày tháng",
    desc: "Chuyển đổi giờ, phút, giây thành số sê-ri thời gian.",
    syntax: "TIME(hour, minute, second)",
    syntaxVi: "TIME(giờ, phút, giây)",
    params: [
      { name: "giờ", desc: "Số nguyên chỉ giờ từ 0 đến 23." },
      { name: "phút", desc: "Số nguyên chỉ phút từ 0 đến 59." },
      { name: "giây", desc: "Số nguyên chỉ giây từ 0 đến 59." }
    ],
    example: "=TIME(14; 30; 0)"
  },
  {
    name: "HOUR",
    category: "Ngày tháng",
    desc: "Trả về giờ trong một giá trị thời gian (từ 0 đến 23).",
    syntax: "HOUR(serial_number)",
    syntaxVi: "HOUR(thời_gian)",
    params: [
      { name: "thời_gian", desc: "Thời gian hoặc ô chứa giờ cần trích xuất giờ (từ 0 đến 23)." }
    ],
    example: "=HOUR(NOW())"
  },
  {
    name: "MINUTE",
    category: "Ngày tháng",
    desc: "Trả về phút trong một giá trị thời gian (từ 0 đến 59).",
    syntax: "MINUTE(serial_number)",
    syntaxVi: "MINUTE(thời_gian)",
    params: [
      { name: "thời_gian", desc: "Thời gian hoặc ô chứa giờ cần trích xuất phút (từ 0 đến 59)." }
    ],
    example: "=MINUTE(NOW())"
  },
  {
    name: "SECOND",
    category: "Ngày tháng",
    desc: "Trả về giây trong một giá trị thời gian (từ 0 đến 59).",
    syntax: "SECOND(serial_number)",
    syntaxVi: "SECOND(thời_gian)",
    params: [
      { name: "thời_gian", desc: "Thời gian hoặc ô chứa giờ cần trích xuất giây (từ 0 đến 59)." }
    ],
    example: "=SECOND(NOW())"
  },
  {
    name: "YEARFRAC",
    category: "Ngày tháng",
    desc: "Trả về phân số của năm đại diện cho số ngày trọn vẹn giữa hai ngày.",
    syntax: "YEARFRAC(start_date, end_date, [basis])",
    syntaxVi: "YEARFRAC(ngày_bắt_đầu, ngày_kết_thúc, [cơ_sở])",
    params: [
      { name: "ngày_bắt_đầu", desc: "Ngày bắt đầu khoảng thời gian." },
      { name: "ngày_kết_thúc", desc: "Ngày kết thúc khoảng thời gian." },
      { name: "[cơ_sở]", desc: "Kiểu đếm số ngày trong năm: 0 (chuẩn Mỹ 30/360), 1 (ngày thực tế/năm thực tế), 2 (thực tế/360), 3 (thực tế/365).", optional: true }
    ],
    example: "=YEARFRAC(A1; B1; 1)"
  },

  // ==========================================
  // 7. TÀI CHÍNH (FINANCIAL) & ĐẶC BIỆT
  // ==========================================
  {
    name: "PMT",
    category: "Tài chính",
    desc: "Tính khoản thanh toán định kỳ với lãi suất cố định; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ).",
    syntax: "PMT(rate, nper, pv, [fv], [type])",
    syntaxVi: "PMT(lãi_suất, số_kỳ, số_tiền_vay, [giá_trị_tương_lai], [loại_trả])",
    params: [
      { name: "lãi_suất", desc: "Lãi suất mỗi kỳ trả nợ (ví dụ lãi năm chia cho 12)." },
      { name: "số_kỳ", desc: "Tổng số kỳ thanh toán khoản vay hoặc đầu tư." },
      { name: "số_tiền_vay", desc: "Giá trị hiện tại của khoản vay hoặc vốn đầu tư ban đầu." },
      { name: "[giá_trị_tương_lai]", desc: "Giá trị mục tiêu còn lại sau lần trả cuối (mặc định là 0).", optional: true },
      { name: "[loại_trả]", desc: "Thời điểm thanh toán: 0 (cuối kỳ, mặc định) hoặc 1 (đầu kỳ).", optional: true }
    ],
    example: "=PMT(0.08/12; 60; 500000000; 0; 0)"
  },
  {
    name: "FV",
    category: "Tài chính",
    desc: "Tính giá trị tương lai của khoản đầu tư; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ).",
    syntax: "FV(rate, nper, pmt, [pv], [type])",
    syntaxVi: "FV(lãi_suất, số_kỳ, số_tiền_mỗi_kỳ, [giá_trị_hiện_tại], [loại_trả])",
    params: [
      { name: "lãi_suất", desc: "Lãi suất mỗi kỳ hạn đầu tư." },
      { name: "số_kỳ", desc: "Tổng số kỳ thanh toán gửi tiền định kỳ." },
      { name: "số_tiền_mỗi_kỳ", desc: "Khoản tiền đóng định kỳ vào tài khoản mỗi kỳ." },
      { name: "[giá_trị_hiện_tại]", desc: "Số tiền gốc đầu tư ban đầu (mặc định là 0).", optional: true },
      { name: "[loại_trả]", desc: "Thời điểm gửi tiền: 0 (cuối kỳ) hoặc 1 (đầu kỳ).", optional: true }
    ],
    example: "=FV(0.06/12; 24; -2000000; -10000000; 0)"
  },
  {
    name: "PV",
    category: "Tài chính",
    desc: "Tính giá trị hiện tại của khoản đầu tư hoặc chuỗi thanh toán; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ).",
    syntax: "PV(rate, nper, pmt, [fv], [type])",
    syntaxVi: "PV(lãi_suất, số_kỳ, số_tiền_mỗi_kỳ, [giá_trị_tương_lai], [loại_trả])",
    params: [
      { name: "lãi_suất", desc: "Lãi suất chiết khấu mỗi kỳ." },
      { name: "số_kỳ", desc: "Tổng số kỳ thanh toán." },
      { name: "số_tiền_mỗi_kỳ", desc: "Số tiền thanh toán đều đặn ở mỗi kỳ." },
      { name: "[giá_trị_tương_lai]", desc: "Số dư tiền mặt mong muốn nhận được sau kỳ cuối cùng.", optional: true },
      { name: "[loại_trả]", desc: "Thời điểm trả: 0 (cuối kỳ) hoặc 1 (đầu kỳ).", optional: true }
    ],
    example: "=PV(0.05/12; 36; -5000000; 0; 0)"
  },
  {
    name: "NPV",
    category: "Tài chính",
    desc: "Tính giá trị hiện tại ròng của chuỗi dòng tiền đều kỳ; value1 được chiết khấu từ cuối kỳ đầu tiên.",
    syntax: "NPV(rate, value1, [value2], ...)",
    syntaxVi: "NPV(lãi_suất_chiết_khấu, dòng_tiền1, [dòng_tiền2], ...)",
    params: [
      { name: "lãi_suất_chiết_khấu", desc: "Lãi suất chiết khấu trong suốt một kỳ hạn." },
      { name: "dòng_tiền1", desc: "Khoản tiền hoặc vùng ô chứa dòng tiền từ kỳ thứ nhất." },
      { name: "[dòng_tiền2]", desc: "Các dòng tiền từ kỳ thứ hai trở đi.", optional: true },
      { name: "...", desc: "Các dòng tiền bổ sung tiếp theo.", optional: true }
    ],
    example: "=NPV(0.1; C2:C6)"
  },
  {
    name: "IRR",
    category: "Tài chính",
    desc: "Tính tỷ suất hoàn vốn nội bộ của chuỗi dòng tiền có ít nhất một giá trị âm và một giá trị dương.",
    syntax: "IRR(values, [guess])",
    syntaxVi: "IRR(chuỗi_dòng_tiền, [dự_đoán])",
    params: [
      { name: "chuỗi_dòng_tiền", desc: "Mảng hoặc vùng ô chứa các số biểu diễn chi phí đầu tư ban đầu (âm) và thu nhập thu về (dương)." },
      { name: "[dự_đoán]", desc: "Lãi suất ước lượng ban đầu (mặc định là 0.1 tức 10%).", optional: true }
    ],
    example: "=IRR(B1:B10; 0.1)"
  },
  {
    name: "RATE",
    category: "Tài chính",
    desc: "Tính lãi suất mỗi kỳ của niên kim; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ), guess là giá trị dự đoán ban đầu.",
    syntax: "RATE(nper, pmt, pv, [fv], [type], [guess])",
    syntaxVi: "RATE(số_kỳ, số_tiền_mỗi_kỳ, giá_trị_hiện_tại, [giá_trị_tương_lai], [loại_trả], [dự_đoán])",
    params: [
      { name: "số_kỳ", desc: "Tổng số kỳ thanh toán của niên kim." },
      { name: "số_tiền_mỗi_kỳ", desc: "Khoản tiền thanh toán mỗi kỳ." },
      { name: "giá_trị_hiện_tại", desc: "Tổng giá trị hiện tại của khoản vay hoặc đầu tư." },
      { name: "[giá_trị_tương_lai]", desc: "Giá trị tương lai còn lại sau lần trả cuối.", optional: true },
      { name: "[loại_trả]", desc: "Thời điểm thanh toán: 0 (cuối kỳ) hoặc 1 (đầu kỳ).", optional: true },
      { name: "[dự_đoán]", desc: "Giá trị dự đoán ban đầu cho lãi suất (mặc định là 10%).", optional: true }
    ],
    example: "=RATE(48; -5000000; 200000000)"
  },
  {
    name: "NPER",
    category: "Tài chính",
    desc: "Tính số kỳ cần thiết để hoàn tất khoản vay hoặc đạt mục tiêu đầu tư với khoản thanh toán cố định; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ).",
    syntax: "NPER(rate, pmt, pv, [fv], [type])",
    syntaxVi: "NPER(lãi_suất, số_tiền_mỗi_kỳ, giá_trị_hiện_tại, [giá_trị_tương_lai], [loại_trả])",
    params: [
      { name: "lãi_suất", desc: "Lãi suất mỗi kỳ." },
      { name: "số_tiền_mỗi_kỳ", desc: "Khoản tiền trả đều đặn mỗi kỳ." },
      { name: "giá_trị_hiện_tại", desc: "Giá trị khoản vay hoặc khoản tiền ban đầu." },
      { name: "[giá_trị_tương_lai]", desc: "Giá trị tương lai hoặc số dư mục tiêu (mặc định là 0).", optional: true },
      { name: "[loại_trả]", desc: "Thời điểm trả tiền: 0 (cuối kỳ) hoặc 1 (đầu kỳ).", optional: true }
    ],
    example: "=NPER(0.08/12; -6000000; 250000000)"
  },
  {
    name: "IPMT",
    category: "Tài chính",
    desc: "Tính phần tiền lãi trong khoản thanh toán tại kỳ per; per phải từ 1 đến nper, type là 0 (cuối kỳ) hoặc 1 (đầu kỳ).",
    syntax: "IPMT(rate, per, nper, pv, [fv], [type])",
    syntaxVi: "IPMT(lãi_suất, kỳ_cần_tính, số_kỳ, giá_trị_hiện_tại, [giá_trị_tương_lai], [loại_trả])",
    params: [
      { name: "lãi_suất", desc: "Lãi suất mỗi kỳ." },
      { name: "kỳ_cần_tính", desc: "Số thứ tự của kỳ cần tính lãi (từ 1 đến tổng số kỳ nper)." },
      { name: "số_kỳ", desc: "Tổng số kỳ thanh toán." },
      { name: "giá_trị_hiện_tại", desc: "Số tiền vay hiện tại ban đầu." },
      { name: "[giá_trị_tương_lai]", desc: "Số dư mục tiêu sau lần trả cuối.", optional: true },
      { name: "[loại_trả]", desc: "Thời điểm trả: 0 (cuối kỳ) hoặc 1 (đầu kỳ).", optional: true }
    ],
    example: "=IPMT(0.08/12; 1; 36; 100000000)"
  },
  {
    name: "PPMT",
    category: "Tài chính",
    desc: "Tính phần tiền gốc trong khoản thanh toán tại kỳ per; per phải từ 1 đến nper, type là 0 (cuối kỳ) hoặc 1 (đầu kỳ).",
    syntax: "PPMT(rate, per, nper, pv, [fv], [type])",
    syntaxVi: "PPMT(lãi_suất, kỳ_cần_tính, số_kỳ, giá_trị_hiện_tại, [giá_trị_tương_lai], [loại_trả])",
    params: [
      { name: "lãi_suất", desc: "Lãi suất mỗi kỳ." },
      { name: "kỳ_cần_tính", desc: "Số thứ tự của kỳ cần tính tiền gốc (từ 1 đến tổng số kỳ nper)." },
      { name: "số_kỳ", desc: "Tổng số kỳ thanh toán." },
      { name: "giá_trị_hiện_tại", desc: "Số tiền vay hiện tại ban đầu." },
      { name: "[giá_trị_tương_lai]", desc: "Số dư mục tiêu sau lần trả cuối.", optional: true },
      { name: "[loại_trả]", desc: "Thời điểm trả: 0 (cuối kỳ) hoặc 1 (đầu kỳ).", optional: true }
    ],
    example: "=PPMT(0.08/12; 1; 36; 100000000)"
  },
  {
    name: "SLN",
    category: "Tài chính",
    desc: "Tính khấu hao đường thẳng mỗi kỳ từ nguyên giá, giá trị thu hồi và thời gian sử dụng.",
    syntax: "SLN(cost, salvage, life)",
    syntaxVi: "SLN(nguyên_giá, giá_trị_thu_hồi, thời_gian_sử_dụng)",
    params: [
      { name: "nguyên_giá", desc: "Chi phí ban đầu của tài sản khi mua." },
      { name: "giá_trị_thu_hồi", desc: "Giá trị còn lại có thể thu hồi được của tài sản ở cuối thời gian sử dụng." },
      { name: "thời_gian_sử_dụng", desc: "Số kỳ tính khấu hao (tuổi thọ sử dụng hữu ích của tài sản)." }
    ],
    example: "=SLN(100000000; 10000000; 5)"
  },
  {
    name: "DB",
    category: "Tài chính",
    desc: "Tính khấu hao theo số dư giảm dần cố định; month là số tháng trong năm đầu tiên (mặc định 12).",
    syntax: "DB(cost, salvage, life, period, [month])",
    syntaxVi: "DB(nguyên_giá, giá_trị_thu_hồi, thời_gian_sử_dụng, kỳ_tính, [số_tháng_năm_đầu])",
    params: [
      { name: "nguyên_giá", desc: "Chi phí mua ban đầu của tài sản." },
      { name: "giá_trị_thu_hồi", desc: "Giá trị tài sản ở cuối chu kỳ khấu hao." },
      { name: "thời_gian_sử_dụng", desc: "Tổng số kỳ khấu hao của tài sản." },
      { name: "kỳ_tính", desc: "Kỳ cụ thể muốn tính giá trị khấu hao (phải cùng đơn vị với thời_gian_sử_dụng)." },
      { name: "[số_tháng_năm_đầu]", desc: "Số tháng sử dụng trong năm đầu tiên (mặc định là 12 nếu mua từ đầu năm).", optional: true }
    ],
    example: "=DB(100000000; 10000000; 5; 1; 12)"
  },
  {
    name: "VND",
    category: "Tài chính",
    desc: "Chuyển đổi số tiền thành chữ tiếng Việt (ví dụ: 1250000 → Một triệu hai trăm năm mươi ngàn đồng chẵn).",
    syntax: "VND(number)",
    syntaxVi: "VND(số_tiền)",
    params: [
      { name: "số_tiền", desc: "Số tiền cần đọc thành chữ tiếng Việt chuẩn." }
    ],
    example: "=VND(1500000)"
  }
];

export const VI_FORMULA_MAP = new Map(VI_FORMULA_CATALOG.map(item => [item.name, item]));
