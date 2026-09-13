import { describe, expect, it } from 'vitest';
import {
  chenhLech,
  COT_KY,
  ghep3Lop,
  giaTri,
  phanTramDS,
  tyLeChenhLech,
  tyTrong,
} from './pnl3LopRows';
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
    expect(giaTri(kq[0], 'keHoach', ...T1)).toBe(100);
    expect(giaTri(kq[0], 'duBao', ...T1)).toBe(90);
    expect(giaTri(kq[0], 'thucHien', ...T1)).toBe(80);
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
    expect(giaTri(kq[1], 'keHoach', ...T1)).toBe(0);
    expect(giaTri(kq[1], 'thucHien', ...T1)).toBe(5);
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
    expect(giaTri(con[0], 'keHoach', ...T1)).toBe(60);
    expect(giaTri(con[1], 'thucHien', ...T1)).toBe(30);
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

describe('giaTri / chenhLech / tyLeChenhLech — từng kỳ', () => {
  const baoCao = {
    nam: 2026,
    keHoach: bc([d('01', 'DOANH THU', m(100, 100, 100))]),
    duBao: bc([d('01', 'DOANH THU', m(90, 90, 90))]),
    thucHien: bc([d('01', 'DOANH THU', m(70, 80, 0))]),
  };
  const hang = ghep3Lop(baoCao)[0];

  it('mỗi kỳ cộng đúng khoảng tháng của kỳ đó', () => {
    expect(giaTri(hang, 'thucHien', ...T1)).toBe(70);
    expect(giaTri(hang, 'thucHien', ...Q1)).toBe(150);
    expect(giaTri(hang, 'thucHien', ...NAM)).toBe(150);
    expect(giaTri(hang, 'keHoach', ...Q1)).toBe(300);
  });

  it('THỰC HIỆN vs KẾ HOẠCH: hiệu số TRONG CHÍNH KỲ ĐÓ', () => {
    expect(chenhLech(hang, 'keHoach', ...T1)).toBe(-30);
    expect(chenhLech(hang, 'keHoach', ...Q1)).toBe(-150);
  });

  it('THỰC HIỆN vs DỰ BÁO: so với dự báo chứ không phải kế hoạch', () => {
    expect(chenhLech(hang, 'duBao', ...T1)).toBe(-20);
    expect(chenhLech(hang, 'duBao', ...Q1)).toBe(-120);
  });

  it('Tỷ lệ là chênh lệch chia cho MỐC, không phải Thực hiện chia Kế hoạch', () => {
    // T1: (70 − 100) / 100 = −30%, KHÔNG phải 70%.
    expect(tyLeChenhLech(hang, 'keHoach', ...T1)).toBeCloseTo(-0.3);
    expect(tyLeChenhLech(hang, 'duBao', ...T1)).toBeCloseTo(-20 / 90);
  });

  it('mốc bằng 0 thì không có tỷ lệ', () => {
    const kq = ghep3Lop({
      nam: 2026,
      keHoach: bc([d('01', 'DOANH THU', m(0))]),
      duBao: bc([]),
      thucHien: bc([d('01', 'DOANH THU', m(50))]),
    });
    expect(tyLeChenhLech(kq[0], 'keHoach', ...T1)).toBeNull();
    expect(chenhLech(kq[0], 'keHoach', ...T1)).toBe(50);
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
    const t1 = giaTri(hang, 'keHoach', ...T1); // 40 / (1 − 600/1000) = 100
    const t2 = giaTri(hang, 'keHoach', 1, 2); // 40 / (1 − 900/1000) = 400
    const q1 = giaTri(hang, 'keHoach', ...Q1); // 80 / (1 − 1500/2000) = 320
    expect(t1).toBeCloseTo(100, 6);
    expect(t2).toBeCloseTo(400, 6);
    expect(q1).toBeCloseTo(320, 6);
    expect(q1).not.toBe(t1 + t2);
  });

  it('so sánh cũng lấy trên hòa vốn của từng lớp', () => {
    // T1: kế hoạch 100, thực hiện 80 / (1 − 600/1000) = 200.
    expect(giaTri(hang, 'thucHien', ...T1)).toBeCloseTo(200, 6);
    expect(chenhLech(hang, 'keHoach', ...T1)).toBeCloseTo(100, 6);
    expect(tyLeChenhLech(hang, 'keHoach', ...T1)).toBeCloseTo(1, 6);
  });
});

describe('COT_KY — thứ tự cột', () => {
  it('đi từ rộng tới hẹp như bảng P&L: năm → 6 tháng → quý → tháng', () => {
    expect(COT_KY.map((c) => c.title)).toEqual([
      'Cả năm', '6 tháng đầu', '6 tháng cuối',
      'QUÝ I', 'QUÝ II', 'QUÝ III', 'QUÝ IV',
      'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
      'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
    ]);
  });

  it('mỗi cột mang đúng khoảng tháng của kỳ đó', () => {
    const theo = (title: string) => COT_KY.find((c) => c.title === title)!;
    expect(theo('T1')).toMatchObject({ tu: 0, den: 1 });
    expect(theo('QUÝ I')).toMatchObject({ tu: 0, den: 3 });
    expect(theo('QUÝ IV')).toMatchObject({ tu: 9, den: 12 });
    expect(theo('6 tháng đầu')).toMatchObject({ tu: 0, den: 6 });
    expect(theo('6 tháng cuối')).toMatchObject({ tu: 6, den: 12 });
    expect(theo('Cả năm')).toMatchObject({ tu: 0, den: 12 });
  });

  it('khoá cột duy nhất — antd đòi vậy', () => {
    expect(new Set(COT_KY.map((c) => c.key)).size).toBe(COT_KY.length);
  });
});

describe('phanTramDS — tỷ lệ trên doanh thu thuần CỦA CHÍNH KỲ ĐÓ', () => {
  const baoCao = {
    nam: 2026,
    keHoach: bc([d('25', 'GIÁ VỐN', m(100, 300))], {
      doanhThuThuanThang: m(1000, 1000),
    }),
    duBao: bc([]),
    thucHien: bc([d('25', 'GIÁ VỐN', m(500, 500))], {
      doanhThuThuanThang: m(1000, 0),
    }),
  };
  const hang = ghep3Lop(baoCao)[0];

  it('lấy doanh thu thuần của đúng lớp và đúng kỳ', () => {
    expect(phanTramDS(baoCao, hang, 'keHoach', 0, 1)).toBeCloseTo(0.1);
    expect(phanTramDS(baoCao, hang, 'keHoach', 0, 2)).toBeCloseTo(0.2);
    expect(phanTramDS(baoCao, hang, 'thucHien', 0, 1)).toBeCloseTo(0.5);
  });

  it('kỳ chưa có doanh thu thì không chia được', () => {
    expect(phanTramDS(baoCao, hang, 'thucHien', 1, 2)).toBeNull();
  });
});

describe('tyTrong — tỷ lệ trên dòng cha', () => {
  const baoCao = {
    nam: 2026,
    keHoach: bc([
      d('25', 'GIÁ VỐN', m(1000), [
        d('25:CD', 'Chi phí cố định', m(250)),
        d('25:BD', 'Chi phí biến đổi', m(750)),
      ]),
    ]),
    duBao: bc([]),
    thucHien: bc([]),
  };
  const [cha] = ghep3Lop(baoCao);

  it('dòng con lấy tỷ lệ trên dòng cha cùng kỳ', () => {
    const [cd, bd] = cha.children!;
    expect(tyTrong(cd, 'keHoach', 0, 1)).toBeCloseTo(0.25);
    expect(tyTrong(bd, 'keHoach', 0, 1)).toBeCloseTo(0.75);
  });

  it('dòng mục La Mã là gốc của nhóm bên dưới nên bằng 100%', () => {
    expect(tyTrong(cha, 'keHoach', 0, 1)).toBe(1);
  });

  it('dòng cha bằng 0 thì không chia được', () => {
    const [c] = ghep3Lop({
      nam: 2026,
      keHoach: bc([d('25', 'GIÁ VỐN', m(0), [d('25:BD', 'Biến đổi', m(0))])]),
      duBao: bc([]),
      thucHien: bc([]),
    });
    expect(tyTrong(c.children![0], 'keHoach', 0, 1)).toBeNull();
  });

  it('dòng hòa vốn không có tỷ trọng — nó không thuộc nhóm nào', () => {
    const hv = ghep3Lop(baoCao).at(-1)!;
    expect(tyTrong(hv, 'keHoach', 0, 12)).toBeNull();
  });
});
