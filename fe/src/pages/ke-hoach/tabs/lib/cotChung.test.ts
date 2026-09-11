import { describe, expect, it } from 'vitest';
import type { ColumnsType } from 'antd/es/table';
import {
  capCot,
  ghimTheoManKeHoach,
  ghimTrai,
  nhanChenhLech,
  onCellNhan,
  onCellNhanPhu,
  rowClassName,
} from './cotChung';

describe('nhanChenhLech', () => {
  it('khớp mục tiêu thì không cảnh báo', () => {
    expect(nhanChenhLech(0)).toBeNull();
  });

  it('lệch dưới 1 đồng thì không cảnh báo', () => {
    expect(nhanChenhLech(0.4)).toBeNull();
    expect(nhanChenhLech(-0.9)).toBeNull();
  });

  it('phân bổ vượt thì chữ xanh, có dấu cộng', () => {
    const kq = nhanChenhLech(20000000)!;
    expect(kq.text).toBe('+20.000.000');
    expect(kq.lop).toContain('text-green');
    expect(kq.tooltip).toBe('Phân bổ vượt mục tiêu 20.000.000 ₫');
  });

  it('còn thiếu thì chữ đỏ, có dấu trừ và số dương', () => {
    const kq = nhanChenhLech(-5000000)!;
    expect(kq.text).toBe('−5.000.000');
    expect(kq.lop).toContain('text-red');
    expect(kq.tooltip).toBe('Còn thiếu 5.000.000 ₫');
  });
});

describe('capCot', () => {
  it('gắn cùng một lớp cho cả ô tiêu đề lẫn ô dữ liệu', () => {
    const kq = capCot('kh-cot-quy');
    expect(kq.className).toBe('kh-cot-quy');
    expect(kq.onHeaderCell()).toEqual({ className: 'kh-cot-quy' });
  });
});

describe('rowClassName', () => {
  it('hàng tổng và hàng nhóm giữ nền cấp hàng của mình, không tô đỏ', () => {
    expect(rowClassName({ loai: 'tong', lech: true })).toBe('kh-hang-tong');
    expect(rowClassName({ loai: 'nhom', lech: true })).toBe('kh-hang-nhom');
  });

  it('dòng chi tiết lệch mục tiêu thì tô đỏ', () => {
    expect(rowClassName({ loai: 'chiTiet', lech: true })).toBe('kh-hang-lech');
  });

  it('dòng chi tiết khớp mục tiêu thì không tô gì', () => {
    expect(rowClassName({ loai: 'chiTiet', lech: false })).toBe('');
  });

  // Dòng vừa thêm luôn lệch (chưa phân bổ tháng nào) — tô đỏ ngay lúc đang gõ
  // dở là báo động giả, nền vàng "chưa lưu" phải thắng.
  it('dòng chưa lưu giữ nền vàng dù đang lệch', () => {
    expect(rowClassName({ loai: 'chiTiet', lech: true, chuaLuu: true })).toBe(
      'kh-hang-nhap',
    );
  });
});

describe('ghimTheoManKeHoach', () => {
  // Dáng bảng Bán hàng: cặp nhãn gộp colSpan + năm cột số + CẢ NĂM đều ghim,
  // sau đó là vùng cuộn (Q/T) và cột nút xoá không ghim.
  const cot: ColumnsType<unknown> = [
    ...ghimTrai<unknown>([
      { key: 'ma', width: 130, onCell: onCellNhan },
      { key: 'ten', width: 190, onCell: onCellNhanPhu },
      { key: 'ghiChu', width: 170 },
      { key: 'thanhTien', width: 160 },
      { key: 'caNam', width: 140 },
    ]),
    { key: 'quy', title: 'Quý', children: [{ key: 'q1', width: 110 }] },
    { key: 'thaoTac', width: 50 },
  ];
  const ghim = (cs: ColumnsType<unknown>) =>
    cs.filter((c) => !!c.fixed).map((c) => String(c.key));

  it('máy tính giữ nguyên mảng — bố cục gốc không đổi', () => {
    expect(ghimTheoManKeHoach(cot, 'desktop')).toBe(cot);
  });

  // Vùng ghim đủ ~800px ở khung iPad ~680–1100px là hết chỗ cho cột tháng.
  it('máy tính bảng chỉ ghim trọn cặp cột nhãn', () => {
    const kq = ghimTheoManKeHoach(cot, 'tablet');
    expect(ghim(kq)).toEqual(['ma', 'ten']);
    // Không đụng bề rộng, không đụng cột không ghim.
    expect(kq[0].width).toBe(130);
    expect(kq[5]).toBe(cot[5]);
  });

  it('bảng không có cặp nhãn gộp thì máy tính bảng giữ cột ghim đầu', () => {
    const khongGop = cot.map((c) => ({ ...c, onCell: undefined }));
    expect(ghim(ghimTheoManKeHoach(khongGop, 'tablet'))).toEqual(['ma']);
  });

  // Hàng tổng/nhóm gộp cặp nhãn bằng colSpan — antd chỉ giữ ô gộp dính khi CẢ
  // HAI cột cùng ghim, nên điện thoại cũng giữ trọn cặp, chỉ thu hẹp lại.
  it('điện thoại giữ trọn cặp cột nhãn, mỗi cột thu về tối đa 90px', () => {
    const kq = ghimTheoManKeHoach(cot, 'mobile');
    expect(ghim(kq)).toEqual(['ma', 'ten']);
    expect(kq[0].width).toBe(90);
    expect(kq[1].width).toBe(90);
    expect(kq[1].ellipsis).toBe(true);
  });

  it('điện thoại, bảng không có cặp nhãn gộp: chỉ cột đầu, tối đa 140px', () => {
    const khongGop = cot.map((c, i) => ({ ...c, onCell: undefined, width: i === 0 ? 200 : c.width }));
    const kq = ghimTheoManKeHoach(khongGop, 'mobile');
    expect(ghim(kq)).toEqual(['ma']);
    expect(kq[0].width).toBe(140);
  });
});
