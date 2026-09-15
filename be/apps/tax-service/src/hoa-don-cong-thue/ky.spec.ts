
describe('ngayVN / kyVN', () => {
  const { ngayVN, kyVN } = require('./ky');

  it('nửa đêm giờ Việt Nam lưu dạng UTC vẫn ra đúng ngày', () => {
    // 2026-09-09 00:00 +07 được lưu thành 2026-09-08T17:00:00Z.
    expect(ngayVN('2026-09-08T17:00:00.000Z')).toBe('2026-09-09');
  });

  it('nửa đêm UTC cũng ra đúng ngày đó', () => {
    expect(ngayVN('2026-09-09T00:00:00.000Z')).toBe('2026-09-09');
  });

  it('hóa đơn ngày 01 đầu tháng không rơi về kỳ trước', () => {
    expect(kyVN('2026-08-31T17:00:00.000Z')).toBe('2026-09');
  });

  it('trống hoặc sai định dạng thì trả rỗng, không ném lỗi', () => {
    expect(ngayVN(null)).toBe('');
    expect(ngayVN('khong-phai-ngay')).toBe('');
    expect(kyVN(null)).toBe('khong-ro-ky');
  });
});
