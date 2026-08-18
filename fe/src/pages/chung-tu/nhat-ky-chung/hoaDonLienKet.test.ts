import { describe, it, expect } from 'vitest';
import {
  suyLoaiHoaDon,
  tongThanhToanHoaDon,
  dungDongNhap,
  timHoaDonCanGoLienKet,
  khoaHoaDon,
  chonDoiTuongHoaDon,
  chonHanhDongHoaDonMoi,
  type HoaDonGan,
  type HoaDonDangGan,
} from './hoaDonLienKet';

describe('suyLoaiHoaDon', () => {
  it('phiếu chi / báo nợ là tiền ra → hóa đơn mua vào', () => {
    expect(suyLoaiHoaDon('PHIEU_CHI')).toBe('mua');
    expect(suyLoaiHoaDon('BAO_NO')).toBe('mua');
  });

  it('phiếu thu / báo có là tiền vào → hóa đơn bán ra', () => {
    expect(suyLoaiHoaDon('PHIEU_THU')).toBe('ban');
    expect(suyLoaiHoaDon('BAO_CO')).toBe('ban');
  });

  it('loại lạ hoặc chưa chọn thì mặc định mua vào — hóa đơn đầu vào nhiều hơn hẳn', () => {
    expect(suyLoaiHoaDon(undefined)).toBe('mua');
    expect(suyLoaiHoaDon('KHAC')).toBe('mua');
  });
});

describe('tongThanhToanHoaDon', () => {
  const hd = (over: Partial<HoaDonGan>): HoaDonGan => ({
    soHoaDon: '001',
    loai: 'mua',
    ...over,
  });

  it('cộng tổng thanh toán của các hóa đơn đã gắn', () => {
    expect(
      tongThanhToanHoaDon([
        hd({ tongThanhToan: 1_100_000 }),
        hd({ tongThanhToan: 2_200_000 }),
      ]),
    ).toBe(3_300_000);
  });

  it('hóa đơn mới gõ (chưa có số tiền) tính là 0, không ra NaN', () => {
    expect(tongThanhToanHoaDon([hd({}), hd({ tongThanhToan: 500 })])).toBe(500);
  });
});

describe('dungDongNhap', () => {
  const args = {
    soHoaDon: 'HD0001234',
    ngayChungTu: '2026-08-18',
    soChungTu: 'PC0001',
    doiTuongTen: 'Cty ABC',
    doiTuongMst: '0101243150',
  };

  it('hóa đơn mua vào điền tên/MST vào cặp trường người bán', () => {
    const row = dungDongNhap({ ...args, loai: 'mua' });
    expect(row).toMatchObject({
      soHoaDon: 'HD0001234',
      ngayHoaDon: '2026-08-18',
      soChungTu: 'PC0001',
      tenNguoiBan: 'Cty ABC',
      mstNguoiBan: '0101243150',
      giaTriChuaThue: 0,
      tienThue: 0,
      tongThanhToan: 0,
      choBoSung: true,
    });
    expect(row.tenNguoiMua).toBeUndefined();
  });

  it('hóa đơn bán ra điền vào cặp trường người mua', () => {
    const row = dungDongNhap({ ...args, loai: 'ban' });
    expect(row).toMatchObject({ tenNguoiMua: 'Cty ABC', mstNguoiMua: '0101243150' });
    expect(row.tenNguoiBan).toBeUndefined();
  });

  it('chứng từ chưa có đối tượng thì để "(Chưa xác định)" — BE bắt buộc trường tên', () => {
    const row = dungDongNhap({ ...args, loai: 'mua', doiTuongTen: undefined, doiTuongMst: undefined });
    expect(row.tenNguoiBan).toBe('(Chưa xác định)');
    expect(row.mstNguoiBan).toBeUndefined();
  });

  it('luôn đặt thuế suất mặc định 10 để BE không rớt @IsIn', () => {
    expect(dungDongNhap({ ...args, loai: 'mua' }).thueSuat).toBe('10');
  });
});

describe('timHoaDonCanGoLienKet', () => {
  const ganServer = (over: Partial<HoaDonDangGan>): HoaDonDangGan => ({
    id: 'A',
    soHoaDon: 'HD0001',
    loai: 'mua',
    ...over,
  });
  const hienTai = (over: Partial<HoaDonGan>): HoaDonGan => ({
    id: 'A',
    soHoaDon: 'HD0001',
    loai: 'mua',
    ...over,
  });

  it('bỏ 1 trong 2 chip → chỉ hóa đơn bị bỏ cần gỡ liên kết', () => {
    const dangGanOServer = [ganServer({ id: 'A' }), ganServer({ id: 'B', soHoaDon: 'HD0002' })];
    const danhSachHienTai = [hienTai({ id: 'A' })]; // đã bỏ B khỏi ô

    expect(timHoaDonCanGoLienKet(dangGanOServer, danhSachHienTai)).toEqual([
      ganServer({ id: 'B', soHoaDon: 'HD0002' }),
    ]);
  });

  it('không bỏ gì → không có hóa đơn nào cần gỡ liên kết', () => {
    const dangGanOServer = [ganServer({ id: 'A' }), ganServer({ id: 'B', soHoaDon: 'HD0002' })];
    const danhSachHienTai = [hienTai({ id: 'A' }), hienTai({ id: 'B', soHoaDon: 'HD0002' })];

    expect(timHoaDonCanGoLienKet(dangGanOServer, danhSachHienTai)).toEqual([]);
  });

  it('bỏ hết chip → tất cả hóa đơn đang gắn ở server đều cần gỡ liên kết', () => {
    const dangGanOServer = [ganServer({ id: 'A' }), ganServer({ id: 'B', soHoaDon: 'HD0002' })];

    expect(timHoaDonCanGoLienKet(dangGanOServer, [])).toEqual(dangGanOServer);
  });

  it('hóa đơn mới gõ trên form (chưa có id) không bị tính nhầm vào danh sách cần gỡ', () => {
    const dangGanOServer = [ganServer({ id: 'A' })];
    const danhSachHienTai = [hienTai({ id: 'A' }), hienTai({ id: undefined, soHoaDon: 'HD0009' })];

    expect(timHoaDonCanGoLienKet(dangGanOServer, danhSachHienTai)).toEqual([]);
  });
});

describe('khoaHoaDon', () => {
  it('có id thì khóa là id', () => {
    expect(khoaHoaDon({ id: 'x1', soHoaDon: 'HD001', loai: 'mua' })).toBe('x1');
  });

  it('hai hóa đơn TRÙNG SỐ khác nhà cung cấp cho ra hai khóa khác nhau', () => {
    const a = khoaHoaDon({ id: 'ncc-a', soHoaDon: '000123', loai: 'mua' });
    const b = khoaHoaDon({ id: 'ncc-b', soHoaDon: '000123', loai: 'mua' });
    expect(a).not.toBe(b);
  });

  it('hóa đơn chưa có id: khóa gồm loại + số, mua và bán không đụng nhau', () => {
    expect(khoaHoaDon({ soHoaDon: ' 000123 ', loai: 'mua' })).toBe('moi:mua:000123');
    expect(khoaHoaDon({ soHoaDon: '000123', loai: 'ban' })).toBe('moi:ban:000123');
  });
});

describe('chonDoiTuongHoaDon', () => {
  const nganHang = { ten: 'Ngân hàng ACB' };
  const khachHang = { ten: 'Khách hàng X', maSoThue: '0101010101' };
  const nhaCungCap = { ten: 'NCC Y', maSoThue: '0202020202' };

  it('phiếu thu (Nợ 111 ngân hàng / Có 131 khách) → hóa đơn bán ra lấy vế CÓ', () => {
    const rows = [{ doiTuongSnapshot: nganHang, doiTuong2Snapshot: khachHang }];
    expect(chonDoiTuongHoaDon(rows, 'ban')).toEqual({
      ten: 'Khách hàng X',
      mst: '0101010101',
    });
  });

  it('phiếu chi (Nợ 331 NCC / Có 111) → hóa đơn mua vào lấy vế NỢ', () => {
    const rows = [{ doiTuongSnapshot: nhaCungCap, doiTuong2Snapshot: nganHang }];
    expect(chonDoiTuongHoaDon(rows, 'mua')).toEqual({
      ten: 'NCC Y',
      mst: '0202020202',
    });
  });

  it('bên ưu tiên trống thì lùi về bên còn lại', () => {
    expect(chonDoiTuongHoaDon([{ doiTuongSnapshot: nhaCungCap }], 'ban')).toEqual({
      ten: 'NCC Y',
      mst: '0202020202',
    });
    expect(chonDoiTuongHoaDon([{ doiTuong2Snapshot: khachHang }], 'mua')).toEqual({
      ten: 'Khách hàng X',
      mst: '0101010101',
    });
  });

  it('quét mọi dòng chi tiết, không chỉ dòng đầu', () => {
    const rows = [{}, { doiTuong2Snapshot: khachHang }];
    expect(chonDoiTuongHoaDon(rows, 'ban').ten).toBe('Khách hàng X');
  });

  it('snapshot rỗng / không có dòng nào → trả rỗng, không ném', () => {
    expect(chonDoiTuongHoaDon([], 'mua')).toEqual({});
    expect(chonDoiTuongHoaDon([{ doiTuongSnapshot: {} }], 'mua')).toEqual({});
    expect(chonDoiTuongHoaDon([{ doiTuongSnapshot: { ten: '   ' } }], 'mua')).toEqual({});
  });

  it('chỉ có MST, chưa có tên vẫn dùng được', () => {
    expect(chonDoiTuongHoaDon([{ doiTuongSnapshot: { maSoThue: '999' } }], 'mua')).toEqual({
      mst: '999',
    });
  });
});

describe('chonHanhDongHoaDonMoi', () => {
  it('bảng kê chưa có số đó → tạo dòng nháp', () => {
    expect(chonHanhDongHoaDonMoi('HD001', [], 'PC0001')).toEqual({ kieu: 'tao' });
    expect(chonHanhDongHoaDonMoi('HD001', [{ id: 'a', soHoaDon: 'HD002' }], 'PC0001')).toEqual({
      kieu: 'tao',
    });
  });

  it('đã có dòng chưa gắn chứng từ → gắn vào dòng cũ, KHÔNG tạo trùng', () => {
    const res = chonHanhDongHoaDonMoi('HD001', [{ id: 'a', soHoaDon: 'HD001' }], 'PC0001');
    expect(res).toEqual({ kieu: 'gan', id: 'a' });
  });

  it('so số không phân biệt hoa thường và khoảng trắng', () => {
    const res = chonHanhDongHoaDonMoi(' hd001 ', [{ id: 'a', soHoaDon: 'HD001' }], 'PC0001');
    expect(res).toEqual({ kieu: 'gan', id: 'a' });
  });

  it('dòng đã gắn ĐÚNG chứng từ này → vẫn gắn lại (idempotent)', () => {
    const res = chonHanhDongHoaDonMoi(
      'HD001',
      [{ id: 'a', soHoaDon: 'HD001', soChungTu: 'PC0001' }],
      'PC0001',
    );
    expect(res).toEqual({ kieu: 'gan', id: 'a' });
  });

  it('số đó đang gắn chứng từ KHÁC → báo lỗi, không tạo và không cướp liên kết', () => {
    const res = chonHanhDongHoaDonMoi(
      'HD001',
      [{ id: 'a', soHoaDon: 'HD001', soChungTu: 'PC9999' }],
      'PC0001',
    );
    expect(res.kieu).toBe('loi');
    expect((res as { lyDo: string }).lyDo).toContain('PC9999');
  });

  it('nhiều dòng cùng số đều rảnh → nhập nhằng, bắt chọn từ gợi ý', () => {
    const res = chonHanhDongHoaDonMoi(
      'HD001',
      [
        { id: 'a', soHoaDon: 'HD001' },
        { id: 'b', soHoaDon: 'HD001' },
      ],
      'PC0001',
    );
    expect(res.kieu).toBe('loi');
  });
});
