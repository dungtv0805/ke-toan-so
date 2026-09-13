import { describe, it, expect, vi, afterEach } from 'vitest';
import { kqkdKeHoachService } from './kqkdKeHoachService';

const bayGet = () =>
  vi
    // `get` là method protected của ServiceBase — test chỉ quan tâm tham số gửi đi.
    .spyOn(kqkdKeHoachService as unknown as { get: (o: unknown) => Promise<unknown> }, 'get')
    .mockResolvedValue({ nam: 2026, dong: [] });

const thamSo = (spy: ReturnType<typeof bayGet>) =>
  (spy.mock.calls[0][0] as { params: Record<string, unknown> }).params;

describe('kqkdKeHoachService.layBaoCao', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gửi loaiKeHoach và phiên bản khi xem số kế hoạch', async () => {
    const spy = bayGet();
    await kqkdKeHoachService.layBaoCao(2026, 'KE_HOACH', 'KH gốc');
    expect(thamSo(spy)).toEqual({
      nam: 2026,
      loaiKeHoach: 'KE_HOACH',
      phienBan: 'KH gốc',
    });
  });

  it('nguồn THỰC HIỆN không gửi phiên bản — chứng từ thực tế không có phiên bản', async () => {
    const spy = bayGet();
    await kqkdKeHoachService.layBaoCao(2026, 'THUC_HIEN', 'KH gốc');
    expect(thamSo(spy)).toEqual({ nam: 2026, loaiKeHoach: 'THUC_HIEN' });
  });

  it('chuẩn hoá báo cáo rỗng về đủ bốn dãy 12 tháng', async () => {
    bayGet();
    const bc = await kqkdKeHoachService.layBaoCao(2026, 'THUC_HIEN');
    expect(bc.doanhThuThuanThang).toHaveLength(12);
    expect(bc.dinhPhiThang).toHaveLength(12);
    expect(bc.bienPhiThang).toHaveLength(12);
    expect(bc.dong).toEqual([]);
  });
});
