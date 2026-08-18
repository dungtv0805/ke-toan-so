import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  THUE_SUAT_OPTIONS,
  tinhTienThue,
  bangKeMuaVaoService,
  bangKeBanRaService,
} from './taxService';

describe('tinhTienThue', () => {
  it('tính theo từng mức thuế suất', () => {
    expect(tinhTienThue(100_000_000, '10')).toBe(10_000_000);
    expect(tinhTienThue(100_000_000, '8')).toBe(8_000_000);
    expect(tinhTienThue(100_000_000, '5')).toBe(5_000_000);
    expect(tinhTienThue(100_000_000, '0')).toBe(0);
  });

  it('không chịu thuế / không kê khai → 0', () => {
    expect(tinhTienThue(100_000_000, 'KCT')).toBe(0);
    expect(tinhTienThue(100_000_000, 'KKKT')).toBe(0);
  });

  it('làm tròn về đồng', () => {
    expect(tinhTienThue(1_234_567, '10')).toBe(123_457);
    expect(tinhTienThue(1_234_567, '8')).toBe(98_765);
  });

  it('thiếu tiền hàng hoặc thuế suất → 0, không NaN', () => {
    expect(tinhTienThue(undefined, '10')).toBe(0);
    expect(tinhTienThue(100_000_000, undefined)).toBe(0);
    expect(tinhTienThue(100_000_000, 'suat-la')).toBe(0);
  });

  it('mọi lựa chọn trong THUE_SUAT_OPTIONS đều tính được', () => {
    THUE_SUAT_OPTIONS.forEach((o) => {
      expect(Number.isFinite(tinhTienThue(1_000_000, o.value))).toBe(true);
    });
  });
});

describe('layTheoSoChungTu — map _id → id', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // BaseEntity.id phía BE là getter trên prototype → JSON.stringify bỏ qua, response
  // CHỈ có _id. Quên map thì id undefined và mọi thao tác gỡ/gắn liên kết gọi
  // `PUT /tax/bang-ke-mua-vao/undefined` → 500, còn luồng lưu chứng từ tạo dòng trùng.
  it('bản ghi chỉ có _id vẫn ra id đúng giá trị', async () => {
    vi.spyOn(bangKeMuaVaoService as never as { get: () => unknown }, 'get').mockResolvedValue({
      PC0001: [
        { _id: '6650a1b2c3d4e5f60718293a', soHoaDon: '001' },
        { _id: '6650a1b2c3d4e5f60718293b', soHoaDon: '002' },
      ],
    } as never);

    const map = await bangKeMuaVaoService.layTheoSoChungTu(['PC0001']);
    expect(map.PC0001.map((r) => r.id)).toEqual([
      '6650a1b2c3d4e5f60718293a',
      '6650a1b2c3d4e5f60718293b',
    ]);
  });

  it('bảng kê bán ra cũng map, và id sẵn có thì giữ nguyên', async () => {
    vi.spyOn(bangKeBanRaService as never as { get: () => unknown }, 'get').mockResolvedValue({
      PT0001: [{ id: 'da-co-id', soHoaDon: '009' }],
    } as never);

    const map = await bangKeBanRaService.layTheoSoChungTu(['PT0001']);
    expect(map.PT0001[0].id).toBe('da-co-id');
  });

  it('danh sách rỗng → không gọi API', async () => {
    const spy = vi
      .spyOn(bangKeMuaVaoService as never as { get: () => unknown }, 'get')
      .mockResolvedValue({} as never);
    expect(await bangKeMuaVaoService.layTheoSoChungTu([])).toEqual({});
    expect(spy).not.toHaveBeenCalled();
  });

  it('response rỗng/null không làm vỡ', async () => {
    vi.spyOn(bangKeMuaVaoService as never as { get: () => unknown }, 'get').mockResolvedValue(
      null as never,
    );
    expect(await bangKeMuaVaoService.layTheoSoChungTu(['PC0001'])).toEqual({});
  });
});

describe('timTheoSoHoaDon — chỉ nhận khớp tuyệt đối', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bỏ kết quả chỉ "chứa" số hóa đơn', async () => {
    vi.spyOn(bangKeMuaVaoService as never as { get: () => unknown }, 'get').mockResolvedValue({
      data: [
        { _id: 'a', soHoaDon: '123' },
        { _id: 'b', soHoaDon: '1234' },
        { _id: 'c', soHoaDon: ' 123 ' },
      ],
      meta: { total: 3, page: 1, limit: 100, totalPages: 1 },
    } as never);

    const res = await bangKeMuaVaoService.timTheoSoHoaDon('123');
    expect(res.map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('chuỗi rỗng → không gọi API', async () => {
    const spy = vi
      .spyOn(bangKeMuaVaoService as never as { get: () => unknown }, 'get')
      .mockResolvedValue({} as never);
    expect(await bangKeMuaVaoService.timTheoSoHoaDon('  ')).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});
