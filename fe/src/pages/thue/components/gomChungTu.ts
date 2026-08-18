export interface ChungTuEntry {
  soPhieu: string;
  ngay: string;
  dienGiai: string;
  soTien: number;
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
 * số tiền là tổng của cả nhóm.
 */
export function gomChungTuTheoSoPhieu(entries: ChungTuEntry[]): ChungTuGom[] {
  const map = new Map<string, ChungTuGom>();
  for (const e of entries) {
    const existed = map.get(e.soPhieu);
    if (existed) {
      existed.soTien += e.soTien;
      existed.soButToan += 1;
    } else {
      map.set(e.soPhieu, { ...e, soButToan: 1 });
    }
  }
  return [...map.values()];
}
