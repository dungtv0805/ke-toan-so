import { describe, it, expect } from 'vitest';
import { diTruCot } from './diTruCot';
import { readSavedKeys, saveVisibleKeys } from './columnVisibility';
import type { StorageLike } from './tableStorage';

const khoGia = (): StorageLike & { kho: Record<string, string> } => {
  const kho: Record<string, string> = {};
  return {
    kho,
    getItem: (k: string) => kho[k] ?? null,
    setItem: (k: string, v: string) => { kho[k] = v; },
  };
};

const CU = 'nkc.entryList.v3';
const MOI = 'nkc.entryList.v4';

describe('diTruCot — thêm cột mới mà không xoá lựa chọn cũ của người dùng', () => {
  it('người ĐÃ chọn cột: giữ nguyên lựa chọn và THÊM cột mới vào', () => {
    const s = khoGia();
    saveVisibleKeys(CU, ['ngay', 'dienGiai', 'soTien'], s);

    diTruCot(CU, MOI, ['pheDuyet'], s);

    expect(readSavedKeys(MOI, s)).toEqual(['ngay', 'dienGiai', 'soTien', 'pheDuyet']);
  });

  it('người CHƯA từng mở bộ chọn cột: không tạo gì — họ vẫn đang ở chế độ hiện tất cả', () => {
    const s = khoGia();
    diTruCot(CU, MOI, ['pheDuyet'], s);
    // Ghi một mảng vào đây là biến "hiện tất cả" thành "chỉ hiện mấy cột này",
    // tức là tự tay ẩn mất những cột họ đang xem.
    expect(readSavedKeys(MOI, s)).toBeNull();
  });

  it('chạy lại lần hai không nhân đôi cột mới', () => {
    const s = khoGia();
    saveVisibleKeys(CU, ['ngay'], s);
    diTruCot(CU, MOI, ['pheDuyet'], s);
    diTruCot(CU, MOI, ['pheDuyet'], s);
    expect(readSavedKeys(MOI, s)).toEqual(['ngay', 'pheDuyet']);
  });

  it('đã có lựa chọn ở khoá MỚI thì không đụng vào — người dùng đã tự chỉnh sau khi nâng cấp', () => {
    const s = khoGia();
    saveVisibleKeys(CU, ['ngay', 'dienGiai'], s);
    saveVisibleKeys(MOI, ['ngay'], s);   // họ vừa tự tắt bớt, kể cả tắt cả cột mới
    diTruCot(CU, MOI, ['pheDuyet'], s);
    expect(readSavedKeys(MOI, s)).toEqual(['ngay']);
  });

  it('người cố ý ẩn HẾT cột: vẫn được thêm cột mới chứ không bị coi là chưa có lựa chọn', () => {
    const s = khoGia();
    saveVisibleKeys(CU, [], s);
    diTruCot(CU, MOI, ['pheDuyet'], s);
    expect(readSavedKeys(MOI, s)).toEqual(['pheDuyet']);
  });

  it('cột mới đã nằm sẵn trong lựa chọn cũ thì không thêm lần nữa', () => {
    const s = khoGia();
    saveVisibleKeys(CU, ['ngay', 'pheDuyet'], s);
    diTruCot(CU, MOI, ['pheDuyet'], s);
    expect(readSavedKeys(MOI, s)).toEqual(['ngay', 'pheDuyet']);
  });

  it('thêm được nhiều cột một lượt', () => {
    const s = khoGia();
    saveVisibleKeys(CU, ['ngay'], s);
    diTruCot(CU, MOI, ['pheDuyet', 'hoSo'], s);
    expect(readSavedKeys(MOI, s)).toEqual(['ngay', 'pheDuyet', 'hoSo']);
  });

  it('localStorage hỏng/bị chặn thì im lặng bỏ qua, không ném lỗi làm trắng trang', () => {
    const vo: StorageLike = {
      getItem: () => { throw new Error('bị chặn'); },
      setItem: () => { throw new Error('bị chặn'); },
    };
    expect(() => diTruCot(CU, MOI, ['pheDuyet'], vo)).not.toThrow();
  });
});
