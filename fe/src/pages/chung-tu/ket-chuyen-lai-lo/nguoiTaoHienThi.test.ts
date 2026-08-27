import { describe, expect, it } from 'vitest';
import { dungBanDoNguoiDung, tenNguoiTao } from './nguoiTaoHienThi';

describe('dungBanDoNguoiDung', () => {
  it('lập bản đồ id → họ tên', () => {
    const banDo = dungBanDoNguoiDung([
      { id: 'u1', hoTen: 'Nguyễn Thị Mai Phương', email: 'a@x.com' },
      { id: 'u2', hoTen: 'Admin', email: 'b@x.com' },
    ]);
    expect(banDo.get('u1')).toBe('Nguyễn Thị Mai Phương');
    expect(banDo.get('u2')).toBe('Admin');
  });

  it('lấy email khi thiếu họ tên', () => {
    const banDo = dungBanDoNguoiDung([{ id: 'u1', hoTen: '   ', email: 'a@x.com' }]);
    expect(banDo.get('u1')).toBe('a@x.com');
  });

  it('bỏ qua bản ghi thiếu id hoặc không có nhãn nào', () => {
    const banDo = dungBanDoNguoiDung([
      { id: '', hoTen: 'Không id' },
      { id: 'u3' },
    ]);
    expect(banDo.size).toBe(0);
  });

  it('phân biệt được các id chỉ khác nhau ở ký tự cuối', () => {
    const banDo = dungBanDoNguoiDung([
      { id: '6948004b4213122b3ff7984f', hoTen: 'Mai Phương' },
      { id: '6948004b4213122b3ff79850', hoTen: 'Admin' },
    ]);
    expect(tenNguoiTao('6948004b4213122b3ff7984f', banDo)).toBe('Mai Phương');
    expect(tenNguoiTao('6948004b4213122b3ff79850', banDo)).toBe('Admin');
  });
});

describe('tenNguoiTao', () => {
  it('trả gạch ngang khi chứng từ không có người tạo', () => {
    expect(tenNguoiTao(undefined, new Map())).toBe('—');
  });

  it('giữ nguyên id khi không tra được tên', () => {
    expect(tenNguoiTao('u-la', new Map([['u1', 'A']]))).toBe('u-la');
  });
});
