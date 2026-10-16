/** Lightweight Sheet style data shared by the grid and its lazy style dialogs. */
export const CELL_STYLE_PRESETS = [
  {
    id: "normal",
    nameKey: "sheetStyles.normal",
    defaultName: "Bình thường (Normal)",
    style: {
      backgroundColor: "",
      color: "#0f172a",
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      border: "",
      borderTop: "",
      borderBottom: "",
      fontSize: "13px"
    },
    previewText: "Normal (Mặc định)",
    description: "Định dạng ô mặc định, xóa mọi màu và hiệu ứng"
  },
  {
    id: "good",
    nameKey: "sheetStyles.good",
    defaultName: "Tốt (Good)",
    style: {
      backgroundColor: "#c6efce",
      color: "#006100",
      fontWeight: "normal",
      border: "1px solid #86efac"
    },
    previewText: "Tốt / Đạt (100%)",
    description: "Nền xanh lá nhạt, chữ xanh lá đậm — dùng cho chỉ số tốt"
  },
  {
    id: "bad",
    nameKey: "sheetStyles.bad",
    defaultName: "Kém / Xấu (Bad)",
    style: {
      backgroundColor: "#ffc7ce",
      color: "#9c0006",
      fontWeight: "normal",
      border: "1px solid #fca5a5"
    },
    previewText: "Cảnh báo / Kém",
    description: "Nền đỏ nhạt, chữ đỏ sẫm — dùng cho số liệu cảnh báo, sụt giảm"
  },
  {
    id: "neutral",
    nameKey: "sheetStyles.neutral",
    defaultName: "Trung tính (Neutral)",
    style: {
      backgroundColor: "#ffeb9c",
      color: "#9c6500",
      fontWeight: "normal",
      border: "1px solid #fde047"
    },
    previewText: "Chờ xử lý / Đang xem xét",
    description: "Nền vàng kem nhạt, chữ nâu vàng đậm — dùng cho số liệu trung tính"
  },
  {
    id: "heading1",
    nameKey: "sheetStyles.heading1",
    defaultName: "Tiêu đề 1 (Heading 1)",
    style: {
      color: "#1e3a8a",
      fontWeight: "bold",
      fontSize: "16px",
      borderBottom: "2px solid #1e3a8a",
      backgroundColor: ""
    },
    previewText: "Tiêu đề lớn cấp 1",
    description: "Chữ lớn 16px in đậm màu xanh đậm, có gạch chân dày"
  },
  {
    id: "heading2",
    nameKey: "sheetStyles.heading2",
    defaultName: "Tiêu đề 2 (Heading 2)",
    style: {
      color: "#1e3a8a",
      fontWeight: "bold",
      fontSize: "14px",
      borderBottom: "1px solid #1e3a8a",
      backgroundColor: ""
    },
    previewText: "Tiêu đề mục cấp 2",
    description: "Chữ vừa 14px in đậm có viền dưới"
  },
  {
    id: "input",
    nameKey: "sheetStyles.input",
    defaultName: "Ô nhập liệu (Input)",
    style: {
      backgroundColor: "#fff2cc",
      color: "#3f3f76",
      fontWeight: "normal",
      border: "1px solid #94a3b8"
    },
    previewText: "Nhập dữ liệu vào đây",
    description: "Nền vàng kem viền xám mỏng — đánh dấu ô để người dùng nhập"
  },
  {
    id: "currency",
    nameKey: "sheetStyles.currency",
    defaultName: "Tiền tệ (Currency)",
    style: {
      fontWeight: "normal",
      textAlign: "right",
      backgroundColor: "#f8fafc"
    },
    numberFormat: {
      category: "currency",
      decimals: 0,
      currencySymbol: "₫",
      symbolPosition: "after"
    },
    previewText: "1.250.000 ₫",
    description: "Định dạng số tiền chuẩn VNĐ kèm nền nhẹ"
  },
  {
    id: "total",
    nameKey: "sheetStyles.total",
    defaultName: "Tổng cộng (Total)",
    style: {
      fontWeight: "bold",
      color: "#0f172a",
      borderTop: "1px solid #0f172a",
      borderBottom: "3px double #0f172a",
      backgroundColor: ""
    },
    previewText: "Tổng cộng: 15.800.000",
    description: "Chữ đậm, viền trên nét đơn, viền dưới nét đôi kế toán"
  },
  {
    id: "accent",
    nameKey: "sheetStyles.accent",
    defaultName: "Điểm nhấn (Accent)",
    style: {
      backgroundColor: "#dbeafe",
      color: "#1e40af",
      fontWeight: "bold",
      border: "1px solid #93c5fd"
    },
    previewText: "Nổi bật quan trọng",
    description: "Nền xanh lam nhạt, chữ xanh dương đậm nổi bật"
  }
];

export const TABLE_STYLE_PRESETS = [
  {
    "id": "TableStyleLight1",
    "category": "light",
    "excelStyle": "TableStyleLight1",
    "nameKey": "sheetTableStyles.tablestylelight1",
    "defaultName": "Sáng 1 (Xám)",
    "primaryColor": "#000000",
    "headerStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000",
      "fontWeight": "bold",
      "borderBottom": "1px solid #000000"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000"
    },
    "oddRowStyle": {
      "backgroundColor": "#d9d9d9",
      "color": "#000000"
    },
    "firstColStyle": {
      "backgroundColor": "#d9d9d9",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#d9d9d9",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#d9d9d9"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000",
      "fontWeight": "bold",
      "borderTop": "1px solid #000000",
      "borderBottom": "3px double #000000"
    }
  },
  {
    "id": "TableStyleLight2",
    "category": "light",
    "excelStyle": "TableStyleLight2",
    "nameKey": "sheetTableStyles.tablestylelight2",
    "defaultName": "Sáng 2 (Xanh lam)",
    "primaryColor": "#2f75b5",
    "headerStyle": {
      "backgroundColor": "#ffffff",
      "color": "#2f75b5",
      "fontWeight": "bold",
      "borderBottom": "1px solid #5b9bd5"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#2f75b5"
    },
    "oddRowStyle": {
      "backgroundColor": "#ddebf7",
      "color": "#2f75b5"
    },
    "firstColStyle": {
      "backgroundColor": "#ddebf7",
      "color": "#2f75b5",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#ddebf7",
      "color": "#2f75b5",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#ddebf7"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#2f75b5",
      "fontWeight": "bold",
      "borderTop": "1px solid #5b9bd5",
      "borderBottom": "3px double #5b9bd5"
    }
  },
  {
    "id": "TableStyleLight3",
    "category": "light",
    "excelStyle": "TableStyleLight3",
    "nameKey": "sheetTableStyles.tablestylelight3",
    "defaultName": "Sáng 3 (Cam)",
    "primaryColor": "#c65911",
    "headerStyle": {
      "backgroundColor": "#ffffff",
      "color": "#c65911",
      "fontWeight": "bold",
      "borderBottom": "1px solid #ed7d31"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#c65911"
    },
    "oddRowStyle": {
      "backgroundColor": "#fce4d6",
      "color": "#c65911"
    },
    "firstColStyle": {
      "backgroundColor": "#fce4d6",
      "color": "#c65911",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#fce4d6",
      "color": "#c65911",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#fce4d6"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#c65911",
      "fontWeight": "bold",
      "borderTop": "1px solid #ed7d31",
      "borderBottom": "3px double #ed7d31"
    }
  },
  {
    "id": "TableStyleLight4",
    "category": "light",
    "excelStyle": "TableStyleLight4",
    "nameKey": "sheetTableStyles.tablestylelight4",
    "defaultName": "Sáng 4 (Xám tro)",
    "primaryColor": "#7b7b7b",
    "headerStyle": {
      "backgroundColor": "#ffffff",
      "color": "#7b7b7b",
      "fontWeight": "bold",
      "borderBottom": "1px solid #a5a5a5"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#7b7b7b"
    },
    "oddRowStyle": {
      "backgroundColor": "#ededed",
      "color": "#7b7b7b"
    },
    "firstColStyle": {
      "backgroundColor": "#ededed",
      "color": "#7b7b7b",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#ededed",
      "color": "#7b7b7b",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#ededed"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#7b7b7b",
      "fontWeight": "bold",
      "borderTop": "1px solid #a5a5a5",
      "borderBottom": "3px double #a5a5a5"
    }
  },
  {
    "id": "TableStyleLight5",
    "category": "light",
    "excelStyle": "TableStyleLight5",
    "nameKey": "sheetTableStyles.tablestylelight5",
    "defaultName": "Sáng 5 (Vàng)",
    "primaryColor": "#bf8f00",
    "headerStyle": {
      "backgroundColor": "#ffffff",
      "color": "#bf8f00",
      "fontWeight": "bold",
      "borderBottom": "1px solid #ffc000"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#bf8f00"
    },
    "oddRowStyle": {
      "backgroundColor": "#fff2cc",
      "color": "#bf8f00"
    },
    "firstColStyle": {
      "backgroundColor": "#fff2cc",
      "color": "#bf8f00",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#fff2cc",
      "color": "#bf8f00",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#fff2cc"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#bf8f00",
      "fontWeight": "bold",
      "borderTop": "1px solid #ffc000",
      "borderBottom": "3px double #ffc000"
    }
  },
  {
    "id": "TableStyleLight6",
    "category": "light",
    "excelStyle": "TableStyleLight6",
    "nameKey": "sheetTableStyles.tablestylelight6",
    "defaultName": "Sáng 6 (Xanh dương)",
    "primaryColor": "#305496",
    "headerStyle": {
      "backgroundColor": "#ffffff",
      "color": "#305496",
      "fontWeight": "bold",
      "borderBottom": "1px solid #4472c4"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#305496"
    },
    "oddRowStyle": {
      "backgroundColor": "#d9e1f2",
      "color": "#305496"
    },
    "firstColStyle": {
      "backgroundColor": "#d9e1f2",
      "color": "#305496",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#d9e1f2",
      "color": "#305496",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#d9e1f2"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#305496",
      "fontWeight": "bold",
      "borderTop": "1px solid #4472c4",
      "borderBottom": "3px double #4472c4"
    }
  },
  {
    "id": "TableStyleLight7",
    "category": "light",
    "excelStyle": "TableStyleLight7",
    "nameKey": "sheetTableStyles.tablestylelight7",
    "defaultName": "Sáng 7 (Xanh lá)",
    "primaryColor": "#548235",
    "headerStyle": {
      "backgroundColor": "#ffffff",
      "color": "#548235",
      "fontWeight": "bold",
      "borderBottom": "1px solid #70ad47"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#548235"
    },
    "oddRowStyle": {
      "backgroundColor": "#e2efda",
      "color": "#548235"
    },
    "firstColStyle": {
      "backgroundColor": "#e2efda",
      "color": "#548235",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#e2efda",
      "color": "#548235",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#e2efda"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#548235",
      "fontWeight": "bold",
      "borderTop": "1px solid #70ad47",
      "borderBottom": "3px double #70ad47"
    }
  },
  {
    "id": "TableStyleMedium1",
    "category": "medium",
    "excelStyle": "TableStyleMedium1",
    "nameKey": "sheetTableStyles.tablestylemedium1",
    "defaultName": "Trung bình 1 (Đen xám)",
    "primaryColor": "#000000",
    "headerStyle": {
      "backgroundColor": "#000000",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #000000"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000"
    },
    "oddRowStyle": {
      "backgroundColor": "#d9d9d9",
      "color": "#000000"
    },
    "firstColStyle": {
      "backgroundColor": "#d9d9d9",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#d9d9d9",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#d9d9d9"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000",
      "fontWeight": "bold",
      "borderTop": "1px solid #000000",
      "borderBottom": "3px double #000000"
    }
  },
  {
    "id": "TableStyleMedium2",
    "category": "medium",
    "excelStyle": "TableStyleMedium2",
    "nameKey": "sheetTableStyles.tablestylemedium2",
    "defaultName": "Trung bình 2 (Xanh lam)",
    "primaryColor": "#5b9bd5",
    "headerStyle": {
      "backgroundColor": "#5b9bd5",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #9bc2e6"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000"
    },
    "oddRowStyle": {
      "backgroundColor": "#ddebf7",
      "color": "#000000"
    },
    "firstColStyle": {
      "backgroundColor": "#ddebf7",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#ddebf7",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#ddebf7"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000",
      "fontWeight": "bold",
      "borderTop": "1px solid #5b9bd5",
      "borderBottom": "3px double #9bc2e6"
    }
  },
  {
    "id": "TableStyleMedium3",
    "category": "medium",
    "excelStyle": "TableStyleMedium3",
    "nameKey": "sheetTableStyles.tablestylemedium3",
    "defaultName": "Trung bình 3 (Cam)",
    "primaryColor": "#ed7d31",
    "headerStyle": {
      "backgroundColor": "#ed7d31",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #f4b084"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000"
    },
    "oddRowStyle": {
      "backgroundColor": "#fce4d6",
      "color": "#000000"
    },
    "firstColStyle": {
      "backgroundColor": "#fce4d6",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#fce4d6",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#fce4d6"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000",
      "fontWeight": "bold",
      "borderTop": "1px solid #ed7d31",
      "borderBottom": "3px double #f4b084"
    }
  },
  {
    "id": "TableStyleMedium4",
    "category": "medium",
    "excelStyle": "TableStyleMedium4",
    "nameKey": "sheetTableStyles.tablestylemedium4",
    "defaultName": "Trung bình 4 (Xám)",
    "primaryColor": "#a5a5a5",
    "headerStyle": {
      "backgroundColor": "#a5a5a5",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #c9c9c9"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000"
    },
    "oddRowStyle": {
      "backgroundColor": "#ededed",
      "color": "#000000"
    },
    "firstColStyle": {
      "backgroundColor": "#ededed",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#ededed",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#ededed"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000",
      "fontWeight": "bold",
      "borderTop": "1px solid #a5a5a5",
      "borderBottom": "3px double #c9c9c9"
    }
  },
  {
    "id": "TableStyleMedium5",
    "category": "medium",
    "excelStyle": "TableStyleMedium5",
    "nameKey": "sheetTableStyles.tablestylemedium5",
    "defaultName": "Trung bình 5 (Vàng)",
    "primaryColor": "#ffc000",
    "headerStyle": {
      "backgroundColor": "#ffc000",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #ffd966"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000"
    },
    "oddRowStyle": {
      "backgroundColor": "#fff2cc",
      "color": "#000000"
    },
    "firstColStyle": {
      "backgroundColor": "#fff2cc",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#fff2cc",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#fff2cc"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000",
      "fontWeight": "bold",
      "borderTop": "1px solid #ffc000",
      "borderBottom": "3px double #ffd966"
    }
  },
  {
    "id": "TableStyleMedium6",
    "category": "medium",
    "excelStyle": "TableStyleMedium6",
    "nameKey": "sheetTableStyles.tablestylemedium6",
    "defaultName": "Trung bình 6 (Xanh dương)",
    "primaryColor": "#4472c4",
    "headerStyle": {
      "backgroundColor": "#4472c4",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #8ea9db"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000"
    },
    "oddRowStyle": {
      "backgroundColor": "#d9e1f2",
      "color": "#000000"
    },
    "firstColStyle": {
      "backgroundColor": "#d9e1f2",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#d9e1f2",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#d9e1f2"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000",
      "fontWeight": "bold",
      "borderTop": "1px solid #4472c4",
      "borderBottom": "3px double #8ea9db"
    }
  },
  {
    "id": "TableStyleMedium7",
    "category": "medium",
    "excelStyle": "TableStyleMedium7",
    "nameKey": "sheetTableStyles.tablestylemedium7",
    "defaultName": "Trung bình 7 (Xanh lá)",
    "primaryColor": "#70ad47",
    "headerStyle": {
      "backgroundColor": "#70ad47",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #a9d08e"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000"
    },
    "oddRowStyle": {
      "backgroundColor": "#e2efda",
      "color": "#000000"
    },
    "firstColStyle": {
      "backgroundColor": "#e2efda",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#e2efda",
      "color": "#000000",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#e2efda"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#000000",
      "fontWeight": "bold",
      "borderTop": "1px solid #70ad47",
      "borderBottom": "3px double #a9d08e"
    }
  },
  {
    "id": "TableStyleDark1",
    "category": "dark",
    "excelStyle": "TableStyleDark1",
    "nameKey": "sheetTableStyles.tablestyledark1",
    "defaultName": "Tối 1 (Đen)",
    "primaryColor": "#000000",
    "headerStyle": {
      "backgroundColor": "#000000",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #ffffff"
    },
    "evenRowStyle": {
      "backgroundColor": "#737373",
      "color": "#ffffff"
    },
    "oddRowStyle": {
      "backgroundColor": "#404040",
      "color": "#ffffff"
    },
    "firstColStyle": {
      "backgroundColor": "#404040",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#404040",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#737373"
    },
    "colBand2Style": {
      "backgroundColor": "#404040"
    },
    "totalStyle": {
      "backgroundColor": "#262626",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderTop": "1px solid #ffffff",
      "borderBottom": "3px double #000000"
    }
  },
  {
    "id": "TableStyleDark2",
    "category": "dark",
    "excelStyle": "TableStyleDark2",
    "nameKey": "sheetTableStyles.tablestyledark2",
    "defaultName": "Tối 2 (Xanh lam)",
    "primaryColor": "#000000",
    "headerStyle": {
      "backgroundColor": "#000000",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #ffffff"
    },
    "evenRowStyle": {
      "backgroundColor": "#5b9bd5",
      "color": "#ffffff"
    },
    "oddRowStyle": {
      "backgroundColor": "#2f75b5",
      "color": "#ffffff"
    },
    "firstColStyle": {
      "backgroundColor": "#2f75b5",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#2f75b5",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#5b9bd5"
    },
    "colBand2Style": {
      "backgroundColor": "#2f75b5"
    },
    "totalStyle": {
      "backgroundColor": "#1f4e78",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderTop": "1px solid #ffffff",
      "borderBottom": "3px double #000000"
    }
  },
  {
    "id": "TableStyleDark3",
    "category": "dark",
    "excelStyle": "TableStyleDark3",
    "nameKey": "sheetTableStyles.tablestyledark3",
    "defaultName": "Tối 3 (Cam)",
    "primaryColor": "#000000",
    "headerStyle": {
      "backgroundColor": "#000000",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #ffffff"
    },
    "evenRowStyle": {
      "backgroundColor": "#ed7d31",
      "color": "#ffffff"
    },
    "oddRowStyle": {
      "backgroundColor": "#c65911",
      "color": "#ffffff"
    },
    "firstColStyle": {
      "backgroundColor": "#c65911",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#c65911",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ed7d31"
    },
    "colBand2Style": {
      "backgroundColor": "#c65911"
    },
    "totalStyle": {
      "backgroundColor": "#833c0c",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderTop": "1px solid #ffffff",
      "borderBottom": "3px double #000000"
    }
  },
  {
    "id": "TableStyleDark4",
    "category": "dark",
    "excelStyle": "TableStyleDark4",
    "nameKey": "sheetTableStyles.tablestyledark4",
    "defaultName": "Tối 4 (Xám)",
    "primaryColor": "#000000",
    "headerStyle": {
      "backgroundColor": "#000000",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #ffffff"
    },
    "evenRowStyle": {
      "backgroundColor": "#a5a5a5",
      "color": "#ffffff"
    },
    "oddRowStyle": {
      "backgroundColor": "#7b7b7b",
      "color": "#ffffff"
    },
    "firstColStyle": {
      "backgroundColor": "#7b7b7b",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#7b7b7b",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#a5a5a5"
    },
    "colBand2Style": {
      "backgroundColor": "#7b7b7b"
    },
    "totalStyle": {
      "backgroundColor": "#525252",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderTop": "1px solid #ffffff",
      "borderBottom": "3px double #000000"
    }
  },
  {
    "id": "TableStyleDark5",
    "category": "dark",
    "excelStyle": "TableStyleDark5",
    "nameKey": "sheetTableStyles.tablestyledark5",
    "defaultName": "Tối 5 (Vàng)",
    "primaryColor": "#000000",
    "headerStyle": {
      "backgroundColor": "#000000",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #ffffff"
    },
    "evenRowStyle": {
      "backgroundColor": "#ffc000",
      "color": "#ffffff"
    },
    "oddRowStyle": {
      "backgroundColor": "#bf8f00",
      "color": "#ffffff"
    },
    "firstColStyle": {
      "backgroundColor": "#bf8f00",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#bf8f00",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffc000"
    },
    "colBand2Style": {
      "backgroundColor": "#bf8f00"
    },
    "totalStyle": {
      "backgroundColor": "#806000",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderTop": "1px solid #ffffff",
      "borderBottom": "3px double #000000"
    }
  },
  {
    "id": "TableStyleDark6",
    "category": "dark",
    "excelStyle": "TableStyleDark6",
    "nameKey": "sheetTableStyles.tablestyledark6",
    "defaultName": "Tối 6 (Xanh dương)",
    "primaryColor": "#000000",
    "headerStyle": {
      "backgroundColor": "#000000",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #ffffff"
    },
    "evenRowStyle": {
      "backgroundColor": "#4472c4",
      "color": "#ffffff"
    },
    "oddRowStyle": {
      "backgroundColor": "#305496",
      "color": "#ffffff"
    },
    "firstColStyle": {
      "backgroundColor": "#305496",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#305496",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#4472c4"
    },
    "colBand2Style": {
      "backgroundColor": "#305496"
    },
    "totalStyle": {
      "backgroundColor": "#203764",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderTop": "1px solid #ffffff",
      "borderBottom": "3px double #000000"
    }
  },
  {
    "id": "TableStyleDark7",
    "category": "dark",
    "excelStyle": "TableStyleDark7",
    "nameKey": "sheetTableStyles.tablestyledark7",
    "defaultName": "Tối 7 (Xanh lá)",
    "primaryColor": "#000000",
    "headerStyle": {
      "backgroundColor": "#000000",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderBottom": "1px solid #ffffff"
    },
    "evenRowStyle": {
      "backgroundColor": "#70ad47",
      "color": "#ffffff"
    },
    "oddRowStyle": {
      "backgroundColor": "#548235",
      "color": "#ffffff"
    },
    "firstColStyle": {
      "backgroundColor": "#548235",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#548235",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#70ad47"
    },
    "colBand2Style": {
      "backgroundColor": "#548235"
    },
    "totalStyle": {
      "backgroundColor": "#375623",
      "color": "#ffffff",
      "fontWeight": "bold",
      "borderTop": "1px solid #ffffff",
      "borderBottom": "3px double #000000"
    }
  },
  {
    "id": "tableBlue",
    "excelStyle": "TableStyleMedium2",
    "nameKey": "sheetTableStyles.blue",
    "defaultName": "Bảng Xanh Lam (Blue)",
    "primaryColor": "#2563eb",
    "headerStyle": {
      "backgroundColor": "#2563eb",
      "color": "#ffffff",
      "fontWeight": "bold",
      "border": "1px solid #1d4ed8"
    },
    "evenRowStyle": {
      "backgroundColor": "#f0f7ff",
      "color": "#0f172a",
      "border": "1px solid #cbd5e1"
    },
    "oddRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#0f172a",
      "border": "1px solid #cbd5e1"
    },
    "firstColStyle": {
      "backgroundColor": "#f0f7ff",
      "color": "#0f172a",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#f0f7ff",
      "color": "#0f172a",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#f0f7ff"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#0f172a",
      "fontWeight": "bold",
      "borderTop": "1px solid #2563eb",
      "borderBottom": "3px double #2563eb"
    }
  },
  {
    "id": "tableGreen",
    "excelStyle": "TableStyleMedium4",
    "nameKey": "sheetTableStyles.green",
    "defaultName": "Bảng Xanh Lá (Green)",
    "primaryColor": "#16a34a",
    "headerStyle": {
      "backgroundColor": "#16a34a",
      "color": "#ffffff",
      "fontWeight": "bold",
      "border": "1px solid #15803d"
    },
    "evenRowStyle": {
      "backgroundColor": "#f0fdf4",
      "color": "#0f172a",
      "border": "1px solid #bbf7d0"
    },
    "oddRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#0f172a",
      "border": "1px solid #bbf7d0"
    },
    "firstColStyle": {
      "backgroundColor": "#f0fdf4",
      "color": "#0f172a",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#f0fdf4",
      "color": "#0f172a",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#f0fdf4"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#0f172a",
      "fontWeight": "bold",
      "borderTop": "1px solid #16a34a",
      "borderBottom": "3px double #16a34a"
    }
  },
  {
    "id": "tableDark",
    "excelStyle": "TableStyleDark1",
    "nameKey": "sheetTableStyles.dark",
    "defaultName": "Bảng Xám Đậm (Dark Slate)",
    "primaryColor": "#334155",
    "headerStyle": {
      "backgroundColor": "#334155",
      "color": "#ffffff",
      "fontWeight": "bold",
      "border": "1px solid #1e293b"
    },
    "evenRowStyle": {
      "backgroundColor": "#f8fafc",
      "color": "#0f172a",
      "border": "1px solid #e2e8f0"
    },
    "oddRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#0f172a",
      "border": "1px solid #e2e8f0"
    },
    "firstColStyle": {
      "backgroundColor": "#f8fafc",
      "color": "#0f172a",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#f8fafc",
      "color": "#0f172a",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#f8fafc"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#0f172a",
      "fontWeight": "bold",
      "borderTop": "1px solid #334155",
      "borderBottom": "3px double #334155"
    }
  },
  {
    "id": "tableOrange",
    "excelStyle": "TableStyleMedium3",
    "nameKey": "sheetTableStyles.orange",
    "defaultName": "Bảng Cam Ấm (Warm Orange)",
    "primaryColor": "#ea580c",
    "headerStyle": {
      "backgroundColor": "#ea580c",
      "color": "#ffffff",
      "fontWeight": "bold",
      "border": "1px solid #c2410c"
    },
    "evenRowStyle": {
      "backgroundColor": "#fff7ed",
      "color": "#0f172a",
      "border": "1px solid #fed7aa"
    },
    "oddRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#0f172a",
      "border": "1px solid #fed7aa"
    },
    "firstColStyle": {
      "backgroundColor": "#fff7ed",
      "color": "#0f172a",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#fff7ed",
      "color": "#0f172a",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#fff7ed"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#0f172a",
      "fontWeight": "bold",
      "borderTop": "1px solid #ea580c",
      "borderBottom": "3px double #ea580c"
    }
  },
  {
    "id": "tablePurple",
    "excelStyle": "TableStyleMedium6",
    "nameKey": "sheetTableStyles.purple",
    "defaultName": "Bảng Tím Hiện Đại (Purple)",
    "primaryColor": "#7c3aed",
    "headerStyle": {
      "backgroundColor": "#7c3aed",
      "color": "#ffffff",
      "fontWeight": "bold",
      "border": "1px solid #6d28d9"
    },
    "evenRowStyle": {
      "backgroundColor": "#f5f3ff",
      "color": "#0f172a",
      "border": "1px solid #ddd6fe"
    },
    "oddRowStyle": {
      "backgroundColor": "#ffffff",
      "color": "#0f172a",
      "border": "1px solid #ddd6fe"
    },
    "firstColStyle": {
      "backgroundColor": "#f5f3ff",
      "color": "#0f172a",
      "fontWeight": "bold"
    },
    "lastColStyle": {
      "backgroundColor": "#f5f3ff",
      "color": "#0f172a",
      "fontWeight": "bold"
    },
    "colBand1Style": {
      "backgroundColor": "#ffffff"
    },
    "colBand2Style": {
      "backgroundColor": "#f5f3ff"
    },
    "totalStyle": {
      "backgroundColor": "#ffffff",
      "color": "#0f172a",
      "fontWeight": "bold",
      "borderTop": "1px solid #7c3aed",
      "borderBottom": "3px double #7c3aed"
    }
  }
];

export const TABLE_STYLE_CATEGORIES = [
  { id: "light", label: "Sáng", labelKey: "sheetTableStyles.catLight" },
  { id: "medium", label: "Trung bình", labelKey: "sheetTableStyles.catMedium" },
  { id: "dark", label: "Tối", labelKey: "sheetTableStyles.catDark" }
];

export function findTableStylePreset(idOrPreset) {
  if (!idOrPreset) return TABLE_STYLE_PRESETS.find(p => p.id === "TableStyleMedium2") || TABLE_STYLE_PRESETS[0];
  if (typeof idOrPreset === "object" && idOrPreset.headerStyle) return idOrPreset;
  const idStr = String(idOrPreset || "").trim();
  const lower = idStr.toLowerCase();
  const found = TABLE_STYLE_PRESETS.find(p => p.id.toLowerCase() === lower || (p.excelStyle && p.excelStyle.toLowerCase() === lower));
  if (found) return found;
  return TABLE_STYLE_PRESETS.find(p => p.id === "TableStyleMedium2") || TABLE_STYLE_PRESETS[0];
}
