/**
 * Loại trừ bút toán khấu hao — phục vụ báo cáo "P&L KHÔNG KHẤU HAO".
 *
 * Lọc NGAY Ở TẦNG ĐỌC BÚT TOÁN, trước khi tổng hợp: tài liệu yêu cầu không
 * được lấy tổng P&L rồi cộng ngược khấu hao. Nhờ lọc từ dữ liệu chi tiết,
 * drill-down cũng tự động không thấy các dòng đã bị loại.
 *
 * Báo cáo này chỉ là một GÓC NHÌN: không sửa bút toán, không xoá khấu hao,
 * không tạo nguồn dữ liệu mới, không ảnh hưởng báo cáo tài chính.
 */

/** Tiền tố tài khoản hao mòn tài sản cố định. */
const TK_HAO_MON = '214';

/** Hình tối thiểu mà bộ lọc cần đọc — chứng từ và dòng Nhật ký chung đều khớp. */
export interface ButToanCoKhoanMuc {
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  danhMuc?: {
    taiKhoanNo?: { ma?: string };
    taiKhoanCo?: { ma?: string };
    khoanMuc?: { ma?: string; ten?: string };
  };
}

/** Bỏ dấu, hạ chữ thường — tên khoản mục người dùng gõ mỗi nơi một kiểu. */
const khongDau = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const dinhTaiKhoanHaoMon = (v: ButToanCoKhoanMuc): boolean => {
  const no = v.danhMuc?.taiKhoanNo?.ma ?? v.taiKhoanNo ?? '';
  const co = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo ?? '';
  return no.startsWith(TK_HAO_MON) || co.startsWith(TK_HAO_MON);
};

/**
 * Đúng chữ tài liệu: khoản mục là "Khấu hao" VÀ đi kèm tài khoản 214.
 *
 * Điều kiện VÀ, không phải HOẶC — một bút toán chạm 214 vì thanh lý tài sản
 * không phải chi phí khấu hao trong kỳ.
 */
export function laButToanKhauHao(v: ButToanCoKhoanMuc): boolean {
  const tenKhoanMuc = v.danhMuc?.khoanMuc?.ten;
  if (!tenKhoanMuc) return false;
  if (!khongDau(tenKhoanMuc).includes('khau hao')) return false;
  return dinhTaiKhoanHaoMon(v);
}

export function loaiTruKhauHao<T extends ButToanCoKhoanMuc>(rows: T[]): T[] {
  return rows.filter((v) => !laButToanKhauHao(v));
}
