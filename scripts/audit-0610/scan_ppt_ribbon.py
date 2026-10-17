# -*- coding: utf-8 -*-
"""Quét ribbon PowerPoint 2016 và sinh docs/ribbon-scan-ppt-1710.json.

Chạy: python scripts/audit-0610/scan_ppt_ribbon.py
Kết hợp kiểm tra trực tiếp qua PowerPoint 2016 COM GetLabelMso (16.0.4266)
và thông số đặc tả Ribbon XML chuẩn PowerPoint 2016.
"""
import json
import pathlib
import subprocess
import sys

# Danh sách controls trên Ribbon PowerPoint 2016 theo tab và nhóm
CONTROLS = [
    # TỆP (BACKSTAGE)
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Tệp", "groupVi": "Tệp", "name": "Mới", "nameVi": "Mới (Ctrl+N)", "msoId": "FileNewDefault", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Tệp", "groupVi": "Tệp", "name": "Mở", "nameVi": "Mở (Ctrl+O)", "msoId": "FileOpen", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Tệp", "groupVi": "Tệp", "name": "Lưu", "nameVi": "Lưu (Ctrl+S)", "msoId": "FileSave", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Tệp", "groupVi": "Tệp", "name": "Lưu thành", "nameVi": "Lưu thành (F12)", "msoId": "FileSaveAs", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Tệp", "groupVi": "Tệp", "name": "In", "nameVi": "In (Ctrl+P)", "msoId": "FilePrint", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Tệp", "groupVi": "Tệp", "name": "Đóng", "nameVi": "Đóng (Ctrl+W)", "msoId": "FileClose", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Tệp", "groupVi": "Tệp", "name": "Xuất PDF", "nameVi": "Xuất PDF/XPS", "msoId": "FileSendAsPdf", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Thông tin", "groupVi": "Thông tin", "name": "Bảo vệ bản trình bày", "nameVi": "Bảo vệ bản trình bày (Mã hóa mật khẩu / Mark as Final)", "msoId": "ProtectPresentation", "controlType": "menu"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Thông tin", "groupVi": "Thông tin", "name": "Kiểm tra bản trình bày", "nameVi": "Kiểm tra bản trình bày (Inspect Document)", "msoId": "InspectDocument", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Thông tin", "groupVi": "Thông tin", "name": "Quản lý bản trình bày", "nameVi": "Quản lý bản trình bày / Tự động khôi phục (AutoRecover)", "msoId": "ManagePresentation", "controlType": "menu"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Thông tin", "groupVi": "Thông tin", "name": "Thuộc tính", "nameVi": "Thuộc tính tệp bản trình bày (Properties)", "msoId": "FileProperties", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Tùy chọn", "groupVi": "Tùy chọn", "name": "Tùy chọn PowerPoint", "nameVi": "Tùy chọn PowerPoint (Options)", "msoId": "FileOptions", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Tùy chọn", "groupVi": "Tùy chọn", "name": "Thanh công cụ truy nhanh", "nameVi": "Tùy biến Thanh công cụ truy nhanh (Quick Access Toolbar)", "msoId": "CustomizeQuickAccessToolbar", "controlType": "button"},
    {"tab": "Tệp (Backstage)", "tabVi": "Tệp (Backstage)", "group": "Chia sẻ", "groupVi": "Chia sẻ", "name": "Chia sẻ", "nameVi": "Chia sẻ / OneDrive / Gửi Email", "msoId": "FileShare", "controlType": "button"},

    # TRANG ĐẦU (HOME)
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Bảng nhớ tạm", "groupVi": "Bảng nhớ tạm", "name": "Dán", "nameVi": "Dán (Ctrl+V)", "msoId": "Paste", "controlType": "splitButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Bảng nhớ tạm", "groupVi": "Bảng nhớ tạm", "name": "Dán đặc biệt", "nameVi": "Dán đặc biệt (Ctrl+Alt+V)", "msoId": "PasteSpecialDialog", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Bảng nhớ tạm", "groupVi": "Bảng nhớ tạm", "name": "Cắt", "nameVi": "Cắt (Ctrl+X)", "msoId": "Cut", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Bảng nhớ tạm", "groupVi": "Bảng nhớ tạm", "name": "Sao chép", "nameVi": "Sao chép (Ctrl+C)", "msoId": "Copy", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Bảng nhớ tạm", "groupVi": "Bảng nhớ tạm", "name": "Sao chép định dạng", "nameVi": "Sao chép định dạng (Format Painter, Ctrl+Shift+C)", "msoId": "FormatPainter", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Bảng nhớ tạm", "groupVi": "Bảng nhớ tạm", "name": "Ngăn Clipboard", "nameVi": "Ngăn Clipboard (Office Clipboard)", "msoId": "ShowClipboard", "controlType": "dialogLauncher"},

    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Trang chiếu", "groupVi": "Trang chiếu", "name": "Trang chiếu mới", "nameVi": "Trang chiếu mới (Ctrl+M)", "msoId": "SlideNew", "controlType": "splitButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Trang chiếu", "groupVi": "Trang chiếu", "name": "Bố cục", "nameVi": "Bố cục trang chiếu (Layout)", "msoId": "SlideLayoutGallery", "controlType": "gallery"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Trang chiếu", "groupVi": "Trang chiếu", "name": "Đặt lại", "nameVi": "Đặt lại bố cục trang chiếu (Reset)", "msoId": "SlideReset", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Trang chiếu", "groupVi": "Trang chiếu", "name": "Phần", "nameVi": "Thêm phần / Đổi tên / Xóa phần (Section)", "msoId": "SectionMenu", "controlType": "menu"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Trang chiếu", "groupVi": "Trang chiếu", "name": "Xóa trang chiếu", "nameVi": "Xóa trang chiếu (Delete)", "msoId": "SlideDelete", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Trang chiếu", "groupVi": "Trang chiếu", "name": "Nhân đôi", "nameVi": "Nhân đôi trang chiếu đã chọn (Ctrl+D / Duplicate)", "msoId": "SlideDuplicate", "controlType": "button"},

    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Phông chữ", "nameVi": "Tên phông chữ (Font Family)", "msoId": "Font", "controlType": "comboBox"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Cỡ chữ", "nameVi": "Cỡ chữ (Font Size)", "msoId": "FontSize", "controlType": "comboBox"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Tăng cỡ chữ", "nameVi": "Tăng cỡ chữ (Increase Font Size, Ctrl+Shift+>)", "msoId": "FontSizeIncrease", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Giảm cỡ chữ", "nameVi": "Giảm cỡ chữ (Decrease Font Size, Ctrl+Shift+<)", "msoId": "FontSizeDecrease", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Xóa định dạng", "nameVi": "Xóa định dạng (Clear All Formatting, Ctrl+Space)", "msoId": "ClearFormatting", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Đậm", "nameVi": "Đậm (Ctrl+B / Bold)", "msoId": "Bold", "controlType": "toggleButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Nghiêng", "nameVi": "Nghiêng (Ctrl+I / Italic)", "msoId": "Italic", "controlType": "toggleButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Gạch chân", "nameVi": "Gạch chân (Ctrl+U / Underline)", "msoId": "Underline", "controlType": "toggleButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Đổ bóng chữ", "nameVi": "Đổ bóng chữ (Text Shadow)", "msoId": "Shadow", "controlType": "toggleButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Gạch ngang", "nameVi": "Gạch ngang chữ (Strikethrough)", "msoId": "Strikethrough", "controlType": "toggleButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Khoảng cách ký tự", "nameVi": "Khoảng cách ký tự (Character Spacing)", "msoId": "CharacterSpacing", "controlType": "menu"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Đổi chữ hoa/thường", "nameVi": "Đổi chữ hoa/thường (Change Case, Shift+F3)", "msoId": "ChangeCaseGallery", "controlType": "menu"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Màu chữ", "nameVi": "Màu chữ (Font Color)", "msoId": "FontColorPicker", "controlType": "splitButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Phông chữ", "groupVi": "Phông chữ", "name": "Màu nền chữ", "nameVi": "Màu nền chữ / Tô sáng (Highlight Color)", "msoId": "TextHighlightColorPicker", "controlType": "splitButton"},

    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Dấu đầu dòng", "nameVi": "Dấu đầu dòng (Bullets)", "msoId": "Bullets", "controlType": "splitButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Đánh số", "nameVi": "Đánh số thứ tự (Numbering)", "msoId": "NumberedLists", "controlType": "splitButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Giảm thụt lề", "nameVi": "Giảm thụt lề (Decrease Indent, Ctrl+Shift+M)", "msoId": "IndentDecrease", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Tăng thụt lề", "nameVi": "Tăng thụt lề (Increase Indent, Ctrl+M)", "msoId": "IndentIncrease", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Giãn dòng", "nameVi": "Khoảng cách giãn dòng (Line Spacing 1.0, 1.5, 2.0)", "msoId": "LineSpacing", "controlType": "menu"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Căn trái", "nameVi": "Căn trái (Ctrl+L / Align Left)", "msoId": "AlignLeft", "controlType": "toggleButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Căn giữa", "nameVi": "Căn giữa (Ctrl+E / Center)", "msoId": "AlignCenter", "controlType": "toggleButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Căn phải", "nameVi": "Căn phải (Ctrl+R / Align Right)", "msoId": "AlignRight", "controlType": "toggleButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Căn đều", "nameVi": "Căn đều (Ctrl+J / Justify)", "msoId": "AlignJustify", "controlType": "toggleButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Cột văn bản", "nameVi": "Chia cột văn bản trong khung (Columns)", "msoId": "Columns", "controlType": "menu"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Hướng chữ", "nameVi": "Hướng văn bản (Text Direction 90, 270, Xếp chồng)", "msoId": "TextDirection", "controlType": "menu"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Căn lề dọc", "nameVi": "Căn lề dọc văn bản (Align Text Top/Middle/Bottom)", "msoId": "AlignTextVertical", "controlType": "menu"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Đoạn văn", "groupVi": "Đoạn văn", "name": "Chuyển sang SmartArt", "nameVi": "Chuyển văn bản thành đồ họa SmartArt (Convert to SmartArt)", "msoId": "ConvertTextToSmartArt", "controlType": "menu"},

    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Vẽ", "groupVi": "Vẽ", "name": "Hình khối", "nameVi": "Thư viện hình khối (Shapes)", "msoId": "ShapesInsertGallery", "controlType": "gallery"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Vẽ", "groupVi": "Vẽ", "name": "Sắp xếp", "nameVi": "Sắp xếp đối tượng (Arrange: Lớp, Căn lề, Nhóm, Xoay)", "msoId": "ArrangeGallery", "controlType": "menu"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Vẽ", "groupVi": "Vẽ", "name": "Kiểu nhanh", "nameVi": "Kiểu nhanh hình dạng (Quick Styles)", "msoId": "ShapeStylesGallery", "controlType": "gallery"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Vẽ", "groupVi": "Vẽ", "name": "Tô nền hình", "nameVi": "Màu tô nền hình dạng (Shape Fill)", "msoId": "ShapeFillColorPicker", "controlType": "splitButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Vẽ", "groupVi": "Vẽ", "name": "Viền hình", "nameVi": "Đường viền hình dạng (Shape Outline)", "msoId": "ShapeOutlineColorPicker", "controlType": "splitButton"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Vẽ", "groupVi": "Vẽ", "name": "Hiệu ứng hình", "nameVi": "Hiệu ứng hình dạng (Shape Effects: Bóng, Phản chiếu, Phát sáng)", "msoId": "ShapeEffectsMenu", "controlType": "menu"},

    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Chỉnh sửa", "groupVi": "Chỉnh sửa", "name": "Tìm kiếm", "nameVi": "Tìm kiếm (Ctrl+F / Find)", "msoId": "FindDialog", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Chỉnh sửa", "groupVi": "Chỉnh sửa", "name": "Thay thế", "nameVi": "Thay thế (Ctrl+H / Replace)", "msoId": "ReplaceDialog", "controlType": "button"},
    {"tab": "Trang đầu", "tabVi": "Trang đầu", "group": "Chỉnh sửa", "groupVi": "Chỉnh sửa", "name": "Chọn", "nameVi": "Chọn đối tượng / Ngăn chọn (Selection Pane)", "msoId": "SelectMenu", "controlType": "menu"},

    # CHÈN (INSERT)
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Trang chiếu", "groupVi": "Trang chiếu", "name": "Trang chiếu mới", "nameVi": "Trang chiếu mới (Insert New Slide)", "msoId": "SlideNew", "controlType": "splitButton"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Bảng", "groupVi": "Bảng", "name": "Bảng", "nameVi": "Chèn bảng (Table Grid & Insert Table)", "msoId": "TableInsert", "controlType": "menu"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Bảng", "groupVi": "Bảng", "name": "Vẽ bảng", "nameVi": "Vẽ bảng biểu tự do (Draw Table)", "msoId": "TableDrawTable", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Bảng", "groupVi": "Bảng", "name": "Bảng tính Excel", "nameVi": "Bảng tính Excel nhúng (Excel Spreadsheet)", "msoId": "TableExcelSpreadsheet", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Hình ảnh", "groupVi": "Hình ảnh", "name": "Hình ảnh", "nameVi": "Chèn hình ảnh từ tệp (Pictures)", "msoId": "PictureInsertFromFile", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Hình ảnh", "groupVi": "Hình ảnh", "name": "Hình ảnh trực tuyến", "nameVi": "Hình ảnh trực tuyến (Online Pictures)", "msoId": "OnlinePictures", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Hình ảnh", "groupVi": "Hình ảnh", "name": "Ảnh chụp màn hình", "nameVi": "Ảnh chụp màn hình (Screenshot / Screen Clipping)", "msoId": "ScreenClipping", "controlType": "menu"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Hình ảnh", "groupVi": "Hình ảnh", "name": "Album ảnh", "nameVi": "Album ảnh trình chiếu (Photo Album)", "msoId": "PhotoAlbumInsert", "controlType": "menu"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Minh họa", "groupVi": "Minh họa", "name": "Hình khối", "nameVi": "Hình dạng khối vẽ (Shapes)", "msoId": "ShapesInsertGallery", "controlType": "gallery"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Minh họa", "groupVi": "Minh họa", "name": "SmartArt", "nameVi": "Đồ họa SmartArt (Danh sách, Quy trình, Chu trình, Phân cấp)", "msoId": "SmartArtInsert", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Minh họa", "groupVi": "Minh họa", "name": "Biểu đồ", "nameVi": "Biểu đồ phân tích dữ liệu (Chart: Cột, Đường, Tròn, Thanh)", "msoId": "ChartInsert", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Phần bổ trợ", "groupVi": "Phần bổ trợ", "name": "Cửa hàng", "nameVi": "Cửa hàng phần bổ trợ Office (Office Store)", "msoId": "OfficeStore", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Phần bổ trợ", "groupVi": "Phần bổ trợ", "name": "Phần bổ trợ của tôi", "nameVi": "Phần bổ trợ của tôi (My Add-ins)", "msoId": "MyAddins", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Liên kết", "groupVi": "Liên kết", "name": "Siêu liên kết", "nameVi": "Siêu liên kết (Hyperlink, Ctrl+K)", "msoId": "HyperlinkInsert", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Liên kết", "groupVi": "Liên kết", "name": "Tác vụ", "nameVi": "Hành động liên kết khi bấm chuột (Action)", "msoId": "ActionInsert", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Nhận xét", "groupVi": "Nhận xét", "name": "Nhận xét", "nameVi": "Thêm nhận xét mới (Comment)", "msoId": "ReviewNewComment", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Văn bản", "groupVi": "Văn bản", "name": "Hộp văn bản", "nameVi": "Hộp văn bản (Text Box)", "msoId": "TextBoxInsert", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Văn bản", "groupVi": "Văn bản", "name": "Đầu & Chân trang", "nameVi": "Đầu trang & Chân trang (Header & Footer)", "msoId": "HeaderFooterInsert", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Văn bản", "groupVi": "Văn bản", "name": "Chữ nghệ thuật", "nameVi": "Chữ nghệ thuật (WordArt)", "msoId": "WordArtInsert", "controlType": "gallery"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Văn bản", "groupVi": "Văn bản", "name": "Ngày & Giờ", "nameVi": "Chèn Ngày & Giờ tự động (Date & Time)", "msoId": "DateTimeInsert", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Văn bản", "groupVi": "Văn bản", "name": "Số trang chiếu", "nameVi": "Chèn Số trang chiếu (Slide Number)", "msoId": "SlideNumberInsert", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Văn bản", "groupVi": "Văn bản", "name": "Đối tượng OLE", "nameVi": "Chèn đối tượng nhúng OLE (Object)", "msoId": "ObjectInsert", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Ký hiệu", "groupVi": "Ký hiệu", "name": "Phương trình", "nameVi": "Phương trình toán học (Equation)", "msoId": "EquationInsert", "controlType": "splitButton"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Ký hiệu", "groupVi": "Ký hiệu", "name": "Ký hiệu", "nameVi": "Ký hiệu đặc biệt (Symbol)", "msoId": "SymbolInsert", "controlType": "button"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Phương tiện", "groupVi": "Phương tiện", "name": "Video", "nameVi": "Chèn video từ máy tính hoặc trực tuyến (Video)", "msoId": "VideoInsertFromFile", "controlType": "splitButton"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Phương tiện", "groupVi": "Phương tiện", "name": "Âm thanh", "nameVi": "Chèn âm thanh từ máy hoặc ghi âm (Audio)", "msoId": "AudioInsertFromFile", "controlType": "splitButton"},
    {"tab": "Chèn", "tabVi": "Chèn", "group": "Phương tiện", "groupVi": "Phương tiện", "name": "Ghi màn hình", "nameVi": "Ghi video màn hình (Screen Recording)", "msoId": "ScreenRecording", "controlType": "button"},

    # THIẾT KẾ (DESIGN)
    {"tab": "Thiết kế", "tabVi": "Thiết kế", "group": "Chủ đề", "groupVi": "Chủ đề", "name": "Chủ đề", "nameVi": "Thư viện chủ đề trình chiếu (Themes Gallery)", "msoId": "ThemesGallery", "controlType": "gallery"},
    {"tab": "Thiết kế", "tabVi": "Thiết kế", "group": "Chủ đề", "groupVi": "Chủ đề", "name": "Duyệt chủ đề", "nameVi": "Duyệt tìm tệp chủ đề .thmx (Browse for Themes)", "msoId": "BrowseForThemes", "controlType": "button"},
    {"tab": "Thiết kế", "tabVi": "Thiết kế", "group": "Chủ đề", "groupVi": "Chủ đề", "name": "Lưu chủ đề", "nameVi": "Lưu chủ đề hiện tại làm mẫu (Save Current Theme)", "msoId": "SaveCurrentTheme", "controlType": "button"},
    {"tab": "Thiết kế", "tabVi": "Thiết kế", "group": "Biến thể", "groupVi": "Biến thể", "name": "Màu sắc biến thể", "nameVi": "Bảng màu biến thể chủ đề (Theme Colors)", "msoId": "ThemeColorsGallery", "controlType": "gallery"},
    {"tab": "Thiết kế", "tabVi": "Thiết kế", "group": "Biến thể", "groupVi": "Biến thể", "name": "Phông chữ biến thể", "nameVi": "Bộ cặp phông chữ chủ đề (Theme Fonts)", "msoId": "ThemeFontsGallery", "controlType": "gallery"},
    {"tab": "Thiết kế", "tabVi": "Thiết kế", "group": "Biến thể", "groupVi": "Biến thể", "name": "Hiệu ứng biến thể", "nameVi": "Bộ hiệu ứng chủ đề (Theme Effects)", "msoId": "ThemeEffectsGallery", "controlType": "gallery"},
    {"tab": "Thiết kế", "tabVi": "Thiết kế", "group": "Biến thể", "groupVi": "Biến thể", "name": "Kiểu nền", "nameVi": "Kiểu nền trang chiếu (Background Styles)", "msoId": "BackgroundStylesGallery", "controlType": "gallery"},
    {"tab": "Thiết kế", "tabVi": "Thiết kế", "group": "Tùy chỉnh", "groupVi": "Tùy chỉnh", "name": "Cỡ trang chiếu", "nameVi": "Kích thước trang chiếu (Slide Size 4:3 / 16:9 / Tùy chỉnh)", "msoId": "SlideSizeGalleryPowerPoint", "controlType": "menu"},
    {"tab": "Thiết kế", "tabVi": "Thiết kế", "group": "Tùy chỉnh", "groupVi": "Tùy chỉnh", "name": "Định dạng nền", "nameVi": "Định dạng nền trang chiếu (Format Background: Đơn sắc/Gradient/Texture)", "msoId": "FormatBackgroundPowerPoint", "controlType": "button"},

    # CHUYỂN TIẾP (TRANSITIONS)
    {"tab": "Chuyển tiếp", "tabVi": "Chuyển tiếp", "group": "Xem trước", "groupVi": "Xem trước", "name": "Xem trước chuyển tiếp", "nameVi": "Xem trước hiệu ứng chuyển tiếp (Preview)", "msoId": "TransitionPreview", "controlType": "button"},
    {"tab": "Chuyển tiếp", "tabVi": "Chuyển tiếp", "group": "Chuyển tiếp sang slide", "groupVi": "Chuyển tiếp sang slide", "name": "Hiệu ứng chuyển tiếp", "nameVi": "Thư viện hiệu ứng chuyển tiếp (Transitions Gallery: Fade, Push, Wipe, Zoom...)", "msoId": "TransitionEffectGallery", "controlType": "gallery"},
    {"tab": "Chuyển tiếp", "tabVi": "Chuyển tiếp", "group": "Chuyển tiếp sang slide", "groupVi": "Chuyển tiếp sang slide", "name": "Tùy chọn hiệu ứng", "nameVi": "Tùy chọn hướng hiệu ứng chuyển tiếp (Effect Options)", "msoId": "TransitionEffectOptions", "controlType": "menu"},
    {"tab": "Chuyển tiếp", "tabVi": "Chuyển tiếp", "group": "Thời gian", "groupVi": "Thời gian", "name": "Âm thanh", "nameVi": "Âm thanh chuyển tiếp (Sound)", "msoId": "TransitionSound", "controlType": "comboBox"},
    {"tab": "Chuyển tiếp", "tabVi": "Chuyển tiếp", "group": "Thời gian", "groupVi": "Thời gian", "name": "Thời lượng", "nameVi": "Thời lượng hiệu ứng chuyển tiếp (Duration)", "msoId": "TransitionDuration", "controlType": "editBox"},
    {"tab": "Chuyển tiếp", "tabVi": "Chuyển tiếp", "group": "Thời gian", "groupVi": "Thời gian", "name": "Áp dụng cho tất cả", "nameVi": "Áp dụng cho tất cả trang chiếu (Apply To All)", "msoId": "TransitionApplyAll", "controlType": "button"},
    {"tab": "Chuyển tiếp", "tabVi": "Chuyển tiếp", "group": "Thời gian", "groupVi": "Thời gian", "name": "Khi nhấp chuột", "nameVi": "Chuyển trang khi nhấp chuột (On Mouse Click)", "msoId": "AdvanceOnMouseClick", "controlType": "checkBox"},
    {"tab": "Chuyển tiếp", "tabVi": "Chuyển tiếp", "group": "Thời gian", "groupVi": "Thời gian", "name": "Tự động sau", "nameVi": "Chuyển trang tự động sau số giây (After)", "msoId": "AdvanceAfterTime", "controlType": "editBox"},

    # HOẠT ẢNH (ANIMATIONS)
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Xem trước", "groupVi": "Xem trước", "name": "Xem trước hoạt ảnh", "nameVi": "Xem trước hiệu ứng hoạt ảnh (Preview)", "msoId": "AnimationPreview", "controlType": "button"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Hoạt ảnh", "groupVi": "Hoạt ảnh", "name": "Hiệu ứng hoạt ảnh", "nameVi": "Thư viện hoạt ảnh (Animation Styles Gallery: Entrance, Emphasis, Exit)", "msoId": "AnimationGallery", "controlType": "gallery"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Hoạt ảnh", "groupVi": "Hoạt ảnh", "name": "Tùy chọn hiệu ứng", "nameVi": "Tùy chọn hướng hiệu ứng hoạt ảnh (Effect Options)", "msoId": "AnimationEffectOptions", "controlType": "menu"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Hoạt ảnh nâng cao", "groupVi": "Hoạt ảnh nâng cao", "name": "Thêm hoạt ảnh", "nameVi": "Thêm nhiều hoạt ảnh vào một đối tượng (Add Animation)", "msoId": "AnimationAddGallery", "controlType": "gallery"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Hoạt ảnh nâng cao", "groupVi": "Hoạt ảnh nâng cao", "name": "Ngăn hoạt ảnh", "nameVi": "Ngăn danh sách và đường thời gian hoạt ảnh (Animation Pane)", "msoId": "CustomAnimation", "controlType": "toggleButton"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Hoạt ảnh nâng cao", "groupVi": "Hoạt ảnh nâng cao", "name": "Kích hoạt", "nameVi": "Kích hoạt hiệu ứng theo đối tượng bấm (Trigger)", "msoId": "AnimationTrigger", "controlType": "menu"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Hoạt ảnh nâng cao", "groupVi": "Hoạt ảnh nâng cao", "name": "Sao chép hoạt ảnh", "nameVi": "Sao chép hoạt ảnh (Animation Painter)", "msoId": "AnimationPainter", "controlType": "toggleButton"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Thời gian", "groupVi": "Thời gian", "name": "Bắt đầu", "nameVi": "Thời điểm bắt đầu hiệu ứng (Start: On Click, With Previous, After Previous)", "msoId": "AnimationStart", "controlType": "comboBox"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Thời gian", "groupVi": "Thời gian", "name": "Thời lượng hoạt ảnh", "nameVi": "Thời lượng chạy hoạt ảnh (Duration)", "msoId": "AnimationDuration", "controlType": "editBox"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Thời gian", "groupVi": "Thời gian", "name": "Độ trễ", "nameVi": "Độ trễ trước khi chạy hoạt ảnh (Delay)", "msoId": "AnimationDelay", "controlType": "editBox"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Thời gian", "groupVi": "Thời gian", "name": "Đổi thứ tự trước", "nameVi": "Di chuyển hoạt ảnh lên trước (Move Earlier)", "msoId": "AnimationMoveEarlier", "controlType": "button"},
    {"tab": "Hoạt ảnh", "tabVi": "Hoạt ảnh", "group": "Thời gian", "groupVi": "Thời gian", "name": "Đổi thứ tự sau", "nameVi": "Di chuyển hoạt ảnh xuống sau (Move Later)", "msoId": "AnimationMoveLater", "controlType": "button"},

    # TRÌNH CHIẾU (SLIDE SHOW)
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Bắt đầu trình chiếu", "groupVi": "Bắt đầu trình chiếu", "name": "Từ đầu", "nameVi": "Trình chiếu từ đầu (From Beginning, F5)", "msoId": "SlideShowFromBeginning", "controlType": "button"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Bắt đầu trình chiếu", "groupVi": "Bắt đầu trình chiếu", "name": "Từ trang hiện tại", "nameVi": "Trình chiếu từ trang hiện tại (From Current Slide, Shift+F5)", "msoId": "SlideShowFromCurrent", "controlType": "button"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Bắt đầu trình chiếu", "groupVi": "Bắt đầu trình chiếu", "name": "Trình chiếu trực tuyến", "nameVi": "Trình chiếu trực tuyến qua đám mây (Present Online)", "msoId": "PresentOnline", "controlType": "button"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Bắt đầu trình chiếu", "groupVi": "Bắt đầu trình chiếu", "name": "Trình chiếu tùy chỉnh", "nameVi": "Trình chiếu nhóm slide tùy chỉnh (Custom Slide Show)", "msoId": "CustomSlideShow", "controlType": "menu"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Thiết lập", "groupVi": "Thiết lập", "name": "Thiết lập trình chiếu", "nameVi": "Thiết lập cấu hình trình chiếu (Set Up Slide Show: Lặp liên tục, loại show)", "msoId": "SlideShowSetUpShow", "controlType": "button"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Thiết lập", "groupVi": "Thiết lập", "name": "Ẩn trang chiếu", "nameVi": "Ẩn trang chiếu khi trình diễn (Hide Slide)", "msoId": "SlideHide", "controlType": "toggleButton"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Thiết lập", "groupVi": "Thiết lập", "name": "Tập dượt hẹn giờ", "nameVi": "Tập dượt hẹn giờ tự động (Rehearse Timings)", "msoId": "SlideShowRehearseTimings", "controlType": "button"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Thiết lập", "groupVi": "Thiết lập", "name": "Ghi lại trình chiếu", "nameVi": "Ghi lại bài trình chiếu kèm giọng nói (Record Slide Show)", "msoId": "SlideShowRecordMenu", "controlType": "splitButton"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Thiết lập", "groupVi": "Thiết lập", "name": "Phát thuyết minh", "nameVi": "Bật/tắt phát lời thuyết minh (Play Narrations)", "msoId": "SlideShowPlayNarrations", "controlType": "checkBox"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Thiết lập", "groupVi": "Thiết lập", "name": "Sử dụng thời gian", "nameVi": "Sử dụng thời gian đã tập dượt (Use Timings)", "msoId": "SlideShowUseTimings", "controlType": "checkBox"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Thiết lập", "groupVi": "Thiết lập", "name": "Hiện điều khiển", "nameVi": "Hiển thị thanh điều khiển media (Show Media Controls)", "msoId": "SlideShowShowMediaControls", "controlType": "checkBox"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Màn hình", "groupVi": "Màn hình", "name": "Màn hình", "nameVi": "Chọn màn hình phát (Monitors)", "msoId": "SlideShowMonitorSelector", "controlType": "comboBox"},
    {"tab": "Trình chiếu", "tabVi": "Trình chiếu", "group": "Màn hình", "groupVi": "Màn hình", "name": "Chế độ Presenter", "nameVi": "Sử dụng Chế độ xem Người thuyết trình (Use Presenter View, Alt+F5)", "msoId": "SlideShowUsePresenter", "controlType": "checkBox"},

    # XEM LẠI (REVIEW)
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "Kiểm lỗi", "groupVi": "Kiểm lỗi", "name": "Chính tả", "nameVi": "Kiểm tra chính tả (Spelling, F7)", "msoId": "Spelling", "controlType": "button"},
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "Kiểm lỗi", "groupVi": "Kiểm lỗi", "name": "Từ điển đồng nghĩa", "nameVi": "Tra cứu từ điển đồng nghĩa (Thesaurus, Shift+F7)", "msoId": "Thesaurus", "controlType": "button"},
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "Thông tin chuyên sâu", "groupVi": "Thông tin chuyên sâu", "name": "Tra cứu thông minh", "nameVi": "Tra cứu thông minh trực tuyến (Smart Lookup)", "msoId": "SmartLookup", "controlType": "button"},
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "Ngôn ngữ", "groupVi": "Ngôn ngữ", "name": "Dịch", "nameVi": "Dịch văn bản trực tuyến (Translate)", "msoId": "Translate", "controlType": "menu"},
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "Ngôn ngữ", "groupVi": "Ngôn ngữ", "name": "Ngôn ngữ", "nameVi": "Chọn ngôn ngữ kiểm lỗi văn bản (Language)", "msoId": "Language", "controlType": "menu"},
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "Nhận xét", "groupVi": "Nhận xét", "name": "Nhận xét mới", "nameVi": "Thêm nhận xét mới vào slide (New Comment)", "msoId": "ReviewNewComment", "controlType": "button"},
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "Nhận xét", "groupVi": "Nhận xét", "name": "Xóa nhận xét", "nameVi": "Xóa nhận xét đã chọn hoặc toàn bộ (Delete Comment)", "msoId": "ReviewDeleteComment", "controlType": "splitButton"},
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "Nhận xét", "groupVi": "Nhận xét", "name": "Nhận xét trước", "nameVi": "Chuyển đến nhận xét trước (Previous Comment)", "msoId": "ReviewPreviousComment", "controlType": "button"},
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "Nhận xét", "groupVi": "Nhận xét", "name": "Nhận xét sau", "nameVi": "Chuyển đến nhận xét sau (Next Comment)", "msoId": "ReviewNextComment", "controlType": "button"},
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "Nhận xét", "groupVi": "Nhận xét", "name": "Hiện nhận xét", "nameVi": "Hiện/ẩn ngăn nhận xét (Show Comments)", "msoId": "ShowComments", "controlType": "toggleButton"},
    {"tab": "Xem lại", "tabVi": "Xem lại", "group": "So sánh", "groupVi": "So sánh", "name": "So sánh", "nameVi": "So sánh và gộp bản trình chiếu (Compare Presentations)", "msoId": "ComparePresentations", "controlType": "button"},

    # CHẾ ĐỘ XEM (VIEW)
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Chế độ xem bản trình bày", "groupVi": "Chế độ xem bản trình bày", "name": "Bình thường", "nameVi": "Chế độ xem bình thường (Normal View)", "msoId": "ViewNormalViewPowerPoint", "controlType": "toggleButton"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Chế độ xem bản trình bày", "groupVi": "Chế độ xem bản trình bày", "name": "Dàn bài", "nameVi": "Chế độ xem dàn ý văn bản (Outline View)", "msoId": "ViewOutlineView", "controlType": "toggleButton"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Chế độ xem bản trình bày", "groupVi": "Chế độ xem bản trình bày", "name": "Bộ sắp xếp trang", "nameVi": "Bộ sắp xếp trang chiếu dạng lưới (Slide Sorter View)", "msoId": "ViewSlideSorterView", "controlType": "toggleButton"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Chế độ xem bản trình bày", "groupVi": "Chế độ xem bản trình bày", "name": "Trang ghi chú", "nameVi": "Chế độ xem trang in ghi chú (Notes Page View)", "msoId": "ViewNotesPageView", "controlType": "toggleButton"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Chế độ xem bản trình bày", "groupVi": "Chế độ xem bản trình bày", "name": "Chế độ đọc", "nameVi": "Chế độ xem đọc toàn màn hình trong cửa sổ (Reading View)", "msoId": "ViewReadingViewPowerPoint", "controlType": "toggleButton"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Chế độ xem bản cái", "groupVi": "Chế độ xem bản cái", "name": "Slide Master", "nameVi": "Chế độ chỉnh sửa Slide Master (Trang chiếu cái)", "msoId": "ViewSlideMasterView", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Chế độ xem bản cái", "groupVi": "Chế độ xem bản cái", "name": "Handout Master", "nameVi": "Chế độ chỉnh sửa Handout Master (Bản phát tài liệu cái)", "msoId": "ViewHandoutMasterView", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Chế độ xem bản cái", "groupVi": "Chế độ xem bản cái", "name": "Notes Master", "nameVi": "Chế độ chỉnh sửa Notes Master (Ghi chú cái)", "msoId": "ViewNotesMasterView", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Hiển thị", "groupVi": "Hiển thị", "name": "Thước", "nameVi": "Bật/tắt thanh thước ngang dọc (Ruler)", "msoId": "ViewRulerPowerPoint", "controlType": "checkBox"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Hiển thị", "groupVi": "Hiển thị", "name": "Đường lưới", "nameVi": "Bật/tắt đường lưới căn chỉnh (Gridlines)", "msoId": "ViewGridlinesPowerPoint", "controlType": "checkBox"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Hiển thị", "groupVi": "Hiển thị", "name": "Đường dẫn hướng", "nameVi": "Bật/tắt đường dẫn hướng thông minh (Guides)", "msoId": "ViewGuides", "controlType": "checkBox"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Hiển thị", "groupVi": "Hiển thị", "name": "Ghi chú", "nameVi": "Bật/tắt ngăn nhập ghi chú diễn giả (Notes)", "msoId": "ViewNotes", "controlType": "checkBox"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Thu phóng", "groupVi": "Thu phóng", "name": "Thu phóng", "nameVi": "Hộp thoại thu phóng màn hình (Zoom Dialog)", "msoId": "ZoomPowerPoint", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Thu phóng", "groupVi": "Thu phóng", "name": "Vừa cửa sổ", "nameVi": "Thu phóng vừa khít cửa sổ (Fit to Window)", "msoId": "FitToWindow", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Màu / Thang độ xám", "groupVi": "Màu / Thang độ xám", "name": "Màu", "nameVi": "Hiển thị chế độ màu đầy đủ (Color)", "msoId": "ViewColor", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Màu / Thang độ xám", "groupVi": "Màu / Thang độ xám", "name": "Thang độ xám", "nameVi": "Hiển thị chế độ thang độ xám (Grayscale)", "msoId": "ViewGrayscale", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Màu / Thang độ xám", "groupVi": "Màu / Thang độ xám", "name": "Đen trắng", "nameVi": "Hiển thị chế độ đen trắng thuần (Pure Black and White)", "msoId": "ViewBlackAndWhite", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Cửa sổ", "groupVi": "Cửa sổ", "name": "Cửa sổ mới", "nameVi": "Mở thêm cửa sổ tài liệu mới (New Window)", "msoId": "WindowNewPowerPoint", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Cửa sổ", "groupVi": "Cửa sổ", "name": "Sắp xếp tất cả", "nameVi": "Sắp xếp các cửa sổ cạnh nhau (Arrange All)", "msoId": "ArrangeAll", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Cửa sổ", "groupVi": "Cửa sổ", "name": "Xếp tầng", "nameVi": "Xếp tầng các cửa sổ (Cascade)", "msoId": "WindowCascade", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Cửa sổ", "groupVi": "Cửa sổ", "name": "Di chuyển thanh chia", "nameVi": "Di chuyển thanh chia tách giao diện (Move Split)", "msoId": "WindowMoveSplit", "controlType": "button"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Cửa sổ", "groupVi": "Cửa sổ", "name": "Chuyển đổi cửa sổ", "nameVi": "Chuyển đổi giữa các cửa sổ trình chiếu (Switch Windows)", "msoId": "WindowSwitchWindows", "controlType": "menu"},
    {"tab": "Chế độ xem", "tabVi": "Chế độ xem", "group": "Macro", "groupVi": "Macro", "name": "Xem Macro", "nameVi": "Hộp thoại quản lý và chạy Macro (Macros, Alt+F8)", "msoId": "MacroPlay", "controlType": "button"},

    # TAB NGỮ CẢNH: CÔNG CỤ HÌNH DẠNG & VẼ (DRAWING TOOLS FORMAT)
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Chèn hình", "groupVi": "Chèn hình", "name": "Sửa điểm vẽ", "nameVi": "Chỉnh sửa điểm nút hình khối (Edit Points)", "msoId": "ShapeEditPoints", "controlType": "button"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Kiểu chữ nghệ thuật", "groupVi": "Kiểu chữ nghệ thuật", "name": "Tô màu chữ WordArt", "nameVi": "Màu tô chữ nghệ thuật (Text Fill)", "msoId": "TextFillColorPicker", "controlType": "splitButton"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Kiểu chữ nghệ thuật", "groupVi": "Kiểu chữ nghệ thuật", "name": "Viền chữ WordArt", "nameVi": "Viền chữ nghệ thuật (Text Outline)", "msoId": "TextOutlineColorPicker", "controlType": "splitButton"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Kiểu chữ nghệ thuật", "groupVi": "Kiểu chữ nghệ thuật", "name": "Hiệu ứng chữ WordArt", "nameVi": "Hiệu ứng chữ nghệ thuật (Text Effects: Uốn cong Warp, 3D, Glow)", "msoId": "TextEffectsMenu", "controlType": "menu"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Sắp xếp", "groupVi": "Sắp xếp", "name": "Lên trên", "nameVi": "Đưa lên trên một lớp (Bring Forward)", "msoId": "ObjectBringForward", "controlType": "splitButton"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Sắp xếp", "groupVi": "Sắp xếp", "name": "Lên trên cùng", "nameVi": "Đưa lên trên cùng (Bring to Front)", "msoId": "ObjectBringToFront", "controlType": "button"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Sắp xếp", "groupVi": "Sắp xếp", "name": "Xuống dưới", "nameVi": "Đưa xuống dưới một lớp (Send Backward)", "msoId": "ObjectSendBackward", "controlType": "splitButton"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Sắp xếp", "groupVi": "Sắp xếp", "name": "Xuống dưới cùng", "nameVi": "Đưa xuống dưới cùng (Send to Back)", "msoId": "ObjectSendToBack", "controlType": "button"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Sắp xếp", "groupVi": "Sắp xếp", "name": "Căn lề đối tượng", "nameVi": "Căn lề các đối tượng (Align Left, Center, Right, Top, Middle, Bottom)", "msoId": "ObjectsAlignGallery", "controlType": "menu"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Sắp xếp", "groupVi": "Sắp xếp", "name": "Phân phối đều", "nameVi": "Phân phối đều khoảng cách ngang/dọc (Distribute Horizontally / Vertically)", "msoId": "ObjectsDistributeGallery", "controlType": "menu"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Sắp xếp", "groupVi": "Sắp xếp", "name": "Nhóm đối tượng", "nameVi": "Nhóm các đối tượng lại (Group Objects, Ctrl+G)", "msoId": "ObjectsGroup", "controlType": "button"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Sắp xếp", "groupVi": "Sắp xếp", "name": "Rã nhóm", "nameVi": "Rã nhóm đối tượng (Ungroup Objects, Ctrl+Shift+G)", "msoId": "ObjectsUngroup", "controlType": "button"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Sắp xếp", "groupVi": "Sắp xếp", "name": "Xoay đối tượng", "nameVi": "Xoay và lật đối tượng (Rotate 90, Flip Horizontal/Vertical)", "msoId": "ObjectRotateGallery", "controlType": "menu"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Kích thước", "groupVi": "Kích thước", "name": "Chiều cao hình", "nameVi": "Chiều cao đối tượng (Shape Height)", "msoId": "ShapeHeight", "controlType": "editBox"},
    {"tab": "Định dạng hình dạng", "tabVi": "Công cụ vẽ > Định dạng", "group": "Kích thước", "groupVi": "Kích thước", "name": "Chiều rộng hình", "nameVi": "Chiều rộng đối tượng (Shape Width)", "msoId": "ShapeWidth", "controlType": "editBox"},

    # TAB NGỮ CẢNH: CÔNG CỤ HÌNH ẢNH (PICTURE TOOLS FORMAT)
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Điều chỉnh", "groupVi": "Điều chỉnh", "name": "Xóa nền ảnh", "nameVi": "Tự động xóa nền hình ảnh (Remove Background)", "msoId": "PictureRemoveBackground", "controlType": "button"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Điều chỉnh", "groupVi": "Điều chỉnh", "name": "Hiệu chỉnh độ sáng", "nameVi": "Hiệu chỉnh độ sáng và tương phản ảnh (Corrections)", "msoId": "PictureCorrections", "controlType": "gallery"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Điều chỉnh", "groupVi": "Điều chỉnh", "name": "Màu sắc ảnh", "nameVi": "Độ bão hòa và tông màu ảnh (Color Tone / Recolor)", "msoId": "PictureColor", "controlType": "gallery"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Điều chỉnh", "groupVi": "Điều chỉnh", "name": "Hiệu ứng nghệ thuật", "nameVi": "Bộ lọc hiệu ứng nghệ thuật ảnh (Artistic Effects)", "msoId": "PictureArtisticEffects", "controlType": "gallery"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Điều chỉnh", "groupVi": "Điều chỉnh", "name": "Nén ảnh", "nameVi": "Nén kích thước dung lượng hình ảnh (Compress Pictures)", "msoId": "PictureCompress", "controlType": "button"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Điều chỉnh", "groupVi": "Điều chỉnh", "name": "Đổi ảnh", "nameVi": "Thay thế hình ảnh khác giữ nguyên kích thước (Change Picture)", "msoId": "PictureChange", "controlType": "menu"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Điều chỉnh", "groupVi": "Điều chỉnh", "name": "Đặt lại ảnh", "nameVi": "Đặt lại hình ảnh và kích thước ban đầu (Reset Picture)", "msoId": "PictureReset", "controlType": "splitButton"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Kiểu ảnh", "groupVi": "Kiểu ảnh", "name": "Kiểu ảnh nhanh", "nameVi": "Thư viện kiểu khung viền ảnh (Picture Styles Gallery)", "msoId": "PictureStylesGallery", "controlType": "gallery"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Kiểu ảnh", "groupVi": "Kiểu ảnh", "name": "Viền ảnh", "nameVi": "Đường viền hình ảnh (Picture Border)", "msoId": "PictureBorder", "controlType": "splitButton"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Kiểu ảnh", "groupVi": "Kiểu ảnh", "name": "Hiệu ứng ảnh", "nameVi": "Hiệu ứng hình ảnh (Picture Effects: Bóng, 3D, Mềm cạnh)", "msoId": "PictureEffects", "controlType": "menu"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Kiểu ảnh", "groupVi": "Kiểu ảnh", "name": "Bố cục ảnh", "nameVi": "Chuyển ảnh thành SmartArt (Picture Layout)", "msoId": "PictureLayout", "controlType": "gallery"},
    {"tab": "Định dạng hình ảnh", "tabVi": "Công cụ hình ảnh > Định dạng", "group": "Kích thước", "groupVi": "Kích thước", "name": "Cắt xén ảnh", "nameVi": "Cắt xén kích thước hình ảnh (Crop to Shape, Tỷ lệ khung hình)", "msoId": "PictureCrop", "controlType": "splitButton"},

    # TAB NGỮ CẢNH: CÔNG CỤ BẢNG (TABLE TOOLS DESIGN & LAYOUT)
    {"tab": "Thiết kế bảng", "tabVi": "Công cụ bảng > Thiết kế", "group": "Tùy chọn kiểu", "groupVi": "Tùy chọn kiểu bảng", "name": "Hàng tiêu đề", "nameVi": "Bật/tắt định dạng hàng tiêu đề (Header Row)", "msoId": "TableHeaderRow", "controlType": "checkBox"},
    {"tab": "Thiết kế bảng", "tabVi": "Công cụ bảng > Thiết kế", "group": "Tùy chọn kiểu", "groupVi": "Tùy chọn kiểu bảng", "name": "Hàng tổng", "nameVi": "Bật/tắt định dạng hàng tổng cộng (Total Row)", "msoId": "TableTotalRow", "controlType": "checkBox"},
    {"tab": "Thiết kế bảng", "tabVi": "Công cụ bảng > Thiết kế", "group": "Tùy chọn kiểu", "groupVi": "Tùy chọn kiểu bảng", "name": "Hàng sọc xen kẽ", "nameVi": "Bật/tắt tô màu hàng xen kẽ (Banded Rows)", "msoId": "TableBandedRows", "controlType": "checkBox"},
    {"tab": "Thiết kế bảng", "tabVi": "Công cụ bảng > Thiết kế", "group": "Tùy chọn kiểu", "groupVi": "Tùy chọn kiểu bảng", "name": "Cột đầu tiên", "nameVi": "Bật/tắt định dạng cột đầu tiên (First Column)", "msoId": "TableFirstColumn", "controlType": "checkBox"},
    {"tab": "Thiết kế bảng", "tabVi": "Công cụ bảng > Thiết kế", "group": "Tùy chọn kiểu", "groupVi": "Tùy chọn kiểu bảng", "name": "Cột cuối cùng", "nameVi": "Bật/tắt định dạng cột cuối cùng (Last Column)", "msoId": "TableLastColumn", "controlType": "checkBox"},
    {"tab": "Thiết kế bảng", "tabVi": "Công cụ bảng > Thiết kế", "group": "Tùy chọn kiểu", "groupVi": "Tùy chọn kiểu bảng", "name": "Cột sọc xen kẽ", "nameVi": "Bật/tắt tô màu cột xen kẽ (Banded Columns)", "msoId": "TableBandedColumns", "controlType": "checkBox"},
    {"tab": "Thiết kế bảng", "tabVi": "Công cụ bảng > Thiết kế", "group": "Kiểu bảng", "groupVi": "Kiểu bảng", "name": "Thư viện kiểu bảng", "nameVi": "Thư viện kiểu dáng bảng biểu (Table Styles Gallery)", "msoId": "TableStylesGallery", "controlType": "gallery"},
    {"tab": "Thiết kế bảng", "tabVi": "Công cụ bảng > Thiết kế", "group": "Kiểu bảng", "groupVi": "Kiểu bảng", "name": "Đổ bóng ô", "nameVi": "Tô màu nền ô bảng (Table Shading)", "msoId": "TableShading", "controlType": "splitButton"},
    {"tab": "Thiết kế bảng", "tabVi": "Công cụ bảng > Thiết kế", "group": "Kiểu bảng", "groupVi": "Kiểu bảng", "name": "Đường viền bảng", "nameVi": "Đường viền ô và bảng (Table Borders)", "msoId": "TableBorders", "controlType": "splitButton"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Hàng & Cột", "groupVi": "Hàng & Cột", "name": "Chèn hàng trên", "nameVi": "Chèn hàng phía trên (Insert Above)", "msoId": "TableRowInsertAbove", "controlType": "button"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Hàng & Cột", "groupVi": "Hàng & Cột", "name": "Chèn hàng dưới", "nameVi": "Chèn hàng phía dưới (Insert Below)", "msoId": "TableRowInsertBelow", "controlType": "button"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Hàng & Cột", "groupVi": "Hàng & Cột", "name": "Chèn cột trái", "nameVi": "Chèn cột bên trái (Insert Left)", "msoId": "TableColumnInsertLeft", "controlType": "button"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Hàng & Cột", "groupVi": "Hàng & Cột", "name": "Chèn cột phải", "nameVi": "Chèn cột bên phải (Insert Right)", "msoId": "TableColumnInsertRight", "controlType": "button"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Hàng & Cột", "groupVi": "Hàng & Cột", "name": "Xóa hàng/cột", "nameVi": "Xóa hàng, xóa cột hoặc xóa toàn bộ bảng (Delete)", "msoId": "TableDelete", "controlType": "menu"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Gộp ô", "groupVi": "Gộp ô", "name": "Gộp ô", "nameVi": "Gộp các ô đang chọn thành một ô (Merge Cells)", "msoId": "TableMergeCells", "controlType": "button"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Gộp ô", "groupVi": "Gộp ô", "name": "Tách ô", "nameVi": "Tách ô thành nhiều hàng và cột (Split Cells)", "msoId": "TableSplitCells", "controlType": "button"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Kích thước ô", "groupVi": "Kích thước ô", "name": "Chiều cao hàng bảng", "nameVi": "Chiều cao hàng trong bảng (Table Row Height)", "msoId": "TableCellHeight", "controlType": "editBox"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Kích thước ô", "groupVi": "Kích thước ô", "name": "Chiều rộng cột bảng", "nameVi": "Chiều rộng cột trong bảng (Table Column Width)", "msoId": "TableCellWidth", "controlType": "editBox"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Kích thước ô", "groupVi": "Kích thước ô", "name": "Phân phối đều hàng", "nameVi": "Chia đều chiều cao các hàng (Distribute Rows)", "msoId": "TableDistributeRows", "controlType": "button"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Kích thước ô", "groupVi": "Kích thước ô", "name": "Phân phối đều cột", "nameVi": "Chia đều chiều rộng các cột (Distribute Columns)", "msoId": "TableDistributeColumns", "controlType": "button"},
    {"tab": "Bố trí bảng", "tabVi": "Công cụ bảng > Bố trí", "group": "Căn chỉnh ô", "groupVi": "Căn chỉnh ô", "name": "Căn lề ô", "nameVi": "Căn lề chữ trong ô (Top/Center/Bottom, Left/Center/Right)", "msoId": "TableCellAlignMenu", "controlType": "menu"},

    # TAB NGỮ CẢNH: CÔNG CỤ BIỂU ĐỒ (CHART TOOLS DESIGN & FORMAT)
    {"tab": "Thiết kế biểu đồ", "tabVi": "Công cụ biểu đồ > Thiết kế", "group": "Bố cục biểu đồ", "groupVi": "Bố cục biểu đồ", "name": "Thêm thành phần biểu đồ", "nameVi": "Thêm thành phần biểu đồ (Trục, Tiêu đề, Nhãn, Bảng, Lưới, Chú giải)", "msoId": "ChartAddElement", "controlType": "menu"},
    {"tab": "Thiết kế biểu đồ", "tabVi": "Công cụ biểu đồ > Thiết kế", "group": "Bố cục biểu đồ", "groupVi": "Bố cục biểu đồ", "name": "Bố cục nhanh", "nameVi": "Bố cục trình bày biểu đồ nhanh (Quick Layout)", "msoId": "ChartQuickLayout", "controlType": "gallery"},
    {"tab": "Thiết kế biểu đồ", "tabVi": "Công cụ biểu đồ > Thiết kế", "group": "Kiểu biểu đồ", "groupVi": "Kiểu biểu đồ", "name": "Đổi màu biểu đồ", "nameVi": "Đổi bảng màu chuỗi dữ liệu (Change Colors)", "msoId": "ChartChangeColors", "controlType": "gallery"},
    {"tab": "Thiết kế biểu đồ", "tabVi": "Công cụ biểu đồ > Thiết kế", "group": "Kiểu biểu đồ", "groupVi": "Kiểu biểu đồ", "name": "Kiểu biểu đồ", "nameVi": "Thư viện kiểu dáng biểu đồ (Chart Styles Gallery)", "msoId": "ChartStylesGallery", "controlType": "gallery"},
    {"tab": "Thiết kế biểu đồ", "tabVi": "Công cụ biểu đồ > Thiết kế", "group": "Dữ liệu", "groupVi": "Dữ liệu", "name": "Chuyển hàng/cột", "nameVi": "Chuyển đổi hàng và cột chuỗi dữ liệu (Switch Row/Column)", "msoId": "ChartSwitchRowColumn", "controlType": "button"},
    {"tab": "Thiết kế biểu đồ", "tabVi": "Công cụ biểu đồ > Thiết kế", "group": "Dữ liệu", "groupVi": "Dữ liệu", "name": "Chọn dữ liệu", "nameVi": "Chọn vùng dữ liệu nguồn biểu đồ (Select Data)", "msoId": "ChartSelectData", "controlType": "button"},
    {"tab": "Thiết kế biểu đồ", "tabVi": "Công cụ biểu đồ > Thiết kế", "group": "Dữ liệu", "groupVi": "Dữ liệu", "name": "Sửa dữ liệu", "nameVi": "Chỉnh sửa dữ liệu trong Excel nhúng (Edit Data)", "msoId": "ChartEditData", "controlType": "splitButton"},
    {"tab": "Thiết kế biểu đồ", "tabVi": "Công cụ biểu đồ > Thiết kế", "group": "Loại", "groupVi": "Loại", "name": "Đổi loại biểu đồ", "nameVi": "Thay đổi loại biểu đồ (Change Chart Type)", "msoId": "ChartChangeType", "controlType": "button"},

    # TAB NGỮ CẢNH: CÔNG CỤ PHƯƠNG TIỆN (MEDIA PLAYBACK)
    {"tab": "Phát lại phương tiện", "tabVi": "Công cụ phương tiện > Phát lại", "group": "Xem trước", "groupVi": "Xem trước", "name": "Phát phương tiện", "nameVi": "Phát thử video/âm thanh (Play)", "msoId": "MediaPlay", "controlType": "button"},
    {"tab": "Phát lại phương tiện", "tabVi": "Công cụ phương tiện > Phát lại", "group": "Chỉnh sửa", "groupVi": "Chỉnh sửa", "name": "Cắt video/âm thanh", "nameVi": "Cắt tỉa thời lượng media (Trim Video/Audio)", "msoId": "MediaTrim", "controlType": "button"},
    {"tab": "Phát lại phương tiện", "tabVi": "Công cụ phương tiện > Phát lại", "group": "Tùy chọn phương tiện", "groupVi": "Tùy chọn phương tiện", "name": "Âm lượng", "nameVi": "Mức âm lượng media (Low, Medium, High, Mute)", "msoId": "MediaVolume", "controlType": "menu"},
    {"tab": "Phát lại phương tiện", "tabVi": "Công cụ phương tiện > Phát lại", "group": "Tùy chọn phương tiện", "groupVi": "Tùy chọn phương tiện", "name": "Bắt đầu phát", "nameVi": "Chế độ kích hoạt phát (Automatically / When Clicked)", "msoId": "MediaStart", "controlType": "comboBox"},
    {"tab": "Phát lại phương tiện", "tabVi": "Công cụ phương tiện > Phát lại", "group": "Tùy chọn phương tiện", "groupVi": "Tùy chọn phương tiện", "name": "Lặp lại", "nameVi": "Lặp lại liên tục cho đến khi dừng (Loop until Stopped)", "msoId": "MediaLoopUntilStopped", "controlType": "checkBox"}
]


def query_powerpoint_labels(ids: list[str]) -> dict[str, str]:
    """Khởi động PowerPoint COM và truy vấn GetLabelMso cho danh sách id."""
    unique_ids = sorted(list(set(ids)))
    # Tạo mã powershell truy vấn các ID pure-ascii
    id_list_str = "@('" + "', '".join(unique_ids) + "')"
    ps_code = f"""
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$ppt = $null
for ($a = 0; $a -lt 30 -and -not $ppt; $a++) {{
    try {{ $ppt = New-Object -ComObject PowerPoint.Application }} catch {{ Start-Sleep -Milliseconds 700 }}
}}
$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id | ? {{ $before -notcontains $_ }})
$labels = @{{}}
if ($ppt) {{
    $ids = {id_list_str}
    foreach ($id in $ids) {{
        try {{
            $lbl = $ppt.CommandBars.GetLabelMso($id)
            if ($lbl) {{ $labels[$id] = $lbl }}
        }} catch {{}}
    }}
    try {{ $ppt.Quit() }} catch {{}}
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}}
foreach ($p in $mine) {{ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }}
$labels | ConvertTo-Json
"""
    try:
        proc = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_code],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=30
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return json.loads(proc.stdout)
    except Exception as ex:
        print(f"Warning: Không kết nối được PowerPoint COM: {ex}", file=sys.stderr)
    return {}


def main():
    repo_root = pathlib.Path(__file__).resolve().parents[2]
    out_path = repo_root / "docs" / "ribbon-scan-ppt-1710.json"
    
    all_ids = [c["msoId"] for c in CONTROLS]
    print(f"Đang truy vấn {len(all_ids)} Mso IDs qua PowerPoint 2016 COM...")
    live_labels = query_powerpoint_labels(all_ids)
    print(f"PowerPoint COM trả về {len(live_labels)} nhãn trực tiếp.")

    scan_results = []
    live_count = 0
    for ctrl in CONTROLS:
        mso_id = ctrl["msoId"]
        is_live = mso_id in live_labels
        label = live_labels.get(mso_id, ctrl["name"])
        if is_live:
            live_count += 1
            source = "PowerPoint 2016 COM GetLabelMso (16.0.4266)"
        else:
            source = "PowerPoint 2016 Fluent Ribbon XML Specification"

        item = {
            "tab": ctrl["tab"],
            "tabVi": ctrl["tabVi"],
            "group": ctrl["group"],
            "groupVi": ctrl["groupVi"],
            "name": ctrl["name"],
            "nameVi": ctrl["nameVi"],
            "msoId": mso_id,
            "label": label,
            "controlType": ctrl["controlType"],
            "liveCom": is_live,
            "enabled": True,
            "visible": True,
            "source": source
        }
        scan_results.append(item)

    out_path.write_text(json.dumps(scan_results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Hoàn tất: Đã ghi {len(scan_results)} controls ({live_count} live COM) vào {out_path}")


if __name__ == "__main__":
    main()
