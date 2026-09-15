/**
 * Kỳ kê khai và biên ngày.
 *
 * Gom một chỗ vì `tdlap` cổng Thuế trả về là chuỗi ISO có cả phần giờ
 * ('2026-01-31T00:00:00'), trong khi người dùng chọn khoảng bằng ngày trần.
 * So sánh thô thì hóa đơn lập ngày cuối kỳ rơi khỏi bảng kê mà không ai thấy.
 */
const pad = (n: number) => String(n).padStart(2, '0');

export function ngayHomSau(ngay: string): string {
  const d = new Date(`${String(ngay).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error(`Ngày không hợp lệ: ${ngay}`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function kyCuaNgay(ngay: string | Date, loai: 'thang' | 'quy' = 'thang'): string {
  const d = ngay instanceof Date ? ngay : new Date(ngay);
  if (Number.isNaN(d.getTime())) throw new Error(`Ngày không hợp lệ: ${String(ngay)}`);
  if (loai === 'quy') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

const ngayCuoiThang = (nam: number, thangIdx: number) => {
  const d = new Date(nam, thangIdx + 1, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function khoangCuaKy(ky: string): { tuNgay: string; denNgay: string } {
  const quy = /^(\d{4})-Q([1-4])$/.exec(ky);
  if (quy) {
    const nam = Number(quy[1]);
    const thangDau = (Number(quy[2]) - 1) * 3;
    return { tuNgay: `${nam}-${pad(thangDau + 1)}-01`, denNgay: ngayCuoiThang(nam, thangDau + 2) };
  }
  const thang = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(ky);
  if (thang) {
    const nam = Number(thang[1]);
    const idx = Number(thang[2]) - 1;
    return { tuNgay: `${nam}-${pad(idx + 1)}-01`, denNgay: ngayCuoiThang(nam, idx) };
  }
  throw new Error(`Kỳ kê khai không hợp lệ: ${ky}`);
}

/**
 * Cắt một khoảng ngày thành từng tháng.
 *
 * Quét cả năm trong một lần gọi là đặt cược tất cả vào một request: đứt giữa
 * chừng là mất trắng và phải quét lại từ đầu. Cắt theo tháng thì mỗi tháng là
 * một đơn vị ghi nhận riêng, hỏng tháng nào chạy lại đúng tháng đó.
 */
export function cuaSoThang(tuNgay: string, denNgay: string): Array<{ tuNgay: string; denNgay: string }> {
  if (!tuNgay || !denNgay || tuNgay > denNgay) return [];

  const ds: Array<{ tuNgay: string; denNgay: string }> = [];
  let con = String(tuNgay).slice(0, 10);

  for (let i = 0; i < 600 && con <= denNgay; i++) {
    const cuoi = khoangCuaKy(con.slice(0, 7)).denNgay;
    const het = cuoi < denNgay ? cuoi : String(denNgay).slice(0, 10);
    ds.push({ tuNgay: con, denNgay: het });
    con = ngayHomSau(het);
  }
  return ds;
}

/**
 * Ngày theo giờ Việt Nam, dạng 'yyyy-MM-dd'.
 *
 * Cổng Thuế lưu ngày lập là nửa đêm giờ Việt Nam, tức '2026-09-08T17:00:00Z'
 * cho ngày 09/09. Gọi thẳng toISOString() sẽ ra 08/09 — LỆCH MỘT NGÀY, và ở
 * ranh giới tháng thì hóa đơn rơi sang kỳ trước. Cộng 7 giờ rồi mới cắt chuỗi
 * cho ra đúng ngày, kể cả khi nguồn lưu theo nửa đêm UTC.
 */
export function ngayVN(v: Date | string | null | undefined): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Kỳ 'yyyy-MM' theo giờ Việt Nam. */
export function kyVN(v: Date | string | null | undefined): string {
  return ngayVN(v).slice(0, 7) || 'khong-ro-ky';
}
