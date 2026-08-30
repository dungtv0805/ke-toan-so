import { DINH_KHOAN_MAC_DINH, sinhButToanKeHoach } from './dinh-khoan.helper';

const cap = {
  taiKhoanNo: { ma: '131', ten: 'Phải thu khách hàng', loai: '', nhom: '' },
  taiKhoanCo: { ma: '511', ten: 'Doanh thu bán hàng', loai: '', nhom: '' },
};

const nguon = (thang: number[], them: Record<string, unknown> = {}) => ({
  nguonLoai: 'BAN_HANG' as const,
  nguonId: 'r1',
  nam: 2026,
  loaiKeHoach: 'KE_HOACH' as const,
  tenMacDinh: 'Gói A',
  thang,
  ...them,
});

const m = (...v: number[]) => {
  const a = Array(12).fill(0);
  v.forEach((x, i) => (a[i] = x));
  return a;
};

describe('sinhButToanKeHoach', () => {
  it('bỏ qua tháng bằng 0 — không sinh bút toán rỗng', () => {
    const kq = sinhButToanKeHoach(nguon(m(100, 0, 200)), cap, 'u1');
    expect(kq).toHaveLength(2);
    expect(kq.map((d) => d.soTien)).toEqual([100, 200]);
  });

  it('ngày là 01 của tháng, theo UTC', () => {
    // kqkd.helper đọc tháng bằng getUTCMonth(); lệch múi giờ sẽ đẩy T1 về T12.
    const [d] = sinhButToanKeHoach(nguon(m(100)), cap, 'u1');
    expect(d.ngay!.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('tháng 12 không bị đẩy sang năm sau', () => {
    const thang = Array(12).fill(0);
    thang[11] = 500;
    const [d] = sinhButToanKeHoach(nguon(thang), cap, 'u1');
    expect(d.ngay!.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('mang theo khoá liên kết để đồng bộ sửa/xoá', () => {
    const [d] = sinhButToanKeHoach(nguon(m(100)), cap, 'u1');
    expect(d.nguonLoai).toBe('BAN_HANG');
    expect(d.nguonId).toBe('r1');
  });

  it('lấy diễn giải làm nội dung, rỗng thì lấy tên dòng', () => {
    const [coGhiChu] = sinhButToanKeHoach(
      nguon(m(100), { ghiChu: 'Đơn hàng Khách A' }),
      cap,
      'u1',
    );
    expect(coGhiChu.noiDung).toBe('Đơn hàng Khách A');

    const [khongGhiChu] = sinhButToanKeHoach(nguon(m(100)), cap, 'u1');
    expect(khongGhiChu.noiDung).toBe('Gói A');
  });

  it('gắn đúng cặp tài khoản của cấu hình', () => {
    const [d] = sinhButToanKeHoach(nguon(m(100)), cap, 'u1');
    expect(d.danhMuc!.taiKhoanNo!.ma).toBe('131');
    expect(d.danhMuc!.taiKhoanCo!.ma).toBe('511');
  });

  it('giữ nguyên các chiều phân tích của dòng nguồn', () => {
    const [d] = sinhButToanKeHoach(
      nguon(m(100), {
        danhMuc: { sanPham: { ma: 'SP1', ten: 'Gói A' } },
      }),
      cap,
      'u1',
    );
    expect(d.danhMuc!.sanPham!.ma).toBe('SP1');
    // Cặp tài khoản vẫn phải được ghi đè lên, không bị chiều phân tích lấn.
    expect(d.danhMuc!.taiKhoanNo!.ma).toBe('131');
  });

  it('giữ số âm — nguồn vốn giảm trong kỳ là hợp lệ', () => {
    const kq = sinhButToanKeHoach(nguon(m(-100)), cap, 'u1');
    expect(kq[0].soTien).toBe(-100);
  });

  it('chưa cấu hình định khoản thì không sinh gì', () => {
    expect(sinhButToanKeHoach(nguon(m(100)), undefined, 'u1')).toEqual([]);
  });

  it('mọi bút toán vào phiên bản Mặc định', () => {
    const [d] = sinhButToanKeHoach(nguon(m(100)), cap, 'u1');
    expect(d.phienBan).toBe('Mặc định');
  });
});

describe('DINH_KHOAN_MAC_DINH', () => {
  it('phủ đủ năm bảng, kèm hai chiều của Dòng tiền và Nguồn vốn', () => {
    const khoa = DINH_KHOAN_MAC_DINH.map(
      (c) => `${c.bang}${c.phanLoai ? ':' + c.phanLoai : ''}`,
    );
    expect(khoa).toEqual([
      'BAN_HANG',
      'NHAN_SU',
      'TAI_SAN',
      'DONG_TIEN:THU',
      'DONG_TIEN:CHI',
      'NGUON_VON:NO_PHAI_TRA',
      'NGUON_VON:VON_CHU_SO_HUU',
    ]);
  });

  it('không có cặp nào để trống tài khoản', () => {
    for (const c of DINH_KHOAN_MAC_DINH) {
      expect(c.taiKhoanNo.ma).toBeTruthy();
      expect(c.taiKhoanCo.ma).toBeTruthy();
    }
  });
});
