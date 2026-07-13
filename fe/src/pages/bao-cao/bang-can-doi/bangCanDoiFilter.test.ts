import { describe, it, expect } from 'vitest';
import type { BalanceSheetData, BalanceSheetItem } from '@/services/balanceSheetService';
import { filterBangCanDoi } from './bangCanDoiFilter';

const section = (ma: string, tenChiTieu: string): BalanceSheetItem => ({
  ma,
  tenChiTieu,
  dauNam: 999, // số gốc từ BE — cố tình lệch để thấy khi nào tính lại
  cuoiKy: 999,
  level: 0,
  isSection: true,
});

const item = (ma: string, ten: string, cuoiKy: number): BalanceSheetItem => ({
  ma,
  tenChiTieu: `${ma} - ${ten}`,
  dauNam: 0,
  cuoiKy,
  level: 1,
});

const data: BalanceSheetData = {
  taiSan: [
    section('A', 'A - TÀI SẢN NGẮN HẠN'),
    item('111', 'Tiền mặt', 100),
    item('131', 'Phải thu khách hàng', 20),
    section('B', 'B - TÀI SẢN DÀI HẠN'),
    item('211', 'Tài sản cố định', 500),
  ],
  nguonVon: [
    section('C', 'C - NỢ PHẢI TRẢ'),
    item('331', 'Phải trả người bán', 120),
    section('D', 'D - VỐN CHỦ SỞ HỮU'),
    item('411', 'Vốn góp chủ sở hữu', 500),
  ],
  tongTaiSan: { dauNam: 0, cuoiKy: 620 },
  tongNguonVon: { dauNam: 0, cuoiKy: 620 },
  canDoi: true,
};

describe('filterBangCanDoi', () => {
  it('không lọc → trả nguyên dữ liệu gốc của backend (không tính lại)', () => {
    const out = filterBangCanDoi(data, { tenChiTieu: { op: 'contains', value: '' } });
    expect(out).toBe(data);
  });

  it('lọc còn 1 chỉ tiêu: dòng nhóm và TỔNG CỘNG bằng đúng chỉ tiêu đó', () => {
    const out = filterBangCanDoi(data, { tenChiTieu: { op: 'contains', value: 'tien mat' } })!;

    expect(out.taiSan.map((i) => i.ma)).toEqual(['A', '111']);
    expect(out.taiSan[0].cuoiKy).toBe(100); // dòng nhóm A cộng lại theo con còn hiện
    expect(out.tongTaiSan.cuoiKy).toBe(100);

    // Không chỉ tiêu nguồn vốn nào khớp → không còn dòng nào, tổng về 0
    expect(out.nguonVon).toEqual([]);
    expect(out.tongNguonVon.cuoiKy).toBe(0);
    expect(out.canDoi).toBe(false);
  });

  it('bỏ hẳn dòng nhóm không còn chỉ tiêu con nào khớp', () => {
    const out = filterBangCanDoi(data, { ma: { op: 'startsWith', value: '1' } })!;
    expect(out.taiSan.map((i) => i.ma)).toEqual(['A', '111', '131']); // nhóm B biến mất
    expect(out.taiSan[0].cuoiKy).toBe(120);
    expect(out.tongTaiSan.cuoiKy).toBe(120);
  });

  it('giữ nhiều nhóm, TỔNG CỘNG cộng dồn các chỉ tiêu còn lại', () => {
    const out = filterBangCanDoi(data, { tenChiTieu: { op: 'notContains', value: 'khách hàng' } })!;
    expect(out.taiSan.map((i) => i.ma)).toEqual(['A', '111', 'B', '211']);
    expect(out.taiSan[0].cuoiKy).toBe(100);
    expect(out.taiSan[2].cuoiKy).toBe(500);
    expect(out.tongTaiSan.cuoiKy).toBe(600); // 100 + 500, không cộng đúp dòng nhóm
    expect(out.tongNguonVon.cuoiKy).toBe(620);
  });

  it('lọc không khớp gì → rỗng cả 2 nửa, không còn dòng nhóm', () => {
    const out = filterBangCanDoi(data, { tenChiTieu: { op: 'contains', value: 'không tồn tại' } })!;
    expect(out.taiSan).toEqual([]);
    expect(out.nguonVon).toEqual([]);
    expect(out.tongTaiSan).toEqual({ dauNam: 0, cuoiKy: 0 });
  });

  it('dữ liệu null → null', () => {
    expect(filterBangCanDoi(null, { ma: { op: 'contains', value: 'a' } })).toBeNull();
  });
});
