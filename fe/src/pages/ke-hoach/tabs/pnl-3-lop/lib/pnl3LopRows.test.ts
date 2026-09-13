import { describe, expect, it } from 'vitest';
import { ghep3Lop, giaTriO, LOP_OPTIONS, mauSoPhanTram } from './pnl3LopRows';
import type { Kqkd3LopReport, KqkdKeHoachDong } from '@/services/kqkd3LopService';

const m = (...v: number[]) => {
  const a = Array(12).fill(0);
  v.forEach((x, i) => (a[i] = x));
  return a;
};

const bc = (dong: KqkdKeHoachDong[], them: Partial<Kqkd3LopReport['keHoach']> = {}) => ({
  nam: 2026,
  dong,
  doanhThuThuanNam: 0,
  doanhThuThuanThang: Array(12).fill(0),
  dinhPhiThang: Array(12).fill(0),
  bienPhiThang: Array(12).fill(0),
  ...them,
});

const d = (
  key: string,
  ten: string,
  thang: number[],
  con?: KqkdKeHoachDong[],
): KqkdKeHoachDong => ({ key, ten, cap: 0, thang, ...(con ? { con } : {}) });

const T1 = [0, 1] as const;
const NAM = [0, 12] as const;
const Q1 = [0, 3] as const;

describe('LOP_OPTIONS', () => {
  it('đúng năm lớp xem: ba lớp số tiền + chênh lệch + % đạt', () => {
    expect(LOP_OPTIONS.map((o) => o.value)).toEqual([
      'keHoach',
      'duBao',
      'thucHien',
      'chenhLech',
      'phanTramDat',
    ]);
  });
});

describe('ghep3Lop — ghép cây', () => {
  it('ghép ba lớp theo khoá, giữ nguyên cấu trúc cây', () => {
    const kq = ghep3Lop({
      nam: 2026,
      keHoach: bc([d('01', 'DOANH THU', m(100))]),
      duBao: bc([d('01', 'DOANH THU', m(90))]),
      thucHien: bc([d('01', 'DOANH THU', m(80))]),
    });
    // Dòng cuối là hòa vốn — chỉ tiêu thật là dòng đầu.
    expect(kq[0].key).toBe('01');
    expect(giaTriO(kq[0], 'keHoach', ...T1)).toBe(100);
    expect(giaTriO(kq[0], 'duBao', ...T1)).toBe(90);
    expect(giaTriO(kq[0], 'thucHien', ...T1)).toBe(80);
  });

  it('dòng chỉ có ở Thực hiện vẫn hiện, kế hoạch bằng 0', () => {
    // Nhóm sản phẩm phát sinh thật nhưng chưa lập kế hoạch — không được biến mất.
    const kq = ghep3Lop({
      nam: 2026,
      keHoach: bc([d('01', 'DOANH THU', m(100))]),
      duBao: bc([]),
      thucHien: bc([d('01', 'DOANH THU', m(80)), d('99', 'PHÁT SINH MỚI', m(5))]),
    });
    expect(kq.map((r) => r.key)).toEqual(['01', '99', 'HOA_VON']);
    expect(giaTriO(kq[1], 'keHoach', ...T1)).toBe(0);
    expect(giaTriO(kq[1], 'thucHien', ...T1)).toBe(5);
  });

  it('ghép cả cấp con', () => {
    const kq = ghep3Lop({
      nam: 2026,
      keHoach: bc([d('01', 'DOANH THU', m(100), [d('01:N1', 'Nhóm 1', m(60))])]),
      duBao: bc([]),
      thucHien: bc([
        d('01', 'DOANH THU', m(80), [
          d('01:N1', 'Nhóm 1', m(50)),
          d('01:N2', 'Nhóm 2', m(30)),
        ]),
      ]),
    });
    const con = kq[0].children!;
    expect(con.map((c) => c.key)).toEqual(['01:N1', '01:N2']);
    expect(giaTriO(con[0], 'keHoach', ...T1)).toBe(60);
    expect(giaTriO(con[1], 'thucHien', ...T1)).toBe(30);
  });

  it('không gắn children khi không có dòng con — antd khỏi vẽ nút mở thừa', () => {
    const kq = ghep3Lop({
      nam: 2026,
      keHoach: bc([d('01', 'DOANH THU', m(100))]),
      duBao: bc([]),
      thucHien: bc([]),
    });
    expect(kq[0].children).toBeUndefined();
  });
});

describe('giaTriO — từng lớp, từng kỳ', () => {
  const baoCao = {
    nam: 2026,
    keHoach: bc([d('01', 'DOANH THU', m(100, 100, 100))]),
    duBao: bc([d('01', 'DOANH THU', m(90, 90, 90))]),
    thucHien: bc([d('01', 'DOANH THU', m(70, 80, 0))]),
  };
  const hang = ghep3Lop(baoCao)[0];

  it('mỗi kỳ cộng đúng khoảng tháng của kỳ đó', () => {
    expect(giaTriO(hang, 'thucHien', ...T1)).toBe(70);
    expect(giaTriO(hang, 'thucHien', ...Q1)).toBe(150);
    expect(giaTriO(hang, 'thucHien', ...NAM)).toBe(150);
    expect(giaTriO(hang, 'keHoach', ...Q1)).toBe(300);
  });

  it('chênh lệch là Thực hiện − Kế hoạch CỦA CHÍNH KỲ ĐÓ', () => {
    expect(giaTriO(hang, 'chenhLech', ...T1)).toBe(-30);
    expect(giaTriO(hang, 'chenhLech', ...Q1)).toBe(-150);
  });

  it('% đạt tính riêng từng kỳ, không phải chia tổng cả năm', () => {
    expect(giaTriO(hang, 'phanTramDat', ...T1)).toBeCloseTo(0.7);
    expect(giaTriO(hang, 'phanTramDat', ...Q1)).toBeCloseTo(0.5);
  });

  it('kế hoạch kỳ đó bằng 0 thì % đạt không xác định', () => {
    const kq = ghep3Lop({
      nam: 2026,
      keHoach: bc([d('01', 'DOANH THU', m(0))]),
      duBao: bc([]),
      thucHien: bc([d('01', 'DOANH THU', m(50))]),
    });
    expect(giaTriO(kq[0], 'phanTramDat', ...T1)).toBeNull();
    expect(giaTriO(kq[0], 'chenhLech', ...T1)).toBe(50);
  });
});

describe('dòng DOANH THU HÒA VỐN', () => {
  const baoCao = {
    nam: 2026,
    keHoach: bc([], {
      doanhThuThuanThang: m(1000, 1000),
      dinhPhiThang: m(40, 40),
      bienPhiThang: m(600, 900),
    }),
    duBao: bc([]),
    thucHien: bc([], {
      doanhThuThuanThang: m(1000, 1000),
      dinhPhiThang: m(80, 0),
      bienPhiThang: m(600, 600),
    }),
  };
  const hang = ghep3Lop(baoCao).at(-1)!;

  it('là dòng cuối bảng', () => {
    expect(hang.key).toBe('HOA_VON');
    expect(hang.nhan).toBe('DOANH THU HÒA VỐN');
  });

  it('KHÔNG cộng dồn: quý tính lại từ ba dãy của chính quý', () => {
    const t1 = giaTriO(hang, 'keHoach', ...T1)!; // 40 / (1 − 600/1000) = 100
    const t2 = giaTriO(hang, 'keHoach', 1, 2)!; // 40 / (1 − 900/1000) = 400
    const q1 = giaTriO(hang, 'keHoach', ...Q1)!; // 80 / (1 − 1500/2000) = 320
    expect(t1).toBeCloseTo(100, 6);
    expect(t2).toBeCloseTo(400, 6);
    expect(q1).toBeCloseTo(320, 6);
    expect(q1).not.toBe(t1 + t2);
  });

  it('chênh lệch và % đạt so hòa vốn Thực hiện với hòa vốn Kế hoạch', () => {
    // T1: kế hoạch 100, thực hiện 80 / (1 − 600/1000) = 200.
    expect(giaTriO(hang, 'thucHien', ...T1)).toBeCloseTo(200, 6);
    expect(giaTriO(hang, 'chenhLech', ...T1)).toBeCloseTo(100, 6);
    expect(giaTriO(hang, 'phanTramDat', ...T1)).toBeCloseTo(2, 6);
  });
});

describe('mauSoPhanTram', () => {
  const baoCao = {
    nam: 2026,
    keHoach: bc([], { doanhThuThuanNam: 1000 }),
    duBao: bc([], { doanhThuThuanNam: 900 }),
    thucHien: bc([], { doanhThuThuanNam: 800 }),
  };

  it('lấy doanh thu thuần cả năm CỦA ĐÚNG LỚP đang xem', () => {
    expect(mauSoPhanTram(baoCao, 'keHoach')).toBe(1000);
    expect(mauSoPhanTram(baoCao, 'duBao')).toBe(900);
    expect(mauSoPhanTram(baoCao, 'thucHien')).toBe(800);
  });

  it('chênh lệch và % đạt không có mẫu số — cột % không áp dụng', () => {
    expect(mauSoPhanTram(baoCao, 'chenhLech')).toBe(0);
    expect(mauSoPhanTram(baoCao, 'phanTramDat')).toBe(0);
  });
});
