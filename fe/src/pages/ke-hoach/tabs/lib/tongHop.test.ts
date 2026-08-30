import { describe, expect, it } from 'vitest';
import {
  dungCayBang,
  tongLech,
  type HangBang,
  type MoTaHang,
} from './tongHop';

interface DongTho {
  key: string;
  nhomKey: string;
  thang: number[];
  namKhaiBao: number;
  ghiChu?: string;
}

const doc = (d: DongTho): MoTaHang => ({
  key: d.key,
  nhomKey: d.nhomKey,
  nhomNhan: `Nhóm ${d.nhomKey}`,
  nhan: d.key,
  thang: d.thang,
  namKhaiBao: d.namKhaiBao,
  ghiChu: d.ghiChu,
});

/** Mảng 12 tháng, mỗi tháng `v`. Tổng năm = v × 12. */
const deu = (v: number): number[] => Array(12).fill(v);

const chiTiet = (rows: HangBang<DongTho>[]) =>
  rows.filter((r) => r.loai === 'chiTiet');

describe('dungCayBang — chênh lệch', () => {
  it('chênh lệch bằng 0 khi 12 tháng khớp mục tiêu năm', () => {
    const rows = dungCayBang(
      [{ key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 120 }],
      doc,
    );
    expect(chiTiet(rows)[0].chenhLech).toBe(0);
    expect(chiTiet(rows)[0].lech).toBe(false);
  });

  it('chênh lệch dương khi phân bổ vượt mục tiêu', () => {
    const rows = dungCayBang(
      [{ key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 100 }],
      doc,
    );
    expect(chiTiet(rows)[0].chenhLech).toBe(20);
    expect(chiTiet(rows)[0].lech).toBe(true);
  });

  it('chênh lệch âm khi còn thiếu', () => {
    const rows = dungCayBang(
      [{ key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 200 }],
      doc,
    );
    expect(chiTiet(rows)[0].chenhLech).toBe(-80);
  });

  it('hàng nhóm và hàng tổng cũng có chênh lệch', () => {
    const rows = dungCayBang(
      [
        { key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 100 },
        { key: 'b', nhomKey: 'N1', thang: deu(10), namKhaiBao: 150 },
      ],
      doc,
    );
    const tong = rows.find((r) => r.loai === 'tong')!;
    const nhom = rows.find((r) => r.loai === 'nhom')!;
    // 240 phân bổ so với 250 mục tiêu.
    expect(tong.chenhLech).toBe(-10);
    expect(nhom.chenhLech).toBe(-10);
  });

  it('chuyển diễn giải xuống hàng chi tiết', () => {
    const rows = dungCayBang(
      [
        {
          key: 'a',
          nhomKey: 'N1',
          thang: deu(10),
          namKhaiBao: 120,
          ghiChu: 'Đơn hàng dự kiến Khách hàng A',
        },
      ],
      doc,
    );
    expect(chiTiet(rows)[0].ghiChu).toBe('Đơn hàng dự kiến Khách hàng A');
  });
});

describe('tongLech', () => {
  it('gom riêng phần thiếu và phần vượt', () => {
    const rows = dungCayBang(
      [
        // vượt 20
        { key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 100 },
        // thiếu 80
        { key: 'b', nhomKey: 'N2', thang: deu(10), namKhaiBao: 200 },
      ],
      doc,
    );
    expect(tongLech(rows)).toEqual({ thieu: 80, vuot: 20, soDongLech: 2 });
  });

  it('chỉ đếm hàng chi tiết, không cộng trùng hàng nhóm và hàng tổng', () => {
    const rows = dungCayBang(
      [{ key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 100 }],
      doc,
    );
    // Nếu cộng cả hàng nhóm và hàng tổng thì vượt sẽ là 60, không phải 20.
    expect(tongLech(rows).vuot).toBe(20);
    expect(tongLech(rows).soDongLech).toBe(1);
  });

  it('lệch dưới 1 đồng coi như khớp', () => {
    const rows = dungCayBang(
      [{ key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 120.4 }],
      doc,
    );
    expect(tongLech(rows)).toEqual({ thieu: 0, vuot: 0, soDongLech: 0 });
  });

  it('bảng rỗng không có gì để cảnh báo', () => {
    expect(tongLech([])).toEqual({ thieu: 0, vuot: 0, soDongLech: 0 });
  });
});
