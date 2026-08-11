import { describe, it, expect } from 'vitest';
import { tinhGhiChuDonHang } from './ghiChuDonHang';

const hanhDong = (r: Parameters<typeof tinhGhiChuDonHang>[0]) =>
  tinhGhiChuDonHang(r).chips.map((c) => c.hanhDong);

describe('tinhGhiChuDonHang', () => {
  it('chưa ghi nhận gì thì gợi ý ghi nhận doanh thu và thu tiền', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 0,
      dtDaThucHien: 0,
      mocDoanhThu: 1_000,
      conPhaiThu: 1_100,
    });
    expect(r.chips.map((c) => c.hanhDong)).toEqual(['GHI_NHAN_DOANH_THU', 'THU_TIEN']);
    expect(r.chips[0].soTien).toBe(1_000);
    expect(r.chips[1].soTien).toBe(1_100);
  });

  it('còn 3387 treo thì gợi ý kết chuyển', () => {
    expect(
      hanhDong({
        dtChuaThucHien: 400,
        dtDaThucHien: 600,
        mocDoanhThu: 1_000,
        conPhaiThu: 0,
      }),
    ).toEqual(['KET_CHUYEN_DOANH_THU']);
  });

  it('thỏa cả hai điều kiện doanh thu thì hiện cả hai chip', () => {
    expect(
      hanhDong({
        dtChuaThucHien: 300,
        dtDaThucHien: 200,
        mocDoanhThu: 1_000,
        conPhaiThu: 0,
      }),
    ).toEqual(['GHI_NHAN_DOANH_THU', 'KET_CHUYEN_DOANH_THU']);
  });

  it('số tiền ghi nhận = mốc trừ phần đã có', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 300,
      dtDaThucHien: 200,
      mocDoanhThu: 1_000,
      conPhaiThu: 0,
    });
    expect(r.chips[0].soTien).toBe(500);
  });

  it('số tiền kết chuyển = doanh thu chưa thực hiện', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 300,
      dtDaThucHien: 200,
      mocDoanhThu: 500,
      conPhaiThu: 0,
    });
    expect(r.chips[0].hanhDong).toBe('KET_CHUYEN_DOANH_THU');
    expect(r.chips[0].soTien).toBe(300);
  });

  it('ghi nhận đủ và thu đủ thì chỉ còn nhãn tĩnh', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 0,
      dtDaThucHien: 1_000,
      mocDoanhThu: 1_000,
      conPhaiThu: 0,
    });
    expect(r.chips).toEqual([]);
    expect(r.nhanTinh).toEqual(['Đã ghi nhận doanh thu', 'Đã thu tiền']);
  });

  it('lệch dưới 1 đồng coi như đủ (tránh chip ma do làm tròn)', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 0,
      dtDaThucHien: 999.5,
      mocDoanhThu: 1_000,
      conPhaiThu: 0.4,
    });
    expect(r.chips).toEqual([]);
  });

  it('thu vượt (còn phải thu âm) không gợi ý thu tiền', () => {
    expect(
      hanhDong({
        dtChuaThucHien: 0,
        dtDaThucHien: 1_000,
        mocDoanhThu: 1_000,
        conPhaiThu: -50,
      }),
    ).toEqual([]);
  });

  it('mốc doanh thu bằng 0 thì không gợi ý ghi nhận', () => {
    expect(
      hanhDong({
        dtChuaThucHien: 0,
        dtDaThucHien: 0,
        mocDoanhThu: 0,
        conPhaiThu: 0,
      }),
    ).toEqual([]);
  });

  it('ghi nhận vượt mốc cũng không gợi ý thêm', () => {
    expect(
      hanhDong({
        dtChuaThucHien: 0,
        dtDaThucHien: 2_000,
        mocDoanhThu: 1_000,
        conPhaiThu: 0,
      }),
    ).toEqual([]);
  });

  it('nhãn hiển thị đúng chữ', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 100,
      dtDaThucHien: 0,
      mocDoanhThu: 1_000,
      conPhaiThu: 500,
    });
    expect(r.chips.map((c) => c.nhan)).toEqual([
      'Ghi nhận doanh thu',
      'Kết chuyển doanh thu',
      'Thu tiền',
    ]);
  });
});
