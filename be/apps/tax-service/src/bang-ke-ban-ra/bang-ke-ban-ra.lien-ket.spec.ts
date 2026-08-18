import { BangKeBanRaService } from './bang-ke-ban-ra.service';

type AnyRepo = { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };

function makeService(existing: unknown[] = []) {
  const repo: AnyRepo = {
    create: jest.fn((o) => ({ ...o })),
    save: jest.fn(async (e) => e),
    find: jest.fn(async () => existing),
    findOne: jest.fn(async () => existing[0]),
  };
  const tenantContext = { getCurrentTenantId: () => 'tenant-1' };
  const service = new BangKeBanRaService(repo as never, tenantContext as never);
  return { service, repo };
}

// findOne() dựng `new ObjectId(id)` nên id phải là 24 ký tự hex, không được đặt tùy.
const ID_HEX = '6650a1b2c3d4e5f60718293a';

const row = (over: Record<string, unknown> = {}) => ({
  ngayHoaDon: new Date('2026-06-01'),
  soHoaDon: '001',
  tenNguoiMua: 'Cty B',
  giaTriChuaThue: 1_000_000,
  thueSuat: '10',
  tienThue: 99_999,
  tongThanhToan: 1_099_999,
  isActive: true,
  ...over,
});

describe('bán ra — update từng phần không ghi đè tiền đã nhập tay', () => {
  it('gắn chứng từ (chỉ gửi soChungTu) giữ nguyên tiền thuế lệch công thức', async () => {
    const { service } = makeService([row()]);
    const saved = await service.update(ID_HEX, { soChungTu: 'PT0001' } as never);
    expect(saved.tienThue).toBe(99_999);
    expect(saved.tongThanhToan).toBe(1_099_999);
    expect(saved.soChungTu).toBe('PT0001');
  });

  it('gỡ liên kết (soChungTu rỗng) cũng giữ nguyên tiền thuế', async () => {
    const { service } = makeService([row()]);
    const saved = await service.update(ID_HEX, { soChungTu: '' } as never);
    expect(saved.tienThue).toBe(99_999);
  });

  it('gửi giá trị chưa thuế thì VẪN tính lại theo công thức', async () => {
    const { service } = makeService([row()]);
    const saved = await service.update(ID_HEX, { giaTriChuaThue: 2_000_000 } as never);
    expect(saved.tienThue).toBe(200_000);
    expect(saved.tongThanhToan).toBe(2_200_000);
  });

  it('điền số vào dòng nháp thì cờ chờ bổ sung tự tắt', async () => {
    const { service } = makeService([
      row({ choBoSung: true, giaTriChuaThue: 0, tienThue: 0, tongThanhToan: 0 }),
    ]);
    const saved = await service.update(ID_HEX, { giaTriChuaThue: 5_000_000 } as never);
    expect(saved.choBoSung).toBe(false);
  });

  it('gắn chứng từ vào dòng nháp KHÔNG làm tắt cờ chờ bổ sung', async () => {
    const { service } = makeService([
      row({ choBoSung: true, giaTriChuaThue: 0, tienThue: 0, tongThanhToan: 0 }),
    ]);
    const saved = await service.update(ID_HEX, { soChungTu: 'PT0001' } as never);
    expect(saved.choBoSung).toBe(true);
  });
});
