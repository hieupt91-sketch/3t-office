/**
 * Huong dan su dung 3T Office -- Bo sung tu audit lan 2 (04/10/2026).
 * 15 lenh dung hang ngay co vi tri ribbon khac voi bai huong dan cu.
 * Vi tri ribbon da kiem chung tu cau hinh thuc te (apps/ribbon.js).
 * commandIds de trong de khong xung dot voi bai huong dan goc.
 * Tu dang ky vao catalog dung chung qua registerHelpEntries().
 */

import { registerHelpEntries } from "./help-catalog.js";

export const AUDIT2_HELP_ENTRIES = [
  {
    id: "writer.page.break.audit2",
    app: "writer",
    commandIds: [],
    title: "Ngat trang (Page Break) -- vi tri ribbon chuan",
    summary: "Chen ngat trang ngay tai vi tri con tro, day noi dung phia sau sang trang moi. Khac voi Ngat muc -- ngat trang khong tao vung dinh dang moi. Vi tri ribbon chuan: tab Chen > nhom Trang van ban. (Bai cu: Bo cuc > Thiet lap trang)",
    ribbon: { tab: "Chen", tabId: "insert", group: "Trang van ban" },
    keywords: ["ngat trang", "page break", "trang moi", "chen trang", "ctrl+enter", "chen", "trang van ban"],
    steps: [
      "Dat con tro tai vi tri muon bat dau trang moi.",
      "Mo tab Chen, nhom Trang van ban, nhan nut lon Ngat trang (hoac nhan Ctrl+Enter).",
      "Noi dung sau con tro duoc day sang trang ke tiep. Ngat trang hien thi dang duong dut trong che do Bo tri in.",
      "De xoa ngat trang: dat con tro ngay truoc noi dung trang sau, nhan Backspace. Hoac bat Hien dau dinh dang (Trang dau > Doan van) de thay ky hieu ngat trang roi xoa.",
      "Luu y: Ngat trang khac Ngat muc (Bo cuc > Thiet lap trang > Ngat). Ngat muc cho phep doi le, huong giay, cot cho tung muc; ngat trang chi doi trang.",
      "Bai huong dan cu (writer.section.breaks) co vi tri ribbon la 'Bo cuc > Thiet lap trang' -- day la sai. Vi tri that tren ribbon la 'Chen > Trang van ban'."
    ]
  },
  {
    id: "writer.comment.insert.audit2",
    app: "writer",
    commandIds: [],
    title: "Them ghi chu (Comment) -- vi tri ribbon chuan",
    summary: "Gan ghi chu vao doan van hoac tu dang boi. Ghi chu hien thi o cot ben phai, ke ten tac gia va thoi gian. Dung de trao doi y kien khi lam viec nhom. Vi tri ribbon chuan: tab Chen > nhom Ghi chu. (Bai cu: Danh gia > Ghi chu)",
    ribbon: { tab: "Chen", tabId: "insert", group: "Ghi chu" },
    keywords: ["ghi chu", "comment", "chen ghi chu", "trai doi", "doan van", "chen", "ghi chu"],
    steps: [
      "Boi den doan van, tu hoac dat con tro tai vi tri can ghi chu.",
      "Mo tab Chen, nhom Ghi chu, nhan nut lon Ghi chu.",
      "Khung ghi chu mo o cot ben phai. Go noi dung roi nhan Dang (hoac Ctrl+Enter).",
      "Ghi chu hien thi ten nguoi dung va gio. Nhap vao ghi chu de tra loi, sua hoac xoa.",
      "De duyet cac ghi chu: tab Danh gia, nhom Ghi chu -- dung Ghi chu truoc/Ghi chu sau. Nhan Da xu ly de an ma giu noi dung.",
      "Bai huong dan cu (writer.comment.insertHelp) co vi tri ribbon la 'Danh gia > Ghi chu' -- day la sai. Vi tri that tren ribbon la 'Chen > Ghi chu'."
    ]
  },
  {
    id: "writer.para.indentInc.audit2",
    app: "writer",
    commandIds: [],
    title: "Tang thut le (Increase Indent) -- vi tri ribbon chuan",
    summary: "Day doan van dang chon lui vao 0,5 cm (mac dinh) so voi le trai. Ap dung cho ca danh sach da cap: tang cap con. Vi tri ribbon chuan: tab Bo cuc > nhom Doan van. (Bai cu: Trang dau > Doan van)",
    ribbon: { tab: "Bo cuc", tabId: "layout", group: "Doan van" },
    keywords: ["tang thut le", "increase indent", "thut le", "ctrl+m", "danh sach da cap", "bo cuc", "doan van"],
    steps: [
      "Dat con tro trong doan (hoac boi nhieu doan) can tang thut.",
      "Mo tab Bo cuc, nhom Doan van, nhan Tang thut le (bieu tuong mui ten phai). Phim tat: Ctrl+M.",
      "Doan dich chuyen sang phai 0,5 cm. Lap lai de tang them.",
      "Trong danh sach da cap: Tang thut le bien muc thanh cap con (vi du 2. thanh 1.1.). Giam thut le (Ctrl+Shift+M) lam nguoc lai.",
      "Xem truc quan tren thuoc ngang: tam giac duoi ben trai (thut le treo) va hinh chu nhat ben trai (thut dong dau) cung dich sang phai.",
      "Bai huong dan cu (writer.para.alignAndList) co vi tri ribbon la 'Trang dau > Doan van' -- day la sai. Vi tri that tren ribbon la 'Bo cuc > Doan van'."
    ]
  },
  {
    id: "writer.para.indentDec.audit2",
    app: "writer",
    commandIds: [],
    title: "Giam thut le (Decrease Indent) -- vi tri ribbon chuan",
    summary: "Keo doan van dang chon ra ve phia le trai 0,5 cm. Trong danh sach da cap: giam cap (cap con thanh cap cha). Vi tri ribbon chuan: tab Bo cuc > nhom Doan van. (Bai cu: Trang dau > Doan van)",
    ribbon: { tab: "Bo cuc", tabId: "layout", group: "Doan van" },
    keywords: ["giam thut le", "decrease indent", "thut le", "ctrl+shift+m", "danh sach da cap", "bo cuc", "doan van"],
    steps: [
      "Dat con tro trong doan (hoac boi nhieu doan) da duoc thut le.",
      "Mo tab Bo cuc, nhom Doan van, nhan Giam thut le (bieu tuong mui ten trai). Phim tat: Ctrl+Shift+M.",
      "Doan dich chuyen sang trai 0,5 cm. Khong the giam vuot qua le trang (0 cm).",
      "Trong danh sach da cap: Giam thut le dua muc cap con ve cap cha (vi du 1.1. thanh 2.). O cap 1, lenh nay bo danh so, bien thanh doan thuong.",
      "Khac voi phan mem soan thao van ban khac: Shift+Tab khong giam cap trong Doc -- dung Ctrl+Shift+M hoac nut ribbon.",
      "Bai huong dan cu (writer.para.alignAndList) co vi tri ribbon la 'Trang dau > Doan van' -- day la sai. Vi tri that tren ribbon la 'Bo cuc > Doan van'."
    ]
  },
  {
    id: "sheet.sheet.protect.audit2",
    app: "sheet",
    commandIds: [],
    title: "Bao ve trang tinh (Protect Sheet) -- vi tri ribbon chuan",
    summary: "Khoa sua noi dung, dinh dang, chen/xoa hang cot tren trang tinh hien tai. Co the dat mat khau (luu trong phien, khong phai bao mat manh). Vi tri ribbon chuan: tab Xem xet > nhom Bao ve. (Bai cu: Trang dau > O)",
    ribbon: { tab: "Xem xet", tabId: "review", group: "Bao ve" },
    keywords: ["bao ve", "protect sheet", "khoa sheet", "mat khau", "unprotect", "bo bao ve", "xem xet", "bao ve"],
    steps: [
      "Mo tab Xem xet, nhom Bao ve, nhan Bao ve trang tinh.",
      "Hop thoai hien o 'Bao ve trang tinh va noi dung cac o bi khoa'. Tu y chon nhap mat khau roi nhap lai xac nhan (de trong neu khong can).",
      "Khi da bao ve: khong go vao o, khong F2, khong xoa noi dung, khong doi dinh dang, khong chen/xoa hang cot. Tab trang tinh hien ky hieu khoa.",
      "Van duoc: doi ten tab, di chuyen tab, sao chep trang, chon o, loc du lieu (neu bo loc da bat truoc khi bao ve).",
      "De bo bao ve: cung nut (doi thanh Bo bao ve trang tinh) hoac chuot phai tab > Bo bao ve. Nhap mat khau neu co. Ctrl+Z hoan tac thao tac bao ve/bo bao ve.",
      "Bai huong dan cu (sheet.sheet.protect) co vi tri ribbon la 'Trang dau > O' -- day la sai. Vi tri that tren ribbon la 'Xem xet > Bao ve'."
    ]
  },
  {
    id: "sheet.data.pivotTable.audit2",
    app: "sheet",
    commandIds: [],
    title: "Bang tong hop (Pivot Table) -- vi tri ribbon chuan",
    summary: "Tao trang tinh moi chua bang tong hop tu vung du lieu co hang tieu de. Keo truong vao Rows/Columns/Values voi SUM, COUNT, AVERAGE, MIN, MAX. Lam moi khi nguon doi. Vi tri ribbon chuan: tab Chen > nhom Bang. (Bai cu: Du lieu > Bang tong hop)",
    ribbon: { tab: "Chen", tabId: "insert", group: "Bang" },
    keywords: ["pivot", "bang tong hop", "pivot table", "tong hop", "rows", "values", "lam moi", "phan tich du lieu", "chen", "bang"],
    steps: [
      "Chuan bi bang nguon: hang dau la tieu de cot duy nhat, cac hang duoi la du lieu. Boi vung (vi du A1:D20).",
      "Mo tab Chen, nhom Bang, nhan Bang tong hop.",
      "Hop thoai Tao Bang tong hop dien sa vung nguon. Nhan Doc ten cot, roi voi moi truong danh dau Rows, Columns va/hoac Values. Cot Values chon phep SUM / COUNT / AVERAGE / MIN / MAX.",
      "Nhan Tao Pivot Table. Sheet tao trang moi ten dang 'TenSheet (2)' va ghi bang tong hop bat dau tu A1.",
      "Khi sua du lieu nguon, mo trang Pivot roi nhan Lam moi Pivot (tab Du lieu > nhom Bang tong hop) de tinh lai. Hoan tac bang Ctrl+Z.",
      "Bai huong dan cu (sheet.data.pivotTable) co vi tri ribbon la 'Du lieu > Bang tong hop' -- day la sai. Vi tri that tren ribbon la 'Chen > Bang'."
    ]
  },
  {
    id: "sheet.format.quickCategory.audit2",
    app: "sheet",
    commandIds: [],
    title: "Dinh dang so nhanh (Number Format) -- vi tri ribbon chuan",
    summary: "Doi cach hien thi so tren o dang chon: Chung, So, Tien te, Ke toan, Ngay, Phan tram, Khoa hoc, Van ban. La hop chon tha xuong tren ribbon. Vi tri ribbon chuan: tab Trang dau > nhom So. (Bai cu: Trang dau > Dinh dang so)",
    ribbon: { tab: "Trang dau", tabId: "home", group: "So" },
    keywords: ["dinh dang so", "number format", "vnd", "phan tram", "hang nghin", "ngay thang", "tien te", "ke toan", "trang dau", "so"],
    steps: [
      "Chon mot hoac nhieu o so. Mo tab Trang dau, nhom So (ben phai Canh chinh).",
      "Hop chon nhanh mac dinh hien 'Chung'. Nhap mui ten mo danh sach: Chung, So, Tien te, Ke toan, Ngay, Phan tram, Khoa hoc, Van ban.",
      "Chon muc phu hop: So (co dau phan cach hang nghin), Tien te (co ky hieu VND), Ke toan (can le ky hieu tien), Ngay (dd/mm/yyyy), Phan tram (nhan 100, them %), Van ban (can trai, khong tinh toan).",
      "Nut tat canh hop: Tien te VND (Ctrl+Shift+4), Phan tram (Ctrl+Shift+5), Phan cach hang nghin (Ctrl+Shift+1), Tang/Giam so thap phan.",
      "Muon tuy chinh sau (so chu so thap phan, kieu so am, mau tu y chinh): nhan nut Dinh dang o... trong cung nhom, hoac Ctrl+1.",
      "Bai huong dan cu (sheet.format.number) co vi tri ribbon la 'Trang dau > Dinh dang so' -- day la sai. Vi tri that tren ribbon la 'Trang dau > So'."
    ]
  },
  {
    id: "sheet.format.cellsDialog.audit2",
    app: "sheet",
    commandIds: [],
    title: "Dinh dang o (Format Cells) -- hop thoai day du, vi tri launcher chuan",
    summary: "Hop thoai hoan chinh de chon loai so, so thap phan, dau phan cach hang nghin, ky hieu tien (VND), kieu ngay, khoa hoc, van ban hoac mau tu y chinh. Mo tu nut mui ten goc nhom Phong chu hoac Ctrl+1. Vi tri ribbon chuan: tab Trang dau > nhom Phong chu (launcher). (Bai cu: Trang dau > Dinh dang so)",
    ribbon: { tab: "Trang dau", tabId: "home", group: "Phong chu" },
    keywords: ["dinh dang o", "format cells", "ctrl+1", "so thap phan", "tien te", "ngay thang", "tu y chinh", "launcher", "trang dau", "phong chu"],
    steps: [
      "Chon o hoac vung can doi. Mo tab Trang dau, nhom Phong chu, nhap mui ten nho goc duoi phai nhom (launcher) -- hoac nhan Ctrl+1.",
      "Hop thoai liet ke danh muc ben trai: Chung (General), So (Number), Tien te (Currency), Ke toan (Accounting), Ngay thang (Date), Phan tram (Percentage), Khoa hoc (Scientific), Van ban (Text), Tu y chinh (Custom).",
      "Voi So/Tien te: chinh so chu so thap phan, bat dau phan cach hang nghin, chon kieu so am (do, ngoac, v.v.). Tien te co ky hieu VND. Ngay co mau dd/mm/yyyy. Tu y chinh cho phep nhap pattern nhu 0.00;[Red]-0.00.",
      "Xem truoc gia tri mau o hop thoai, roi nhan OK de ap dung cho vung chon. Esc hoac Dong de huy. Hoan tac bang Ctrl+Z.",
      "Luu y: Cung hop thoai nay cung phuc vu cho tab Canh chinh (launcher cua nhom Canh chinh) va tab So -- nhung cac tab do chi hien thi cac trang phu hop (Alignment, Number, Border, Fill, Protection).",
      "Bai huong dan cu (sheet.dialog.formatCellsHelp) co vi tri ribbon la 'Trang dau > Dinh dang so' -- day la sai. Vi tri that tren ribbon la 'Trang dau > Phong chu' (launcher cua nhom Phong chu)."
    ]
  },
  {
    id: "sheet.formula.sum.audit2",
    app: "sheet",
    commandIds: [],
    title: "Tu dong tong (AutoSum) -- vi tri ribbon chuan",
    summary: "Chen ham SUM tu dong cho dai o lien ke o dang chon (duoi hoac ben phai). Nut lon tren tab Trang dau nhom Chinh sua va tab Cong thuc nhom Ham tinh toan. Vi tri ribbon chuan (tren Home): tab Trang dau > nhom Chinh sua. (Bai cu: Cong thuc > Ham tinh toan)",
    ribbon: { tab: "Trang dau", tabId: "home", group: "Chinh sua" },
    keywords: ["tu dong tong", "autosum", "sum", "tong", "alt+=", "ham sum", "cong day", "trang dau", "chinh sua"],
    steps: [
      "Chon o ngay duoi mot cot so (hoac ben phai mot hang so) ma ban muon tong.",
      "Mo tab Trang dau, nhom Chinh sua, nhan nut lon Tu dong tong (bieu tuong Sigma). Hoac nhan Alt+=.",
      "Sheet tu nhan dien dai so lien ke, chen =SUM(...) va highlight vung do bang vien mau. Neu dung, nhan Enter. Neu sai, keo chon vung dung roi Enter.",
      "Mui ten nho canh nut Sigma mo menu: Trung binh, Dem so, Lon nhat, Nho nhat -- chen AVERAGE, COUNT, MAX, MIN tuong tu.",
      "Cung tab Cong thuc, nhom Ham tinh toan cung co nut Tu dong tong va cac ham nhanh. Ctrl+Z hoan tac.",
      "Bai huong dan cu (sheet.formula.basic) co vi tri ribbon la 'Cong thuc > Ham tinh toan' -- day la vi tri cua nut tren tab Cong thuc. Vi tri chuan tren tab Trang dau la 'Trang dau > Chinh sua'."
    ]
  },
  {
    id: "slides.text.insert.audit2",
    app: "slides",
    commandIds: [],
    title: "Hop van ban (Text Box) -- vi tri ribbon chuan",
    summary: "Chen mot khung chu doc lap, keo-tha va doi kich thuoc duoc, nam de len trang -- khac voi khung tieu de/noi dung cua bo cuc. Vi tri ribbon chuan: tab Trang dau > nhom Ve. (Bai cu: Trang dau > Doi tuong ve)",
    ribbon: { tab: "Trang dau", tabId: "home", group: "Ve" },
    keywords: ["hop van ban", "textbox", "khung chu", "chen hop chu", "ve", "doi tuong ve", "trang dau", "ve"],
    steps: [
      "Mo tab Trang dau, nhom Ve, nhan nut lon Hop van ban (bieu tuong khung chu).",
      "Con tro doi thanh 十. Keo tren slide de ve khung chu theo kich thuoc mong muon.",
      "Khung chu xuat hien, con tro nhap nhay ben trong -- go noi dung ngay. Nhan Enter de xuong dong, Tab/Shift+Tab de thut le.",
      "Keo vien khung de di chuyen, keo goc de thay doi kich thuoc. Nhap vao vien de chon ca khung (dinh dang vien, nen, vi tri).",
      "Cung nhom Ve con co Hinh khoi (chu nhat, tron, mui ten...) va Hinh anh. Ctrl+Z go khung vua chen.",
      "Bai huong dan cu (slides.insert.drawing) co vi tri ribbon la 'Trang dau > Doi tuong ve' -- day la sai. Vi tri that tren ribbon la 'Trang dau > Ve'."
    ]
  },
  {
    id: "slides.shape.insert.audit2",
    app: "slides",
    commandIds: [],
    title: "Hinh khoi (Shape) -- vi tri ribbon chuan",
    summary: "Chen hinh hoc co ban (chu nhat, tron, mui ten, sao, bong bong chat...) tu thu vien hinh khoi. Keo-tha, doi co, dinh dang vien/nen, go chu ben trong. Vi tri ribbon chuan: tab Trang dau > nhom Ve. (Bai cu: Trang dau > Doi tuong ve)",
    ribbon: { tab: "Trang dau", tabId: "home", group: "Ve" },
    keywords: ["hinh khoi", "shape", "chu nhat", "tron", "mui ten", "hinh hoc", "ve", "doi tuong ve", "trang dau", "ve"],
    steps: [
      "Mo tab Trang dau, nhom Ve, nhan nut lon Hinh khoi (bieu tuong hinh chu nhat/goc bo tron).",
      "Thu vien hinh khoi hien ra: gan ngay, Chu nhat, Hinh co ban, Mui ten, Bieu thuc, Sao & Bang, Bong bong chat. Nhap mot hinh.",
      "Con tro doi thanh 十. Keo tren slide de ve hinh theo kich thuoc. Hinh mac dinh co vien xanh, nen trong suot.",
      "Nhap vao hinh de chon. Go truc tiep de them chu ben trong hinh (hanh vi nhu hop van ban). Dung tab Phong chu/Doan van de dinh dang chu trong hinh.",
      "Dinh dang hinh: tab Dinh dang hinh (contextual khi chon hinh) -- doi Kieu hinh, Dien (mau nen), Vien, Hieu ung. Ctrl+Z go hinh vua chen.",
      "Bai huong dan cu (slides.insert.drawing) co vi tri ribbon la 'Trang dau > Doi tuong ve' -- day la sai. Vi tri that tren ribbon la 'Trang dau > Ve'."
    ]
  },
  {
    id: "slides.image.insert.audit2",
    app: "slides",
    commandIds: [],
    title: "Hinh anh (Picture) -- vi tri ribbon chuan",
    summary: "Chen anh tu may tinh (JPG, PNG, GIF, BMP, WebP...). Anh tro thanh doi tuong tren slide, keo-tha, doi co, cat (crop), giu ty le khung hinh. Vi tri ribbon chuan: tab Trang dau > nhom Ve. (Bai cu: Trang dau > Doi tuong ve)",
    ribbon: { tab: "Trang dau", tabId: "home", group: "Ve" },
    keywords: ["hinh anh", "anh", "picture", "chen anh", "jpg", "png", "crop", "cat anh", "ve", "trang dau", "ve"],
    steps: [
      "Mo tab Trang dau, nhom Ve, nhan nut lon Hinh anh (bieu tuong khung canh).",
      "Hop chon tep cua he thong hien ra. Chon file anh roi Mo. Anh chen vao slide, tu co vua khung soan thao, giu ty le.",
      "Keo hinh de dat vi tri. Keo 4 goc de doi co -- Slide tu giu ty le khung hinh (rong/cao). Keo canh ben neu muon thay doi ty le tu do.",
      "Nhap chuot phai anh > Cat (Crop) de loai bo phan thua. Keo tay cam den tren vien anh de chon vung giu lai, nhan Enter hoac nhap ra ngoai de ap dung.",
      "Dinh dang anh: tab Dinh dang hinh (contextual) -- Kieu anh, Vien, Hieu ung, Cat, Dat lai anh. Ctrl+Z go anh vua chen.",
      "Bai huong dan cu (slides.insert.drawing) co vi tri ribbon la 'Trang dau > Doi tuong ve' -- day la sai. Vi tri that tren ribbon la 'Trang dau > Ve'."
    ]
  },
  {
    id: "slides.review.commentInsert.audit2",
    app: "slides",
    commandIds: [],
    title: "Them nhan xet trang chieu (Comment) -- vi tri ribbon chuan",
    summary: "Mo panel nhan xet cua trang dang mo, go noi dung va Them nhan xet (Ctrl+Enter). Nhan xet gan theo trang, khong neo vao hinh cu the. Vi tri ribbon chuan: tab Chen > nhom Nhan xet. (Bai cu: Danh gia > Nhan xet)",
    ribbon: { tab: "Chen", tabId: "insert", group: "Nhan xet" },
    keywords: ["nhan xet", "comment", "them nhan xet", "ctrl+enter", "trang chieu", "ghi chu", "chen", "nhan xet"],
    steps: [
      "Mo tab Chen, nhom Nhan xet, nhan nut lon Nhan xet moi (cung co tren tab Danh gia, nhom Nhan xet).",
      "Panel 'Nhan xet trang chieu' mo ben canh. O 'Nhan xet moi', goi y 'Nhap noi dung nhan xet...', nut Them nhan xet.",
      "Go noi dung, nhan Them nhan xet hoac Ctrl+Enter. Tac gia mac dinh 'Nguoi dung', ke gio vi-VN.",
      "Moi muc co nut Xoa. Da xu ly nam nut ribbon rieng (tab Danh gia > Nhan xet > Da xu ly).",
      "Huy hieu + so tren vung soan thao; Bo sap xep trang hien N. Ctrl+Z hoan tac lan them/xoa.",
      "Bai huong dan cu (slides.review.commentInsertHelp) co vi tri ribbon la 'Danh gia > Nhan xet' -- day la sai. Vi tri that tren ribbon la 'Chen > Nhan xet'."
    ]
  },
  {
    id: "slides.notes.toggle.audit2",
    app: "slides",
    commandIds: [],
    title: "Ghi chu nguoi thuyet trinh (Speaker Notes) -- vi tri ribbon chuan",
    summary: "Bat/tat khung ghi chu duoi vung soan thao. Moi trang co ghi chu rieng. F5 khong hien cho khan gia -- chi thay trong khung nay va Che do Presenter (Alt+F5). Vi tri ribbon chuan: tab Trinh chieu > nhom Nguoi thuyet trinh. (Bai cu: Che do xem > Dang xem ban trinh chieu)",
    ribbon: { tab: "Trinh chieu", tabId: "slideshow", group: "Nguoi thuyet trinh" },
    keywords: ["ghi chu", "speaker notes", "thuyet trinh", "ghi chu trang", "notes", "presenter", "trinh chieu", "nguoi thuyet trinh"],
    steps: [
      "Mo tab Trinh chieu, nhom Nguoi thuyet trinh, nhan Ghi chu thuyet trinh -- hoac tab Che do xem, nhom Dang xem ban trinh chieu, cung nut.",
      "Khung duoi vung soan thao mo rong; nut tren khung doi thanh 'Thu gon ghi chu'.",
      "Go ghi chu cho trang dang mo. Chuyen thumbnail thi khung nap ghi chu cua trang moi, khong mang chu trang cu. Co bo dem ky tu tren khung.",
      "Nhan lai nut (hoac 'Thu gon ghi chu') de dong, lay cho vung soan thao. Ghi chu van duoc luu theo trang, ke ca khi thu gon.",
      "Khi chieu F5/Shift+F5 khan gia khong thay ghi chu. Muon doc ghi chu luc noi chuyen: Alt+F5 (Che do Presenter). Ghi chu duoc luu trong tep .pptx.",
      "Bai huong dan cu (slides.notes.toggle) co vi tri ribbon la 'Che do xem > Dang xem ban trinh chieu' -- day la sai. Vi tri that tren ribbon la 'Trinh chieu > Nguoi thuyet trinh'."
    ]
  },
  {
    id: "slides.arrange.alignLeft.audit2",
    app: "slides",
    commandIds: [],
    title: "Can chinh va phan phoi doi tuong (Align & Distribute) -- vi tri ribbon chuan",
    summary: "Can hai doi tuong tro len theo le trai/giua/phai, tren/giua duoc/duoi, phan phoi deu ngang/doc, hoac can theo trang chieu. Nam trong menu tha xuong Sap xep (Arrange) tren nhom Ve. Vi tri ribbon chuan: tab Trang dau > nhom Ve > menu Sap xep. (Bai cu: Trang dau > Doi tuong ve)",
    ribbon: { tab: "Trang dau", tabId: "home", group: "Ve" },
    keywords: ["can chinh", "align", "phan phoi", "distribute", "can trai", "can giua", "can phai", "can tren", "can duoi", "can theo trang", "sap xep", "arrange", "trang dau", "ve"],
    steps: [
      "Chon tu hai doi tuong tro len (giu Shift nhap tung hinh, hoac dung Chon > Chon tat ca/Chon doi tuong o nhom Chinh sua).",
      "Mo tab Trang dau, nhom Ve, nhan nut tha xuong Sap xep (bieu tuong mui ten 4 chieu).",
      "Can ngang: Can trai / Can giua / Can phai -- canh theo khung bao quanh cac doi tuong dang chon.",
      "Can doc: Can tren / Can giua / Can duoi -- tuong tu theo truc doc.",
      "Phan phoi deu: Phan phoi deu ngang / Phan phoi deu doc -- chia deu khoang TRONG giua cac doi tuong (can it nhat 3 doi tuong). Giu nguyen hinh dau va cuoi.",
      "Bat 'Can theo trang chieu' de cac lenh Can/Phan phoi dung toan bo khung trang chieu lam moc thay vi khung doi tuong. Tat de dung khung doi tuong (mac dinh).",
      "Phim tat: Ctrl+G nhom, Ctrl+Shift+G bo nhom. Tat ca thao tac hoan tac duoc bang Ctrl+Z.",
      "Bai huong dan cu (slides.shape.groupUngroup) co vi tri ribbon la 'Trang dau > Doi tuong ve' -- day la sai. Vi tri that tren ribbon la 'Trang dau > Ve' (menu Sap xep)."
    ]
  }
];

// Entries are registered via help-catalog.js import