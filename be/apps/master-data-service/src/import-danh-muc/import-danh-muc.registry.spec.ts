import { ImportDanhMucRegistry } from './import-danh-muc.registry';

describe('ImportDanhMucRegistry', () => {
  /** 21 service giả, chỉ cần có create() vì registry không gọi gì khác. */
  const fakes = Array.from({ length: 21 }, () => ({ create: jest.fn() }));
  const registry = new ImportDanhMucRegistry(
    ...(fakes as unknown as ConstructorParameters<
      typeof ImportDanhMucRegistry
    >),
  );

  it('đăng ký đủ 21 danh mục', () => {
    expect(registry.resources()).toHaveLength(21);
  });

  it('mỗi entry có đủ service, dtoClass và label', () => {
    for (const resource of registry.resources()) {
      const entry = registry.get(resource)!;
      expect(entry.service).toBeDefined();
      expect(typeof entry.dtoClass).toBe('function');
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it('resource không đăng ký trả về undefined', () => {
    expect(registry.get('khong-ton-tai')).toBeUndefined();
  });

  it('ghép đúng service theo thứ tự tham số constructor', () => {
    // tham số đầu tiên là TaiKhoanService, cuối cùng là HoSoChungTuService
    expect(registry.get('tai-khoan')!.service).toBe(fakes[0]);
    expect(registry.get('ho-so-chung-tu')!.service).toBe(fakes[20]);
  });
});
