import { describe, it, expect } from 'vitest';
import type { HoaDonBanRa } from '@/types';
import { gomSoHoaDonTheoHopDong } from './soHoaDon';

const hd = (p: Partial<HoaDonBanRa>): HoaDonBanRa =>
  ({ hopDongId: 'HD1', tong: 0, ...p }) as HoaDonBanRa;

describe('gomSoHoaDonTheoHopDong', () => {
  it('gom nhiều hóa đơn của cùng một hợp đồng', () => {
    const map = gomSoHoaDonTheoHopDong([
      hd({ hopDongId: 'HD1', soHoaDon: '0001' }),
      hd({ hopDongId: 'HD1', soHoaDon: '0002' }),
      hd({ hopDongId: 'HD2', soHoaDon: '0015' }),
    ]);

    expect(map.HD1).toEqual(['0001', '0002']);
    expect(map.HD2).toEqual(['0015']);
  });

  it('bỏ qua hóa đơn chưa có số hoặc chưa gắn hợp đồng', () => {
    const map = gomSoHoaDonTheoHopDong([
      hd({ hopDongId: 'HD1', soHoaDon: '' }),
      hd({ hopDongId: 'HD1', soHoaDon: '  ' }),
      hd({ hopDongId: 'HD1' }),
      hd({ hopDongId: '', soHoaDon: '0009' }),
      hd({ hopDongId: 'HD1', soHoaDon: '0003' }),
    ]);

    expect(map.HD1).toEqual(['0003']);
    expect(map['']).toBeUndefined();
  });

  it('khử trùng số hóa đơn lặp và cắt khoảng trắng thừa', () => {
    const map = gomSoHoaDonTheoHopDong([
      hd({ soHoaDon: ' 0001 ' }),
      hd({ soHoaDon: '0001' }),
    ]);

    expect(map.HD1).toEqual(['0001']);
  });

  it('giữ thứ tự xuất hiện, không sắp xếp lại', () => {
    const map = gomSoHoaDonTheoHopDong([
      hd({ soHoaDon: '0010' }),
      hd({ soHoaDon: '0002' }),
    ]);

    expect(map.HD1).toEqual(['0010', '0002']);
  });

  it('danh sách rỗng trả về map rỗng', () => {
    expect(gomSoHoaDonTheoHopDong([])).toEqual({});
  });
});
