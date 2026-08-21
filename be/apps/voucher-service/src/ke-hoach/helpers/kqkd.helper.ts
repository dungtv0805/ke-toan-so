import {
  ChiTieuGocKqkd,
  chiTieuGocRong,
  congButToan,
  MaChiTieuGoc,
  tinhChiTieuDanXuat,
} from '@app/core';
import { KqkdKeHoachDong, KqkdKeHoachReport } from '@app/dto';

const SO_THANG = 12;

export const NHAN_CHUA_PHAN_NHOM = 'Chưa phân nhóm';
export const NHAN_KHONG_CO_SAN_PHAM = 'Không phân bổ sản phẩm';
export const NHAN_KHONG_CO_KHOAN_MUC = 'Không phân bổ khoản mục';

/**
 * Hai rổ vét luôn xếp CUỐI, sau mọi nhóm có thật. Đây chỉ là khoá NHẬN DIỆN
 * (so bằng `===`, không so bằng thứ tự bảng mã) — comparator `theoKhoa` mới là
 * nơi thật sự đảm bảo thứ tự "vét luôn cuối", vì mã danh mục là chuỗi tự do
 * (có thể bắt đầu bằng ký tự tiếng Việt có dấu, lớn hơn mọi ký tự ASCII).
 */
const KEY_CHUA_PHAN_NHOM = '~1';
const KEY_KHONG_PHAN_BO = '~2';

/** Dòng kế hoạch thô đọc từ Mongo — chỉ những trường báo cáo cần. */
export interface DongKeHoachKqkd {
  ngay: Date | string;
  soTien: number;
  danhMuc?: {
    taiKhoanNo?: { ma?: string };
    taiKhoanCo?: { ma?: string };
    sanPham?: { ma?: string; ten?: string };
    khoanMuc?: { ma?: string; ten?: string; nhom?: string };
  };
}

export interface MucTraCuu {
  id?: string;
  ma: string;
  ten: string;
  nhom?: string;
}

export interface DanhMucTraCuuKqkd {
  sanPham: MucTraCuu[];
  nhomSanPham: MucTraCuu[];
  nhomKhoanMuc: MucTraCuu[];
}

const mangThang = (): number[] => new Array<number>(SO_THANG).fill(0);

/**
 * Tháng đọc theo UTC. Dòng kế hoạch luôn lưu 00:00:00.000Z của đúng ngày
 * (`ngayLuu` bên FE), nên đọc theo giờ VN sẽ đẩy 01/03 về tháng 2.
 */
function chiSoThang(ngay: Date | string): number | null {
  const d = ngay instanceof Date ? ngay : new Date(ngay);
  const thang = d.getUTCMonth();
  return Number.isNaN(thang) ? null : thang;
}

/** Một rổ 12 tháng của một nhánh trong cây. */
interface RoThang {
  ten: string;
  thang: number[];
  con?: Map<string, RoThang>;
}

const layRo = (
  bang: Map<string, RoThang>,
  key: string,
  ten: string,
): RoThang => {
  let ro = bang.get(key);
  if (!ro) {
    ro = { ten, thang: mangThang() };
    bang.set(key, ro);
  }
  return ro;
};

const laRoVet = (key: string) =>
  key === KEY_CHUA_PHAN_NHOM || key === KEY_KHONG_PHAN_BO;

/**
 * Nhóm thật sắp theo mã; hai rổ vét luôn xuống cuối — không dựa vào bảng mã
 * (mã danh mục là chuỗi tự do, có thể bắt đầu bằng ký tự có dấu lớn hơn mọi
 * ký tự ASCII, nên không thể chọn một khoá "chắc chắn lớn nhất" theo chuỗi).
 */
const theoKhoa = (a: [string, unknown], b: [string, unknown]) => {
  const vetA = laRoVet(a[0]);
  const vetB = laRoVet(b[0]);
  if (vetA !== vetB) return vetA ? 1 : -1;
  return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
};

export function buildKqkdKeHoach(
  rows: DongKeHoachKqkd[],
  danhMuc: DanhMucTraCuuKqkd,
  nam: number,
): KqkdKeHoachReport {
  // Tra cứu sản phẩm theo MÃ — hai sản phẩm khác mã có thể trùng tên.
  const sanPhamTheoMa = new Map(danhMuc.sanPham.map((sp) => [sp.ma, sp]));
  // `khoanMuc.nhom` lưu khi là mã, khi là id — nhận cả hai, đúng như FE đang làm.
  const nhomSanPhamTheoKhoa = new Map<string, MucTraCuu>();
  for (const n of danhMuc.nhomSanPham) {
    nhomSanPhamTheoKhoa.set(n.ma, n);
    if (n.id) nhomSanPhamTheoKhoa.set(n.id, n);
  }
  const nhomKhoanMucTheoKhoa = new Map<string, MucTraCuu>();
  for (const n of danhMuc.nhomKhoanMuc) {
    nhomKhoanMucTheoKhoa.set(n.ma, n);
    if (n.id) nhomKhoanMucTheoKhoa.set(n.id, n);
  }

  const tongThang: ChiTieuGocKqkd[] = Array.from(
    { length: SO_THANG },
    chiTieuGocRong,
  );
  // Cây nhóm sản phẩm, riêng cho từng chỉ tiêu gốc 01 / 02 / 11.
  const cayNhomSanPham = new Map<MaChiTieuGoc, Map<string, RoThang>>([
    ['01', new Map()],
    ['02', new Map()],
    ['11', new Map()],
  ]);
  // Cây nhóm khoản mục → khoản mục, riêng cho 25 và 26.
  const cayKhoanMuc = new Map<MaChiTieuGoc, Map<string, RoThang>>([
    ['25', new Map()],
    ['26', new Map()],
  ]);

  for (const row of rows) {
    const i = chiSoThang(row.ngay);
    if (i === null) continue;
    const soTien = Number(row.soTien) || 0;
    if (soTien === 0) continue;

    // Cộng vào chỉ tiêu gốc — rồi soi lại rổ để biết chỉ tiêu nào vừa nhận.
    const truoc = { ...tongThang[i] };
    congButToan(tongThang[i], {
      soTien,
      maTaiKhoanNo: row.danhMuc?.taiKhoanNo?.ma,
      maTaiKhoanCo: row.danhMuc?.taiKhoanCo?.ma,
    });

    for (const [ma, bang] of cayNhomSanPham) {
      if (tongThang[i][ma] === truoc[ma]) continue;
      const { key, ten } = khoaNhomSanPham(
        row,
        sanPhamTheoMa,
        nhomSanPhamTheoKhoa,
      );
      layRo(bang, key, ten).thang[i] += soTien;
    }

    for (const [ma, bang] of cayKhoanMuc) {
      if (tongThang[i][ma] === truoc[ma]) continue;
      const km = row.danhMuc?.khoanMuc;
      if (!km?.ma) {
        layRo(bang, KEY_KHONG_PHAN_BO, NHAN_KHONG_CO_KHOAN_MUC).thang[i] += soTien;
        continue;
      }
      const nhom = km.nhom ? nhomKhoanMucTheoKhoa.get(km.nhom) : undefined;
      const roNhom = layRo(
        bang,
        nhom?.ma ?? (km.nhom ? `${km.nhom}` : KEY_CHUA_PHAN_NHOM),
        nhom?.ten ?? NHAN_CHUA_PHAN_NHOM,
      );
      roNhom.thang[i] += soTien;
      if (!roNhom.con) roNhom.con = new Map();
      layRo(roNhom.con, km.ma, km.ten ?? km.ma).thang[i] += soTien;
    }
  }

  return {
    nam,
    doanhThuThuanNam: tongThang.reduce(
      (t, g) => t + tinhChiTieuDanXuat(g).m10,
      0,
    ),
    dong: dungCayDong(tongThang, cayNhomSanPham, cayKhoanMuc),
  };
}

function khoaNhomSanPham(
  row: DongKeHoachKqkd,
  sanPhamTheoMa: Map<string, MucTraCuu>,
  nhomTheoKhoa: Map<string, MucTraCuu>,
): { key: string; ten: string } {
  const maSp = row.danhMuc?.sanPham?.ma;
  if (!maSp) return { key: KEY_KHONG_PHAN_BO, ten: NHAN_KHONG_CO_SAN_PHAM };

  const maNhom = sanPhamTheoMa.get(maSp)?.nhom;
  const nhom = maNhom ? nhomTheoKhoa.get(maNhom) : undefined;
  if (nhom) return { key: nhom.ma, ten: nhom.ten };
  // Sản phẩm bị xoá khỏi danh mục, hoặc chưa gắn nhóm — vẫn phải hiện ra.
  if (maNhom) return { key: maNhom, ten: maNhom };
  return { key: KEY_CHUA_PHAN_NHOM, ten: NHAN_CHUA_PHAN_NHOM };
}

/** Cộng 12 tháng của một chỉ tiêu gốc trên toàn bộ các rổ tháng. */
const thangCua = (
  tongThang: ChiTieuGocKqkd[],
  chon: (g: ChiTieuGocKqkd) => number,
): number[] => tongThang.map(chon);

function dungCayDong(
  tongThang: ChiTieuGocKqkd[],
  cayNhomSanPham: Map<MaChiTieuGoc, Map<string, RoThang>>,
  cayKhoanMuc: Map<MaChiTieuGoc, Map<string, RoThang>>,
): KqkdKeHoachDong[] {
  const conSanPham = (ma: MaChiTieuGoc): KqkdKeHoachDong[] =>
    [...cayNhomSanPham.get(ma)!.entries()].sort(theoKhoa).map(([key, ro]) => ({
      key: `${ma}:${key}`,
      ten: ro.ten,
      cap: 1 as const,
      thang: ro.thang,
    }));

  const conKhoanMuc = (ma: MaChiTieuGoc): KqkdKeHoachDong[] =>
    [...cayKhoanMuc.get(ma)!.entries()].sort(theoKhoa).map(([key, ro]) => ({
      key: `${ma}:${key}`,
      ten: ro.ten,
      cap: 1 as const,
      thang: ro.thang,
      ...(ro.con
        ? {
            con: [...ro.con.entries()].sort(theoKhoa).map(([kmKey, km]) => ({
              key: `${ma}:${key}:${kmKey}`,
              ten: km.ten,
              cap: 2 as const,
              thang: km.thang,
            })),
          }
        : {}),
    }));

  /** Lợi nhuận gộp của một nhóm = doanh thu − giảm trừ − giá vốn của chính nhóm đó. */
  const conLoiNhuanGop = (): KqkdKeHoachDong[] => {
    const khoa = new Map<string, string>();
    for (const ma of ['01', '02', '11'] as const) {
      for (const [key, ro] of cayNhomSanPham.get(ma)!) {
        if (!khoa.has(key)) khoa.set(key, ro.ten);
      }
    }
    return [...khoa.entries()].sort(theoKhoa).map(([key, ten]) => {
      const lay = (ma: MaChiTieuGoc, i: number) =>
        cayNhomSanPham.get(ma)!.get(key)?.thang[i] ?? 0;
      return {
        key: `20:${key}`,
        ten,
        cap: 1 as const,
        thang: Array.from(
          { length: SO_THANG },
          (_, i) => lay('01', i) - lay('02', i) - lay('11', i),
        ),
      };
    });
  };

  const goc = (ma: MaChiTieuGoc) => thangCua(tongThang, (g) => g[ma]);
  const danXuat = (chon: (d: ReturnType<typeof tinhChiTieuDanXuat>) => number) =>
    thangCua(tongThang, (g) => chon(tinhChiTieuDanXuat(g)));

  return [
    { key: '01', ma: '01', soLaMa: 'I', ten: 'DOANH THU', cap: 0, thang: goc('01'), con: conSanPham('01') },
    { key: '02', ma: '02', soLaMa: 'II', ten: 'CÁC KHOẢN GIẢM TRỪ DOANH THU', cap: 0, thang: goc('02'), con: conSanPham('02') },
    { key: '11', ma: '11', soLaMa: 'III', ten: 'GIÁ VỐN BÁN HÀNG', cap: 0, thang: goc('11'), con: conSanPham('11') },
    { key: '20', ma: '20', soLaMa: 'IV', ten: 'LỢI NHUẬN GỘP', cap: 0, thang: danXuat((d) => d.m20), con: conLoiNhuanGop() },
    { key: '21', ma: '21', soLaMa: 'V', ten: 'DOANH THU TÀI CHÍNH', cap: 0, thang: goc('21') },
    { key: '22', ma: '22', soLaMa: 'VI', ten: 'CHI PHÍ TÀI CHÍNH', cap: 0, thang: goc('22') },
    { key: '25', ma: '25', soLaMa: 'VII', ten: 'CHI PHÍ BÁN HÀNG', cap: 0, thang: goc('25'), con: conKhoanMuc('25') },
    { key: '26', ma: '26', soLaMa: 'VIII', ten: 'CHI PHÍ QUẢN LÝ DOANH NGHIỆP', cap: 0, thang: goc('26'), con: conKhoanMuc('26') },
    { key: 'IX', soLaMa: 'IX', ten: 'TOTAL CHI PHÍ', cap: 0, thang: danXuat((d) => d.tongChiPhi) },
    { key: '30', ma: '30', soLaMa: 'X', ten: 'LỢI NHUẬN THUẦN TỪ HĐSXKD', cap: 0, thang: danXuat((d) => d.m30) },
    { key: '31', ma: '31', ten: 'THU NHẬP KHÁC', cap: 0, thang: goc('31') },
    { key: '32', ma: '32', ten: 'CHI PHÍ KHÁC', cap: 0, thang: goc('32') },
    { key: '40', ma: '40', ten: 'LỢI NHUẬN KHÁC', cap: 0, thang: danXuat((d) => d.m40) },
    { key: '50', ma: '50', soLaMa: 'XI', ten: 'LỢI NHUẬN TRƯỚC THUẾ', cap: 0, thang: danXuat((d) => d.m50) },
    { key: 'XII', soLaMa: 'XII', ten: 'CHI PHÍ THUẾ THU NHẬP DOANH NGHIỆP', cap: 0, thang: thangCua(tongThang, (g) => g['51'] + g['52']) },
    { key: '60', ma: '60', soLaMa: 'XIII', ten: 'LỢI NHUẬN SAU THUẾ', cap: 0, thang: danXuat((d) => d.m60) },
  ];
}
