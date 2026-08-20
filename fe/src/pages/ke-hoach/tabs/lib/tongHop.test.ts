import { describe, expect, it } from 'vitest';
import { dungCayBang, quyTuThang, tongMang, type MoTaHang } from './tongHop';

interface Mau {
  id: string;
  nhomKey: string;
  nhomNhan: string;
  nhan: string;
  thang: number[];
  namKhaiBao: number;
}

const doc = (m: Mau): MoTaHang => ({
  key: m.id,
  nhomKey: m.nhomKey,
  nhomNhan: m.nhomNhan,
  nhan: m.nhan,
  thang: m.thang,
  namKhaiBao: m.namKhaiBao,
});

const thang = (...v: number[]) =>
  Array.from({ length: 12 }, (_, i) => v[i] ?? 0);

describe('quyTuThang', () => {
  it('mỗi quý là tổng đúng 3 tháng của quý đó', () => {
    expect(quyTuThang(thang(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12))).toEqual([
      6, 15, 24, 33,
    ]);
  });

  it('mảng ngắn hơn 12 coi phần thiếu là 0', () => {
    expect(quyTuThang([1, 2])).toEqual([3, 0, 0, 0]);
  });
});

describe('tongMang', () => {
  it('cộng theo từng vị trí', () => {
    expect(tongMang([1, 2, 3], [10, 20, 30])).toEqual([11, 22, 33]);
  });
});

describe('dungCayBang', () => {
  const items: Mau[] = [
    {
      id: 'a',
      nhomKey: 'n1',
      nhomNhan: 'Nhóm 1',
      nhan: 'SP A',
      thang: thang(10, 10, 10),
      namKhaiBao: 30,
    },
    {
      id: 'b',
      nhomKey: 'n1',
      nhomNhan: 'Nhóm 1',
      nhan: 'SP B',
      thang: thang(0, 0, 0, 20),
      namKhaiBao: 20,
    },
    {
      id: 'c',
      nhomKey: 'n2',
      nhomNhan: 'Nhóm 2',
      nhan: 'SP C',
      thang: thang(50),
      namKhaiBao: 50,
    },
  ];

  it('hàng đầu là TỔNG CỘNG, gộp mọi dòng', () => {
    const rows = dungCayBang(items, doc);
    expect(rows[0].loai).toBe('tong');
    expect(rows[0].namTheoThang).toBe(100);
    expect(rows[0].namKhaiBao).toBe(100);
    expect(rows[0].quy).toEqual([80, 20, 0, 0]);
  });

  it('sau hàng tổng là từng nhóm kèm dòng con của nhóm đó', () => {
    const rows = dungCayBang(items, doc);
    expect(rows.map((r) => r.loai)).toEqual([
      'tong',
      'nhom',
      'chiTiet',
      'chiTiet',
      'nhom',
      'chiTiet',
    ]);
    expect(rows[1].nhan).toBe('Nhóm 1');
    expect(rows[1].namKhaiBao).toBe(50);
    expect(rows[1].quy).toEqual([30, 20, 0, 0]);
  });

  it('phần trăm tính theo tổng cộng', () => {
    const rows = dungCayBang(items, doc);
    expect(rows[2].phanTram).toBeCloseTo(0.3);
    expect(rows[5].phanTram).toBeCloseTo(0.5);
  });

  it('tổng cộng bằng 0 thì phần trăm là 0, không chia cho 0', () => {
    const rong: Mau[] = [
      {
        id: 'z',
        nhomKey: 'n1',
        nhomNhan: 'Nhóm 1',
        nhan: 'SP Z',
        thang: thang(),
        namKhaiBao: 0,
      },
    ];
    const rows = dungCayBang(rong, doc);
    expect(rows.every((r) => r.phanTram === 0)).toBe(true);
  });

  it('đánh dấu lệch khi tổng 12 tháng khác số khai báo', () => {
    const lech: Mau[] = [
      {
        id: 'x',
        nhomKey: 'n1',
        nhomNhan: 'Nhóm 1',
        nhan: 'SP X',
        thang: thang(10),
        namKhaiBao: 99,
      },
    ];
    const rows = dungCayBang(lech, doc);
    expect(rows.find((r) => r.key === 'x')?.lech).toBe(true);
  });

  it('không lệch khi hai số khớp nhau', () => {
    const rows = dungCayBang(items, doc);
    expect(
      rows.filter((r) => r.loai === 'chiTiet').every((r) => !r.lech),
    ).toBe(true);
  });

  it('hàng chi tiết giữ lại dòng gốc để sửa', () => {
    const rows = dungCayBang(items, doc);
    expect(rows[2].dong).toBe(items[0]);
    expect(rows[0].dong).toBeUndefined();
    expect(rows[1].dong).toBeUndefined();
  });

  it('không có dòng nào thì chỉ còn hàng tổng rỗng', () => {
    const rows = dungCayBang<Mau>([], doc);
    expect(rows).toHaveLength(1);
    expect(rows[0].loai).toBe('tong');
    expect(rows[0].thang).toEqual(thang());
    expect(rows[0].lech).toBe(false);
  });
});
