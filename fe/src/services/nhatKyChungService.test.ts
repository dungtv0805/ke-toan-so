import { describe, it, expect, vi, afterEach } from 'vitest';
import { nhatKyChungService } from './nhatKyChungService';
import type { NhatKyChungPaginatedResponse } from './nhatKyChungService';
import type { NhatKyChung } from '@/types';

function makeEntry(id: string, soPhieu: string): NhatKyChung {
  return {
    id,
    ngay: '2026-01-01T00:00:00.000Z',
    ngayGhiSo: '2026-01-01T00:00:00.000Z',
    soPhieu,
    loaiChungTu: 'Chứng từ khác',
    dienGiai: '',
    taiKhoanNo: '111',
    taiKhoanCo: '331',
    soTien: 0,
  } as NhatKyChung;
}

function page(
  data: NhatKyChung[],
  meta: { total: number; page: number; limit: number; totalPages: number },
): NhatKyChungPaginatedResponse {
  return { data, meta };
}

describe('nhatKyChungService.getBySoPhieu', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bản ghi khớp số phiếu nằm ở TRANG THỨ HAI vẫn được tìm ra (không gỡ liên kết sớm)', async () => {
    // Trang 1: 100 dòng "nhiễu" (regex search trùng nội dung/đối tượng nhưng không
    // trùng soPhieu) — mô phỏng đúng lỗi thật: nếu chỉ đọc trang đầu, bản ghi thật
    // ở trang 2 bị bỏ sót và getBySoPhieu trả rỗng dù bút toán vẫn còn.
    const noise = Array.from({ length: 100 }, (_, i) => makeEntry(`noise-${i}`, `KHAC${i}`));
    const real = makeEntry('e-real', 'PT001/2026');

    const spy = vi
      .spyOn(nhatKyChungService, 'getEntries')
      .mockImplementationOnce(async () =>
        page(noise, { total: 101, page: 1, limit: 100, totalPages: 2 }),
      )
      .mockImplementationOnce(async () =>
        page([real], { total: 101, page: 2, limit: 100, totalPages: 2 }),
      );

    const result = await nhatKyChungService.getBySoPhieu('PT001/2026');

    expect(spy).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e-real');
  });

  it('không có bản ghi nào khớp → trả mảng rỗng', async () => {
    vi.spyOn(nhatKyChungService, 'getEntries').mockImplementationOnce(async () =>
      page([makeEntry('e1', 'KHAC001')], { total: 1, page: 1, limit: 100, totalPages: 1 }),
    );

    const result = await nhatKyChungService.getBySoPhieu('PT001/2026');

    expect(result).toEqual([]);
  });

  it('chỉ một trang thì không gọi thêm lần nữa', async () => {
    const spy = vi.spyOn(nhatKyChungService, 'getEntries').mockImplementationOnce(async () =>
      page([makeEntry('e1', 'PT001/2026')], { total: 1, page: 1, limit: 100, totalPages: 1 }),
    );

    const result = await nhatKyChungService.getBySoPhieu('PT001/2026');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });
});
