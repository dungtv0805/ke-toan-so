import { describe, expect, it } from 'vitest';
import {
  chieuCuaNhom,
  nhomDaKhaiChieu,
  quyTuSoDuCuoi,
  quyTuSoDuDau,
  tinhTongHopDongTien,
} from './dongTienTongHop';

const m = (...v: number[]) => {
  const a = Array(12).fill(0);
  v.forEach((x, i) => (a[i] = x));
  return a;
};

describe('tinhTongHopDongTien', () => {
  it('gom thu và chi theo chiều của từng dòng', () => {
    const kq = tinhTongHopDongTien(
      [
        { chieu: 'THU', thang: m(100, 200) },
        { chieu: 'THU', thang: m(10, 20) },
        { chieu: 'CHI', thang: m(50, 60) },
      ],
      0,
    );
    expect(kq.thu.slice(0, 2)).toEqual([110, 220]);
    expect(kq.chi.slice(0, 2)).toEqual([50, 60]);
  });

  it('tồn cuối = tồn đầu + thu − chi', () => {
    const kq = tinhTongHopDongTien([{ chieu: 'THU', thang: m(100) }], 500);
    expect(kq.tonDau[0]).toBe(500);
    expect(kq.tonCuoi[0]).toBe(600);
  });

  it('tồn đầu tháng sau là tồn cuối tháng trước', () => {
    const kq = tinhTongHopDongTien(
      [
        { chieu: 'THU', thang: m(100, 100, 100) },
        { chieu: 'CHI', thang: m(30, 30, 30) },
      ],
      1000,
    );
    // 1000 → 1070 → 1140 → 1210
    expect(kq.tonDau.slice(0, 4)).toEqual([1000, 1070, 1140, 1210]);
    expect(kq.tonCuoi.slice(0, 3)).toEqual([1070, 1140, 1210]);
  });

  it('thặng dư = thu − chi, âm khi chi nhiều hơn thu', () => {
    const kq = tinhTongHopDongTien(
      [
        { chieu: 'THU', thang: m(100) },
        { chieu: 'CHI', thang: m(250) },
      ],
      0,
    );
    expect(kq.thangDu[0]).toBe(-150);
    expect(kq.tonCuoi[0]).toBe(-150);
  });

  it('tồn đầu năm âm vẫn cuộn đúng — kế hoạch có thể bắt đầu thấu chi', () => {
    const kq = tinhTongHopDongTien([{ chieu: 'THU', thang: m(200) }], -500);
    expect(kq.tonDau[0]).toBe(-500);
    expect(kq.tonCuoi[0]).toBe(-300);
    expect(kq.tonDau[1]).toBe(-300);
  });

  it('bảng rỗng cho toàn 0, trừ tồn đầu năm', () => {
    const kq = tinhTongHopDongTien([], 700);
    expect(kq.thu.every((v) => v === 0)).toBe(true);
    expect(kq.tonDau[0]).toBe(700);
    expect(kq.tonCuoi[11]).toBe(700);
  });
});

describe('quý của dòng số dư', () => {
  const thang = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  it('tồn đầu quý lấy tháng đầu quý, không cộng dồn', () => {
    expect(quyTuSoDuDau(thang)).toEqual([1, 4, 7, 10]);
  });

  it('tồn cuối quý lấy tháng cuối quý, không cộng dồn', () => {
    expect(quyTuSoDuCuoi(thang)).toEqual([3, 6, 9, 12]);
  });
});

describe('chieuCuaNhom', () => {
  // Chiều tiền là thuộc tính của NHÓM ("Thu từ bán hàng" không bao giờ là chi),
  // khai một lần ở danh mục thay vì bắt người lập kế hoạch gõ lại mỗi dòng.
  const nhom = [
    { ma: 'NT02', chieu: 'THU' as const },
    { ma: 'NC01', chieu: 'CHI' as const },
    { ma: 'NX09' }, // nhóm chưa khai chiều
  ];

  it('lấy chiều đã khai ở nhóm', () => {
    expect(chieuCuaNhom(nhom, 'NT02', 'CHI')).toBe('THU');
    expect(chieuCuaNhom(nhom, 'NC01', 'THU')).toBe('CHI');
  });

  it('nhóm chưa khai chiều thì giữ chiều đã lưu trên dòng kế hoạch cũ', () => {
    expect(chieuCuaNhom(nhom, 'NX09', 'CHI')).toBe('CHI');
  });

  it('nhóm không có trong danh mục cũng giữ chiều đã lưu', () => {
    expect(chieuCuaNhom(nhom, 'KHONG-CO', 'CHI')).toBe('CHI');
  });

  it('không khai được ở đâu cả thì mặc định THU, không ném lỗi', () => {
    expect(chieuCuaNhom(nhom, 'NX09', undefined)).toBe('THU');
  });

  // Khoá tra cứu là MÃ nhóm — `NhomCoChieu` cố ý không có `ten` nên không thể
  // lỡ tay tra theo tên, mà hai nhóm khác nhau thì hoàn toàn có thể trùng tên.
  it('tra đúng nhóm theo mã khi có nhiều nhóm chiều khác nhau', () => {
    const nhieu = [
      { ma: 'A', chieu: 'THU' as const },
      { ma: 'B', chieu: 'CHI' as const },
    ];
    expect(chieuCuaNhom(nhieu, 'A', undefined)).toBe('THU');
    expect(chieuCuaNhom(nhieu, 'B', undefined)).toBe('CHI');
  });
});

describe('nhomDaKhaiChieu', () => {
  const nhom = [
    { ma: 'C', chieu: 'CHI' as const },
    { ma: 'X', chieu: null },
    { ma: 'Y' },
  ];

  it('khai rồi thì true', () => {
    expect(nhomDaKhaiChieu(nhom, 'C')).toBe(true);
  });

  it('chieu null hoặc thiếu hẳn đều là chưa khai', () => {
    expect(nhomDaKhaiChieu(nhom, 'X')).toBe(false);
    expect(nhomDaKhaiChieu(nhom, 'Y')).toBe(false);
  });

  it('mã không có trong danh mục Nhóm cũng là chưa khai', () => {
    expect(nhomDaKhaiChieu(nhom, 'KHONG-CO')).toBe(false);
    expect(nhomDaKhaiChieu(nhom, '')).toBe(false);
  });
});
