import { EntitlementService } from './entitlement.service';

function makeDataSource(opts: {
  menuCatalog?: any[];
  linhVuc?: any[];
  tenant?: any;
}) {
  const repos: Record<string, any> = {
    MenuCatalog: { find: jest.fn().mockResolvedValue(opts.menuCatalog ?? []) },
    LinhVuc: { find: jest.fn().mockResolvedValue(opts.linhVuc ?? []) },
    Tenant: { findOne: jest.fn().mockResolvedValue(opts.tenant ?? null) },
  };
  return {
    getRepository: (entity: { name: string }) => repos[entity.name],
  } as any;
}

describe('EntitlementService', () => {
  const menuCatalog = [
    { menuKey: '/danh-muc/hang-hoa-vat-tu', apiPrefixes: ['/master-data/hang-hoa-vat-tu'] },
    { menuKey: '/kho/nhap-kho', apiPrefixes: ['/kho/phieu'] },
    { menuKey: '/chung-tu/phieu-nhap', apiPrefixes: [] },
  ];
  const linhVuc = [
    { code: 'KE_TOAN', isActive: true, menuKeys: [] },
    { code: 'KHO', isActive: true, menuKeys: ['/danh-muc/hang-hoa-vat-tu', '/kho/nhap-kho'] },
  ];

  it('trả null khi path không khớp apiPrefix nào', async () => {
    const svc = new EntitlementService(makeDataSource({ menuCatalog, linhVuc }));
    expect(await svc.resolveOwningCodes('/master-data/tai-khoan')).toBeNull();
  });

  it('không nhầm prefix anh em (kho vs khoan-muc)', async () => {
    const svc = new EntitlementService(makeDataSource({
      menuCatalog: [{ menuKey: '/danh-muc/kho', apiPrefixes: ['/master-data/kho'] }],
      linhVuc: [{ code: 'KHO', isActive: true, menuKeys: ['/danh-muc/kho'] }],
    }));
    expect(await svc.resolveOwningCodes('/master-data/khoan-muc')).toBeNull();
  });

  it('khớp prefix + path con → trả code lĩnh vực sở hữu', async () => {
    const svc = new EntitlementService(makeDataSource({ menuCatalog, linhVuc }));
    expect(await svc.resolveOwningCodes('/kho/phieu/123')).toEqual(['KHO']);
  });

  it('menu chưa gán lĩnh vực nào → mặc định KE_TOAN', async () => {
    const svc = new EntitlementService(makeDataSource({
      menuCatalog: [{ menuKey: '/danh-muc/x', apiPrefixes: ['/master-data/x'] }],
      linhVuc,
    }));
    expect(await svc.resolveOwningCodes('/master-data/x')).toEqual(['KE_TOAN']);
  });

  it('apiPrefixes rỗng (ComingSoon) → không enforce (null)', async () => {
    const svc = new EntitlementService(makeDataSource({ menuCatalog, linhVuc }));
    expect(await svc.resolveOwningCodes('/voucher/phieu-nhap')).toBeNull();
  });

  it('getTenantModules trả modules của tenant', async () => {
    const svc = new EntitlementService(makeDataSource({
      tenant: { modules: ['KE_TOAN', 'KHO'] },
    }));
    expect(await svc.getTenantModules('507f1f77bcf86cd799439011')).toEqual(['KE_TOAN', 'KHO']);
  });

  it('getTenantModules fallback KE_TOAN khi rỗng/null', async () => {
    const svc = new EntitlementService(makeDataSource({ tenant: { modules: [] } }));
    expect(await svc.getTenantModules('507f1f77bcf86cd799439011')).toEqual(['KE_TOAN']);
  });
});
