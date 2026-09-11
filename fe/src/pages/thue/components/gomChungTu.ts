export interface ChungTuEntry {
  soPhieu: string;
  ngay: string;
  dienGiai: string;
  soTien: number;
  /** Đơn hàng (= hợp đồng) của bút toán, nếu chứng từ lập theo đơn hàng. */
  soHopDong?: string;
}

export interface ChungTuGom extends ChungTuEntry {
  /** Số bút toán đã gộp vào dòng này — 1 nghĩa là chứng từ chỉ có một dòng. */
  soButToan: number;
}

/**
 * Gom nhiều bút toán cùng số phiếu thành một dòng — thao tác gắn chứng từ là theo
 * SỐ PHIẾU chứ không theo từng bút toán, nên danh sách hiển thị phải phản ánh đúng
 * đơn vị đó (tránh trùng rowKey + trùng lựa chọn khi một chứng từ có nhiều dòng qua
 * createBatch/nhomGop).
 *
 * Ngày và diễn giải lấy theo bút toán xuất hiện đầu tiên trong danh sách đầu vào;
 * số tiền là tổng của cả nhóm; đơn hàng lấy của bút toán đầu tiên có đơn hàng.
 */
export function gomChungTuTheoSoPhieu(entries: ChungTuEntry[]): ChungTuGom[] {
  const map = new Map<string, ChungTuGom>();
  for (const e of entries) {
    const existed = map.get(e.soPhieu);
    if (existed) {
      existed.soTien += e.soTien;
      existed.soButToan += 1;
      if (!existed.soHopDong && e.soHopDong) existed.soHopDong = e.soHopDong;
    } else {
      map.set(e.soPhieu, { ...e, soButToan: 1 });
    }
  }
  return [...map.values()];
}

export interface HoaDonCanGan {
  tongThanhToan: number;
  giaTriChuaThue: number;
  ngayHoaDon: string;
}

export interface ChungTuGoiY extends ChungTuGom {
  /** Tổng tiền chứng từ bằng tổng thanh toán HOẶC giá trị chưa thuế của hóa đơn. */
  khopTien: boolean;
}

/** Lệch dưới 1 đồng vẫn là khớp — số tiền thuế hay bị làm tròn khác nhau. */
const khop = (a: number, b: number) => b > 0 && Math.abs(a - b) < 1;

const ms = (ngay: string) => new Date(String(ngay).slice(0, 10)).getTime();

/**
 * Xếp chứng từ gợi ý để gắn với một hóa đơn: khớp số tiền lên đầu, trong mỗi
 * nhóm thì chứng từ gần ngày hóa đơn nhất trước. Chứng từ thu tiền có thể ghi
 * tổng thanh toán (gồm thuế) còn chứng từ doanh thu ghi giá trị chưa thuế, nên
 * khớp một trong hai là đủ.
 */
export function xepGoiY(ds: ChungTuGom[], hd: HoaDonCanGan): ChungTuGoiY[] {
  const moc = ms(hd.ngayHoaDon);
  return ds
    .map((c) => ({
      ...c,
      khopTien: khop(c.soTien, hd.tongThanhToan) || khop(c.soTien, hd.giaTriChuaThue),
    }))
    .sort(
      (a, b) =>
        Number(b.khopTien) - Number(a.khopTien) ||
        Math.abs(ms(a.ngay) - moc) - Math.abs(ms(b.ngay) - moc),
    );
}
