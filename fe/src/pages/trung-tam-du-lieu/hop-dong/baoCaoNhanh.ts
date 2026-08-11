const num = (v: unknown): number => Number(v) || 0;

/** Các số của một đơn hàng mà báo cáo nhanh cần. Thiếu trường nào coi như 0. */
export interface DongBaoCao {
  giaTriSauThue?: number;
  tienThue?: number;
  /** Tiền đã thu của đơn hàng. */
  daThu?: number;
  /** Số dư Có 3387 còn treo (có từ GĐ2). */
  dtChuaThucHien?: number;
  /** Doanh thu đã ghi nhận, Có 511 (có từ GĐ2). */
  dtDaThucHien?: number;
  /** Tổng tiền hàng + tiền thuế đã xuất hóa đơn. */
  daTraHoaDon?: number;
}

export interface BaoCaoNhanh {
  doanhSo: number;
  dtChuaThucHien: number;
  dtDaThucHien: number;
  tienThue: number;
  daThu: number;
  conPhaiThu: number;
  daXuatHoaDon: number;
  chuaXuatHoaDon: number;
}

/**
 * Tám chỉ tiêu của thanh báo cáo nhanh, cộng trên đúng tập dòng đang hiển thị
 * (sau mọi bộ lọc). Hai chỉ tiêu suy ra chứ không cộng: còn phải thu và chưa xuất
 * hóa đơn — cùng gốc là doanh số sau thuế.
 */
export function tongHopBaoCaoNhanh(rows: DongBaoCao[]): BaoCaoNhanh {
  const t = rows.reduce(
    (acc, r) => {
      acc.doanhSo += num(r.giaTriSauThue);
      acc.tienThue += num(r.tienThue);
      acc.daThu += num(r.daThu);
      acc.dtChuaThucHien += num(r.dtChuaThucHien);
      acc.dtDaThucHien += num(r.dtDaThucHien);
      acc.daXuatHoaDon += num(r.daTraHoaDon);
      return acc;
    },
    {
      doanhSo: 0,
      tienThue: 0,
      daThu: 0,
      dtChuaThucHien: 0,
      dtDaThucHien: 0,
      daXuatHoaDon: 0,
    },
  );

  return {
    ...t,
    conPhaiThu: t.doanhSo - t.daThu,
    chuaXuatHoaDon: t.doanhSo - t.daXuatHoaDon,
  };
}
