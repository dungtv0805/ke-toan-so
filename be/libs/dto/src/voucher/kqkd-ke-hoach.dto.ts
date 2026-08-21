/**
 * Báo cáo KQKD của số KẾ HOẠCH. Chỉ mang 12 số tháng — năm, 6 tháng đầu/cuối, quý
 * và % đều là tổng của 12 số đó, phía hiển thị tự cộng.
 */
export interface KqkdKeHoachDong {
  /** Duy nhất trong cả cây: '01' | '01:N1' | '25:N2:KM01'. */
  key: string;
  /** Mã số BCTC — chỉ dòng cấp 0 mới có. */
  ma?: string;
  /** 'I' … 'XIII' — ba dòng thu nhập khác / chi phí khác / lợi nhuận khác không có. */
  soLaMa?: string;
  ten: string;
  /** 0 = mục, 1 = nhóm, 2 = khoản mục. */
  cap: 0 | 1 | 2;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  con?: KqkdKeHoachDong[];
}

export interface KqkdKeHoachReport {
  nam: number;
  dong: KqkdKeHoachDong[];
  /** Mẫu số của cột % — doanh thu thuần (mã 10) cả năm. */
  doanhThuThuanNam: number;
}
