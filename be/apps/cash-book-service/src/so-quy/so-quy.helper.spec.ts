import type { NhatKyChungEntry } from '@app/dto';
import {
  buildSoQuy,
  cashLegsOf,
  isCashAccount,
  sumOpeningCash,
} from './so-quy.helper';

// `loai` không ảnh hưởng phân loại thu/chi nữa (đã chuyển sang xét TK 111/112),
// giữ lại trong fixture để chứng minh đúng điều đó.
const v = (
  soPhieu: string,
  ngay: string,
  soTien: number,
  no: string,
  co: string,
  loai = 'KHAC',
): NhatKyChungEntry =>
  ({
    soPhieu,
    loai,
    ngay: new Date(ngay),
    soTien,
    noiDung: soPhieu,
    danhMuc: {
      taiKhoanNo: { ma: no, ten: no },
      taiKhoanCo: { ma: co, ten: co },
    },
  }) as unknown as NhatKyChungEntry;

describe('isCashAccount', () => {
  it('nhận TK tiền và TK con của nó', () => {
    expect(isCashAccount('111')).toBe(true);
    expect(isCashAccount('1111')).toBe(true);
    expect(isCashAccount('112')).toBe(true);
    expect(isCashAccount('1121')).toBe(true);
  });

  it('loại TK không phải tiền', () => {
    expect(isCashAccount('113')).toBe(false);
    expect(isCashAccount('131')).toBe(false);
    expect(isCashAccount('1531')).toBe(false);
    expect(isCashAccount('')).toBe(false);
    expect(isCashAccount(undefined)).toBe(false);
  });
});

describe('cashLegsOf', () => {
  it('Nợ TK tiền → thu', () => {
    expect(cashLegsOf(v('PT01', '2026-01-05', 100, '1111', '131'))).toEqual([
      { thu: 100, chi: 0 },
    ]);
  });

  it('Có TK tiền → chi', () => {
    expect(cashLegsOf(v('PC01', '2026-01-05', 100, '331', '1111'))).toEqual([
      { thu: 0, chi: 100 },
    ]);
  });

  it('bút toán không đụng tiền → không có vế nào', () => {
    expect(cashLegsOf(v('NKC01', '2026-01-05', 100, '153', '331'))).toEqual([]);
  });

  it('chuyển quỹ Nợ 112 / Có 111 → 2 vế, tổng quỹ không đổi', () => {
    const legs = cashLegsOf(v('NKC02', '2026-01-05', 100, '1121', '1111'));
    expect(legs).toEqual([
      { thu: 100, chi: 0 },
      { thu: 0, chi: 100 },
    ]);
    expect(legs.reduce((s, l) => s + l.thu - l.chi, 0)).toBe(0);
  });

  it('đọc được trường legacy taiKhoanNo/taiKhoanCo', () => {
    const legacy = {
      soPhieu: 'PT02',
      loai: 'PHIEU_THU',
      ngay: new Date('2026-01-05'),
      soTien: 50,
      noiDung: '',
      taiKhoanNo: '1111',
      taiKhoanCo: '131',
    } as unknown as NhatKyChungEntry;
    expect(cashLegsOf(legacy)).toEqual([{ thu: 50, chi: 0 }]);
  });
});

describe('sumOpeningCash', () => {
  it('chỉ cộng TK tiền, lấy duNo − duCo', () => {
    const total = sumOpeningCash([
      { maTaiKhoan: '111', duNo: 867, duCo: 0 },
      { maTaiKhoan: '1121', duNo: 300, duCo: 0 },
      { maTaiKhoan: '1121', duNo: 0, duCo: 50 },
      { maTaiKhoan: '131', duNo: 999, duCo: 0 },
    ]);
    expect(total).toBe(1117);
  });

  it('không có số dư đầu kỳ → 0', () => {
    expect(sumOpeningCash([])).toBe(0);
  });
});

describe('buildSoQuy', () => {
  const opening = [{ maTaiKhoan: '111', duNo: 1000, duCo: 0 }];

  it('tồn đầu kỳ lấy từ số dư nhập tay, không hard-code 0', () => {
    const r = buildSoQuy([], opening);
    expect(r.tonDauKy).toBe(1000);
    expect(r.tonCuoiKy).toBe(1000);
  });

  it('bỏ qua bút toán không đụng TK tiền', () => {
    const r = buildSoQuy(
      [
        v('PT01', '2026-01-10', 200, '1111', '131'),
        v('NKC01', '2026-01-11', 500, '153', '331'),
      ],
      opening,
    );
    expect(r.entries).toHaveLength(1);
    expect(r.tongThu).toBe(200);
    expect(r.tongChi).toBe(0);
    expect(r.tonCuoiKy).toBe(1200);
  });

  it('số dư luỹ kế cộng dồn từ tồn đầu kỳ theo thứ tự ngày', () => {
    const r = buildSoQuy(
      [
        v('PC01', '2026-02-01', 300, '331', '1111'),
        v('PT01', '2026-01-10', 200, '1111', '131'),
      ],
      opening,
    );
    expect(r.entries.map((e) => [e.soPhieu, e.soDu])).toEqual([
      ['PT01', 1200],
      ['PC01', 900],
    ]);
    expect(r.tonCuoiKy).toBe(900);
  });

  it('phát sinh trước kỳ được dồn vào tồn đầu kỳ', () => {
    const r = buildSoQuy(
      [
        v('PT01', '2026-01-10', 200, '1111', '131'),
        v('PC01', '2026-03-05', 50, '331', '1111'),
      ],
      opening,
      new Date('2026-03-01'),
      new Date('2026-03-31T23:59:59.999'),
    );
    expect(r.tonDauKy).toBe(1200);
    expect(r.entries).toHaveLength(1);
    expect(r.tonCuoiKy).toBe(1150);
  });

  it('bỏ qua chứng từ sau endDate', () => {
    const r = buildSoQuy(
      [v('PC01', '2026-04-01', 50, '331', '1111')],
      opening,
      new Date('2026-03-01'),
      new Date('2026-03-31T23:59:59.999'),
    );
    expect(r.entries).toHaveLength(0);
    expect(r.tonCuoiKy).toBe(1000);
  });

  it('đếm số vế thu/chi', () => {
    const r = buildSoQuy(
      [
        v('PT01', '2026-01-10', 200, '1111', '131'),
        v('NKC02', '2026-01-11', 100, '1121', '1111'),
      ],
      opening,
    );
    expect(r.soPhieuThu).toBe(2);
    expect(r.soPhieuChi).toBe(1);
    expect(r.tonCuoiKy).toBe(1200);
  });

  it('tồn cuối kỳ = tồn đầu kỳ + tổng thu − tổng chi', () => {
    const r = buildSoQuy(
      [
        v('PT01', '2026-01-10', 200, '1111', '131'),
        v('PC01', '2026-02-01', 300, '331', '1121'),
      ],
      opening,
    );
    expect(r.tonCuoiKy).toBe(r.tonDauKy + r.tongThu - r.tongChi);
  });
});
