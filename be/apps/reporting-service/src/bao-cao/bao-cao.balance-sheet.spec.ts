import { BaoCaoService } from './bao-cao.service';

/**
 * Kết chuyển lỗ ghi Nợ 4212 / Có 911 → 4212 dư Nợ → số dư âm. Clamp về 0 sẽ làm
 * nguồn vốn thiếu đúng phần lỗ và Bảng cân đối kế toán không cân.
 */
describe('calculateAccountBalance — cho phép số âm ở nhóm nguồn vốn', () => {
  const goi = (service: any, args: any[]) =>
    (service as any).calculateAccountBalance(...args);

  const service = Object.create(BaoCaoService.prototype);

  const vouchers = [
    {
      soTien: 70,
      danhMuc: { taiKhoanNo: { ma: '4212' }, taiKhoanCo: { ma: '911' } },
    },
  ];

  it('mặc định vẫn clamp về 0 để không đụng các báo cáo đang chạy', () => {
    expect(goi(service, [vouchers, '4212', 'CO', 0])).toBe(0);
  });

  it('trả về số âm khi bật choPhepAm', () => {
    expect(goi(service, [vouchers, '4212', 'CO', 0, true])).toBe(-70);
  });

  it('lãi vẫn ra số dương khi bật choPhepAm', () => {
    const lai = [
      {
        soTien: 70,
        danhMuc: { taiKhoanNo: { ma: '911' }, taiKhoanCo: { ma: '4212' } },
      },
    ];
    expect(goi(service, [lai, '4212', 'CO', 0, true])).toBe(70);
  });
});
