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

/** Dashboard color tokens (CSS vars). */
export const DASH_COLORS = {
  revenue: 'hsl(var(--success))',
  expense: 'hsl(var(--destructive))',
  balance: 'hsl(var(--primary))',
  accent: 'hsl(var(--brand-gold))',
  muted: 'hsl(var(--muted-foreground))',
};
