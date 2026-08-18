import { BangKeMuaVaoService } from './bang-ke-mua-vao.service';

type AnyRepo = { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };

function makeService(existing: unknown[] = []) {
  const repo: AnyRepo = {
    create: jest.fn((o) => ({ ...o })),
    save: jest.fn(async (e) => e),
    find: jest.fn(async () => existing),
    findOne: jest.fn(async () => existing[0]),
  };
  const tenantContext = { getCurrentTenantId: () => 'tenant-1' };
  const service = new BangKeMuaVaoService(repo as never, tenantContext as never);
  return { service, repo };
}

// findOne() dựng `new ObjectId(id)` nên id phải là 24 ký tự hex, không được đặt tùy.
const ID_HEX = '6650a1b2c3d4e5f60718293a';

const row = (over: Record<string, unknown> = {}) => ({
  ngayHoaDon: new Date('2026-06-01'),
  soHoaDon: '001',
  tenNguoiBan: 'Cty A',
  giaTriChuaThue: 1000,
  thueSuat: '10',
  tienThue: 100,
  tongThanhToan: 1100,
  isActive: true,
  ...over,
});

describe('findAllPaginated — lọc theo liên kết', () => {
  it('lienKet="chua" chỉ trả dòng chưa gắn chứng từ', async () => {
    const { service } = makeService([
      row({ soChungTu: 'PC0001' }),
      row({ soHoaDon: '002' }),
    ]);
    const res = await service.findAllPaginated({ lienKet: 'chua' } as never);
    expect(res.data.map((i) => i.soHoaDon)).toEqual(['002']);
  });

  it('soChungTu lọc đúng một chứng từ', async () => {
    const { service } = makeService([
      row({ soChungTu: 'PC0001' }),
      row({ soHoaDon: '002', soChungTu: 'PC0002' }),
    ]);
    const res = await service.findAllPaginated({ soChungTu: 'PC0002' } as never);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].soHoaDon).toBe('002');
  });
});

describe('findBySoChungTu', () => {
  it('gom hóa đơn theo từng số chứng từ được hỏi', async () => {
    const { service } = makeService([
      row({ soChungTu: 'PC0001' }),
      row({ soHoaDon: '002', soChungTu: 'PC0001' }),
      row({ soHoaDon: '003', soChungTu: 'PC0009' }),
    ]);
    const map = await service.findBySoChungTu(['PC0001']);
    expect(Object.keys(map)).toEqual(['PC0001']);
    expect(map['PC0001']).toHaveLength(2);
  });

  it('danh sách rỗng thì không gọi DB', async () => {
    const { service, repo } = makeService([]);
    expect(await service.findBySoChungTu([])).toEqual({});
    expect(repo.find).not.toHaveBeenCalled();
  });
});

describe('update — cờ chờ bổ sung', () => {
  it('điền giá trị vào dòng nháp thì cờ tự tắt', async () => {
    const { service } = makeService([row({ choBoSung: true, giaTriChuaThue: 0, tienThue: 0 })]);
    const saved = await service.update(ID_HEX, { giaTriChuaThue: 5_000_000 } as never);
    expect(saved.choBoSung).toBe(false);
  });

  it('sửa ghi chú mà chưa có số thì vẫn là chờ bổ sung', async () => {
    const { service } = makeService([row({ choBoSung: true, giaTriChuaThue: 0, tienThue: 0 })]);
    const saved = await service.update(ID_HEX, { ghiChu: 'chờ NCC gửi' } as never);
    expect(saved.choBoSung).toBe(true);
  });
});

describe('update — cập nhật từng phần không được ghi đè tiền đã nhập tay', () => {
  // Hóa đơn NCC tính thuế trên từng dòng hàng rồi cộng nên hay LỆCH công thức.
  // Số dưới đây cố tình lệch: 1.000.000 × 10% = 100.000 nhưng người dùng lưu 99.999.
  const lech = () =>
    row({ giaTriChuaThue: 1_000_000, thueSuat: '10', tienThue: 99_999, tongThanhToan: 1_099_999 });

  it('gắn chứng từ (chỉ gửi soChungTu) giữ nguyên tiền thuế lệch công thức', async () => {
    const { service } = makeService([lech()]);
    const saved = await service.update(ID_HEX, { soChungTu: 'PC0001' } as never);
    expect(saved.tienThue).toBe(99_999);
    expect(saved.tongThanhToan).toBe(1_099_999);
    expect(saved.soChungTu).toBe('PC0001');
  });

  it('gỡ liên kết (soChungTu rỗng) cũng giữ nguyên tiền thuế', async () => {
    const { service } = makeService([lech()]);
    const saved = await service.update(ID_HEX, { soChungTu: '' } as never);
    expect(saved.tienThue).toBe(99_999);
    expect(saved.tongThanhToan).toBe(1_099_999);
  });

  it('sửa ghi chú cũng không đụng tới tiền', async () => {
    const { service } = makeService([lech()]);
    const saved = await service.update(ID_HEX, { ghiChu: 'ghi chú' } as never);
    expect(saved.tienThue).toBe(99_999);
  });

  it('gửi giá trị chưa thuế thì VẪN tính lại theo công thức', async () => {
    const { service } = makeService([lech()]);
    const saved = await service.update(ID_HEX, { giaTriChuaThue: 2_000_000 } as never);
    expect(saved.tienThue).toBe(200_000);
    expect(saved.tongThanhToan).toBe(2_200_000);
  });

  it('gửi thẳng tiền thuế tay thì giữ đúng số gửi lên', async () => {
    const { service } = makeService([lech()]);
    const saved = await service.update(ID_HEX, {
      giaTriChuaThue: 2_000_000,
      tienThue: 199_998,
    } as never);
    expect(saved.tienThue).toBe(199_998);
  });
});
