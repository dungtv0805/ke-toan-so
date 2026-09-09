export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatShortCurrency = (value: number): string => {
  const v = value || 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} tr`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)} k`;
  return new Intl.NumberFormat('vi-VN').format(v);
};

/**
 * Nhãn số hiện THẲNG trên biểu đồ, đơn vị TRIỆU đồng — cùng thang với trục và
 * với các biểu đồ đã có nhãn từ trước, để không có cảnh biểu đồ này ghi "1.234"
 * còn biểu đồ bên cạnh ghi "1,2 tỷ".
 *
 * Giá trị 0 trả chuỗi rỗng: vẽ số 0 lên mọi điểm trống làm biểu đồ đặc chữ.
 * Dưới 10 triệu giữ MỘT chữ số thập phân — làm tròn hết thì 400 nghìn hiện
 * thành "0", người đọc tưởng không có số liệu.
 */
export const nhanTrieu = (value?: number | null): string => {
  const v = value || 0;
  if (!v) return '';
  const trieu = v / 1_000_000;
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: Math.abs(trieu) < 10 ? 1 : 0,
  }).format(trieu);
};

/**
 * Số tiền quy về TRIỆU đồng cho phần chữ cạnh biểu đồ (chú giải, thẻ số).
 *
 * Khác `nhanTrieu` ở chỗ GIỮ số 0: trong bảng chú giải một ô trống trông như
 * lỗi tải dữ liệu, còn vẽ đè lên biểu đồ thì số 0 chỉ làm rối.
 */
export const soTrieu = (value?: number | null): string => {
  const trieu = (value || 0) / 1_000_000;
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: Math.abs(trieu) < 10 ? 1 : 0,
  }).format(trieu);
};

/** Như nhanTrieu nhưng lấy trị tuyệt đối — dùng cho cột vẽ ngược xuống dưới. */
export const nhanTrieuAbs = (value?: number | null): string => nhanTrieu(Math.abs(value || 0));

/** Lát cắt nhỏ hơn ngưỡng này thì bỏ nhãn, không thì chữ chồng lên nhau. */
export const NGUONG_NHAN_LAT_CAT = 0.04;

/**
 * Nhãn ngoài của biểu đồ tròn: "45% · 1.234 tr".
 *
 * Có kèm đơn vị vì hình tròn KHÔNG có trục để người đọc suy ra thang đo.
 * Lát quá nhỏ trả rỗng — nhãn của chúng chồng lên nhau thành một vệt đen.
 */
export const nhanLatCat = (value?: number | null, tong?: number): string => {
  const v = Math.abs(value || 0);
  const t = Math.abs(tong || 0);
  if (!v || !t) return '';
  const tyLe = v / t;
  if (tyLe < NGUONG_NHAN_LAT_CAT) return '';
  return `${Math.round(tyLe * 100)}% · ${nhanTrieu(value)} tr`;
};

/**
 * Bảng màu biểu đồ — BẮT BUỘC là mã hex, KHÔNG được dùng `hsl(var(--token))`.
 *
 * Recharts đưa `fill` / `stroke` xuống thành THUỘC TÍNH TRÌNH BÀY của SVG
 * (`<path stroke="…">`), mà `var()` chỉ được thay ở computed-value time cho
 * khai báo CSS — trong presentation attribute nó KHÔNG giải được, trình duyệt
 * coi giá trị là không hợp lệ và bỏ qua, nên cột/đường biến mất khỏi biểu đồ.
 * Token vẫn chạy bình thường trong `style={{ fill }}` và trong className.
 *
 * Mỗi màu dưới đây là giá trị bản SÁNG của token ghi ở comment; sửa token thì
 * sửa cả ở đây.
 */
export const DASH_COLORS = {
  revenue: '#1F9254', // = --success / --green
  expense: '#D93025', // = --destructive / --red
  balance: '#1F7769', // = --primary
  accent: '#B6954E', // = --brand-gold
  muted: '#6E6E73', // = --muted-foreground / --ink-2
};

/**
 * Lưới nền + đường trục của biểu đồ. Xám trung tính pha alpha để đọc được trên
 * cả nền sáng lẫn nền tối (hex vì lý do nêu ở DASH_COLORS).
 */
export const CHART_GRID = '#8A8A8F59'; // xám 35% alpha
