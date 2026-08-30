import { describe, expect, it } from 'vitest';
import { ghep3Lop, giaTriKy, KY_OPTIONS } from './pnl3LopRows';
import type { KqkdKeHoachDong } from '@/services/kqkdKeHoachService';

const m = (...v: number[]) => {
  const a = Array(12).fill(0);
  v.forEach((x, i) => (a[i] = x));
  return a;
};

const bc = (dong: KqkdKeHoachDong[]) => ({
  nam: 2026,
  dong,
  doanhThuThuanNam: 0,
  doanhThuThuanThang: Array(12).fill(0),
  dinhPhiThang: Array(12).fill(0),
  bienPhiThang: Array(12).fill(0),
});

const d = (
  key: string,
  ten: string,
  thang: number[],
  con?: KqkdKeHoachDong[],
): KqkdKeHoachDong => ({ key, ten, cap: 0, thang, ...(con ? { con } : {}) });

describe('giaTriKy', () => {
  const thang = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  it('cả năm là tổng 12 tháng', () => {
    expect(giaTriKy(thang, 'NAM')).toBe(78);
  });

  it('quý là tổng ba tháng của quý đó', () => {
    expect(giaTriKy(thang, 'Q1')).toBe(6);
    expect(giaTriKy(thang, 'Q4')).toBe(33);
  });

  it('tháng lấy đúng một tháng', () => {
    expect(giaTriKy(thang, 'T7')).toBe(7);
  });

  it('có đủ 17 lựa chọn kỳ: cả năm, 4 quý, 12 tháng', () => {
    expect(KY_OPTIONS).toHaveLength(17);
  });
});

describe('ghep3Lop', () => {
  it('ghép ba lớp theo khoá, giữ nguyên cấu trúc cây', () => {
    const kq = ghep3Lop(
      {
        nam: 2026,
        keHoach: bc([d('01', 'DOANH THU', m(100))]),
        duBao: bc([d('01', 'DOANH THU', m(90))]),
        thucHien: bc([d('01', 'DOANH THU', m(80))]),
      },
      'T1',
    );
    expect(kq).toHaveLength(1);
    expect(kq[0]).toMatchObject({
      key: '01',
      keHoach: 100,
      duBao: 90,
      thucHien: 80,
    });
  });

  it('chênh lệch là Thực hiện − Kế hoạch', () => {
    const kq = ghep3Lop(
      {
        nam: 2026,
        keHoach: bc([d('01', 'DOANH THU', m(100))]),
        duBao: bc([]),
        thucHien: bc([d('01', 'DOANH THU', m(70))]),
      },
      'T1',
    );
    expect(kq[0].chenhLech).toBe(-30);
    expect(kq[0].phanTramDat).toBeCloseTo(0.7);
  });

  it('kế hoạch bằng 0 thì % đạt không xác định', () => {
    const kq = ghep3Lop(
      {
        nam: 2026,
        keHoach: bc([d('01', 'DOANH THU', m(0))]),
        duBao: bc([]),
        thucHien: bc([d('01', 'DOANH THU', m(50))]),
      },
      'T1',
    );
    expect(kq[0].phanTramDat).toBeNull();
  });

  it('dòng chỉ có ở Thực hiện vẫn hiện, kế hoạch bằng 0', () => {
    // Nhóm sản phẩm phát sinh thật nhưng chưa lập kế hoạch — không được biến mất.
    const kq = ghep3Lop(
      {
        nam: 2026,
        keHoach: bc([d('01', 'DOANH THU', m(100))]),
        duBao: bc([]),
        thucHien: bc([
          d('01', 'DOANH THU', m(80)),
          d('99', 'PHÁT SINH MỚI', m(5)),
        ]),
      },
      'T1',
    );
    expect(kq.map((r) => r.key)).toEqual(['01', '99']);
    expect(kq[1]).toMatchObject({ keHoach: 0, thucHien: 5 });
  });

  it('ghép cả cấp con', () => {
    const kq = ghep3Lop(
      {
        nam: 2026,
        keHoach: bc([d('01', 'DOANH THU', m(100), [d('01:N1', 'Nhóm 1', m(60))])]),
        duBao: bc([]),
        thucHien: bc([
          d('01', 'DOANH THU', m(80), [
            d('01:N1', 'Nhóm 1', m(50)),
            d('01:N2', 'Nhóm 2', m(30)),
          ]),
        ]),
      },
      'T1',
    );
    const con = kq[0].children!;
    expect(con.map((c) => c.key)).toEqual(['01:N1', '01:N2']);
    expect(con[0]).toMatchObject({ keHoach: 60, thucHien: 50 });
    expect(con[1]).toMatchObject({ keHoach: 0, thucHien: 30 });
  });

  it('không gắn children khi không có dòng con — antd khỏi vẽ nút mở thừa', () => {
    const kq = ghep3Lop(
      {
        nam: 2026,
        keHoach: bc([d('01', 'DOANH THU', m(100))]),
        duBao: bc([]),
        thucHien: bc([]),
      },
      'NAM',
    );
    expect(kq[0].children).toBeUndefined();
  });
});
