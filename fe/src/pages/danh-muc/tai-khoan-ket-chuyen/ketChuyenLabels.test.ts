import { describe, expect, it } from 'vitest';
import { goiYMaKetChuyen, NHAN_BEN, NHAN_LOAI } from './ketChuyenLabels';

describe('goiYMaKetChuyen', () => {
  it('ghép mã theo dạng {từ}-{đến}', () => {
    expect(goiYMaKetChuyen('511', '911')).toBe('511-911');
  });

  it('trả chuỗi rỗng khi thiếu một trong hai tài khoản', () => {
    expect(goiYMaKetChuyen('511', '')).toBe('');
    expect(goiYMaKetChuyen('', '911')).toBe('');
    expect(goiYMaKetChuyen(undefined, undefined)).toBe('');
  });

  it('bỏ khoảng trắng thừa', () => {
    expect(goiYMaKetChuyen(' 511 ', ' 911 ')).toBe('511-911');
  });
});

describe('nhãn hiển thị', () => {
  it('đúng nhãn tiếng Việt cho bên kết chuyển', () => {
    expect(NHAN_BEN.NO).toBe('Nợ');
    expect(NHAN_BEN.CO).toBe('Có');
    expect(NHAN_BEN.HAI_BEN).toBe('Hai bên');
  });

  it('đúng nhãn cho loại kết chuyển', () => {
    expect(NHAN_LOAI.XAC_DINH_KQKD).toBe('Kết chuyển xác định kết quả kinh doanh');
  });
});
