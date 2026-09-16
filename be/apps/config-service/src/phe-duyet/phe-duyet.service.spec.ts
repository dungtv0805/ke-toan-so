import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { QuyTrinhPheDuyet } from '@app/entities';
import { PheDuyetService } from './phe-duyet.service';

/**
 * Điều kiện nghiệm thu mục 16 — những điều kiện KHÔNG kiểm được bằng helper
 * thuần vì chúng phụ thuộc vào "tôi là ai" và "ai giữ vị trí nào".
 */

/** `chiTiet()` kiểm ObjectId.isValid nên id trong test phải là 24 ký tự hex thật. */
const ID_QT = '000000000000000000000001';
const ID_QT_CU = '000000000000000000000002';

const CAU_HINH_3_CAP = {
  buoc: [
    { thuTu: 1, viTriTen: 'Phụ trách phòng ban', batBuoc: true },
    { thuTu: 2, viTriTen: 'Kiểm soát kế toán', batBuoc: true },
    { thuTu: 3, viTriTen: 'Giám đốc', batBuoc: true },
  ],
};

interface Kho {
  quyTrinh: Partial<QuyTrinhPheDuyet>[];
  thongBao: { userId: string; loai: string }[];
  daGhiTrangThai: { doiTuongId: string; trangThai: string }[];
}

function dungService(opts: {
  userId: string;
  viTriCuaToi: string[];
  nguoiTheoViTri?: Record<string, { userId: string }[]>;
  cauHinh?: { buoc: { thuTu: number; viTriTen: string; batBuoc: boolean }[] } | null;
  quyTrinh?: Partial<QuyTrinhPheDuyet>[];
}) {
  const kho: Kho = {
    quyTrinh: opts.quyTrinh ?? [],
    thongBao: [],
    daGhiTrangThai: [],
  };

  const nguoiTheoViTri =
    opts.nguoiTheoViTri ??
    Object.fromEntries(
      CAU_HINH_3_CAP.buoc.map((b) => [b.viTriTen, [{ userId: `u-${b.thuTu}` }]]),
    );

  const quyTrinhRepo = {
    create: (x: Partial<QuyTrinhPheDuyet>) => ({ ...x }),
    save: async (x: Partial<QuyTrinhPheDuyet>) => {
      const i = kho.quyTrinh.findIndex((q) => q.id === x.id);
      const luu = { id: x.id ?? ID_QT, ...x };
      if (i >= 0) kho.quyTrinh[i] = luu;
      else kho.quyTrinh.push(luu);
      return luu;
    },
    find: async () => kho.quyTrinh.filter((q) => q.trangThai === 'CHO_PHE_DUYET'),
    findOne: async ({ where }: { where: Record<string, unknown> }) =>
      kho.quyTrinh.find(
        (q) => q.doiTuongId === where.doiTuongId || q.id === String(where._id),
      ) ?? null,
  };

  const service = new PheDuyetService(
    quyTrinhRepo as never,
    { create: (x: unknown) => x, save: async (x: unknown) => x } as never,
    {
      // `??` sẽ nuốt mất `cauHinh: null` (trường hợp "chưa thiết lập luồng"),
      // nên phải phân biệt "không truyền" với "truyền null".
      tim: async () =>
        'cauHinh' in opts ? opts.cauHinh : CAU_HINH_3_CAP,
    } as never,
    {
      nguoiGiuViTri: async (vt: string) => nguoiTheoViTri[vt] ?? [],
      viTriCuaNguoi: async () => opts.viTriCuaToi,
    } as never,
    {
      tao: async (tb: { userId: string; loai: string }) => kho.thongBao.push(tb),
      taoNhieu: async (ds: { userId: string; loai: string }[]) =>
        ds.forEach((tb) => kho.thongBao.push(tb)),
    } as never,
    {
      ghi: async (_l: string, doiTuongId: string, trangThai: string) =>
        kho.daGhiTrangThai.push({ doiTuongId, trangThai }),
    } as never,
    {
      getCurrentUserId: () => opts.userId,
      getCurrentEmail: () => `${opts.userId}@x.vn`,
    } as never,
  );

  return { service, kho };
}

describe('guiDuyet — nghiệm thu 3: chỉ cấp đang đến lượt được báo', () => {
  const dto = {
    loaiDoiTuong: 'CHUNG_TU' as const,
    doiTuongId: 'ct1',
    loaiNghiepVuMa: 'TT_NCC',
  };

  it('chỉ người giữ vị trí CẤP 1 nhận thông báo, cấp 2 và 3 không nhận gì', async () => {
    const { service, kho } = dungService({ userId: 'nguoi-lap', viTriCuaToi: [] });
    await service.guiDuyet(dto);

    expect(kho.thongBao.map((t) => t.userId)).toEqual(['u-1']);
    expect(kho.thongBao.every((t) => t.loai === 'DEN_LUOT_DUYET')).toBe(true);
  });

  it('một vị trí có nhiều người thì cả nhóm cùng nhận — luồng không đứng khi ai đó nghỉ', async () => {
    const { service, kho } = dungService({
      userId: 'nguoi-lap',
      viTriCuaToi: [],
      nguoiTheoViTri: {
        'Phụ trách phòng ban': [{ userId: 'a' }, { userId: 'b' }],
        'Kiểm soát kế toán': [{ userId: 'c' }],
        'Giám đốc': [{ userId: 'd' }],
      },
    });
    await service.guiDuyet(dto);
    expect(kho.thongBao.map((t) => t.userId).sort()).toEqual(['a', 'b']);
  });

  it('loại nghiệp vụ chưa thiết lập luồng thì báo lỗi rõ, không tạo quy trình rỗng', async () => {
    const { service, kho } = dungService({
      userId: 'x',
      viTriCuaToi: [],
      cauHinh: null,
    });
    await expect(service.guiDuyet(dto)).rejects.toThrow(
      /chưa được thiết lập luồng phê duyệt/i,
    );
    expect(kho.quyTrinh).toHaveLength(0);
  });

  it('có cấp chưa ai đảm nhiệm thì CHẶN ngay, không để chứng từ treo vô hạn', async () => {
    const { service } = dungService({
      userId: 'x',
      viTriCuaToi: [],
      nguoiTheoViTri: {
        'Phụ trách phòng ban': [{ userId: 'a' }],
        'Kiểm soát kế toán': [],
        'Giám đốc': [{ userId: 'd' }],
      },
    });
    await expect(service.guiDuyet(dto)).rejects.toThrow(/Kiểm soát kế toán/);
  });

  it('gửi duyệt ghi trạng thái CHO_PHE_DUYET xuống chứng từ gốc — mục 12', async () => {
    const { service, kho } = dungService({ userId: 'x', viTriCuaToi: [] });
    await service.guiDuyet(dto);
    expect(kho.daGhiTrangThai).toContainEqual({
      doiTuongId: 'ct1',
      trangThai: 'CHO_PHE_DUYET',
    });
  });

  it('không cho gửi lại khi đang chờ duyệt', async () => {
    const { service } = dungService({
      userId: 'x',
      viTriCuaToi: [],
      quyTrinh: [{ id: ID_QT, doiTuongId: 'ct1', trangThai: 'CHO_PHE_DUYET' }],
    });
    await expect(service.guiDuyet(dto)).rejects.toThrow(BadRequestException);
  });
});

describe('choToiDuyet — nghiệm thu 3 và 4: cấp sau không thấy khi cấp trước chưa duyệt', () => {
  const dangChoCap1: Partial<QuyTrinhPheDuyet> = {
    id: ID_QT,
    doiTuongId: 'ct1',
    trangThai: 'CHO_PHE_DUYET',
    buoc: [
      { thuTu: 1, viTriTen: 'Phụ trách phòng ban', batBuoc: true, trangThai: 'DANG_CHO', batDauCho: new Date('2026-09-10T09:15:00Z') },
      { thuTu: 2, viTriTen: 'Kiểm soát kế toán', batBuoc: true, trangThai: 'CHUA_DEN_LUOT' },
      { thuTu: 3, viTriTen: 'Giám đốc', batBuoc: true, trangThai: 'CHUA_DEN_LUOT' },
    ] as never,
  };

  it('người giữ cấp 1 THẤY nghiệp vụ', async () => {
    const { service } = dungService({
      userId: 'u-1',
      viTriCuaToi: ['Phụ trách phòng ban'],
      quyTrinh: [dangChoCap1],
    });
    const ds = await service.choToiDuyet();
    expect(ds.map((x) => x.id)).toEqual([ID_QT]);
    expect(ds[0].viTriCanDuyet).toBe('Phụ trách phòng ban');
  });

  it('người giữ cấp 2 KHÔNG thấy gì cả — đây là yêu cầu cốt lõi mục 6', async () => {
    const { service } = dungService({
      userId: 'u-2',
      viTriCuaToi: ['Kiểm soát kế toán'],
      quyTrinh: [dangChoCap1],
    });
    expect(await service.choToiDuyet()).toEqual([]);
  });

  it('giám đốc kiêm kiểm soát vẫn không thấy khi mới ở cấp 1', async () => {
    const { service } = dungService({
      userId: 'u-3',
      viTriCuaToi: ['Kiểm soát kế toán', 'Giám đốc'],
      quyTrinh: [dangChoCap1],
    });
    expect(await service.choToiDuyet()).toEqual([]);
  });

  it('người không giữ vị trí nào thì danh sách rỗng, không lộ nghiệp vụ nào', async () => {
    const { service } = dungService({
      userId: 'ke-toan-vien',
      viTriCuaToi: [],
      quyTrinh: [dangChoCap1],
    });
    expect(await service.choToiDuyet()).toEqual([]);
  });

  it('nghiệp vụ đã xong không còn nằm trong danh sách chờ', async () => {
    const { service } = dungService({
      userId: 'u-1',
      viTriCuaToi: ['Phụ trách phòng ban'],
      quyTrinh: [{ ...dangChoCap1, trangThai: 'CHINH_THUC' }],
    });
    expect(await service.choToiDuyet()).toEqual([]);
  });

  it('xếp nghiệp vụ chờ lâu nhất lên đầu', async () => {
    const cu = {
      ...dangChoCap1,
      id: ID_QT_CU,
      buoc: [
        { thuTu: 1, viTriTen: 'Phụ trách phòng ban', batBuoc: true, trangThai: 'DANG_CHO', batDauCho: new Date('2020-01-01T00:00:00Z') },
      ] as never,
    };
    const { service } = dungService({
      userId: 'u-1',
      viTriCuaToi: ['Phụ trách phòng ban'],
      quyTrinh: [dangChoCap1, cu],
    });
    expect((await service.choToiDuyet()).map((x) => x.id)).toEqual([ID_QT_CU, ID_QT]);
  });
});

describe('duyet / traLai — nghiệm thu 4, 5, 7', () => {
  const moi = (): Partial<QuyTrinhPheDuyet> => ({
    id: ID_QT,
    doiTuongId: 'ct1',
    loaiDoiTuong: 'CHUNG_TU',
    loaiNghiepVuMa: 'TT_NCC',
    trangThai: 'CHO_PHE_DUYET',
    phienBan: 1,
    buoc: [
      { thuTu: 1, viTriTen: 'Phụ trách phòng ban', batBuoc: true, trangThai: 'DANG_CHO', batDauCho: new Date('2026-09-10T09:15:00Z') },
      { thuTu: 2, viTriTen: 'Kiểm soát kế toán', batBuoc: true, trangThai: 'CHUA_DEN_LUOT' },
    ] as never,
  });

  it('người KHÔNG giữ vị trí đang chờ thì bị từ chối, dù có quyền vào màn hình', async () => {
    const { service } = dungService({
      userId: 'u-2',
      viTriCuaToi: ['Kiểm soát kế toán'],
      quyTrinh: [moi()],
    });
    await expect(service.duyet(ID_QT, {})).rejects.toThrow(ForbiddenException);
  });

  it('duyệt cấp 1 xong thì cấp 2 mới nhận thông báo', async () => {
    const { service, kho } = dungService({
      userId: 'u-1',
      viTriCuaToi: ['Phụ trách phòng ban'],
      quyTrinh: [moi()],
    });
    await service.duyet(ID_QT, { yKien: 'ok' });
    expect(kho.thongBao.map((t) => t.userId)).toEqual(['u-2']);
  });

  it('duyệt cấp CUỐI thì chứng từ thành Chính thức và người lập được báo', async () => {
    const q = moi();
    q.nguoiLapId = 'nguoi-lap';
    q.buoc = [
      { thuTu: 1, viTriTen: 'Phụ trách phòng ban', batBuoc: true, trangThai: 'DANG_CHO', batDauCho: new Date() },
    ] as never;

    const { service, kho } = dungService({
      userId: 'u-1',
      viTriCuaToi: ['Phụ trách phòng ban'],
      quyTrinh: [q],
    });
    await service.duyet(ID_QT, {});

    expect(kho.daGhiTrangThai.at(-1)).toEqual({
      doiTuongId: 'ct1',
      trangThai: 'CHINH_THUC',
    });
    expect(kho.thongBao.at(-1)).toMatchObject({
      userId: 'nguoi-lap',
      loai: 'HOAN_THANH',
    });
  });

  it('trả lại mà không ghi lý do thì bị chặn — mục 14 đòi lưu ý kiến', async () => {
    const { service } = dungService({
      userId: 'u-1',
      viTriCuaToi: ['Phụ trách phòng ban'],
      quyTrinh: [moi()],
    });
    await expect(service.traLai(ID_QT, { yKien: '  ' })).rejects.toThrow(/lý do/i);
  });

  it('trả lại đưa về Yêu cầu bổ sung và báo NGƯỜI LẬP, không báo cấp sau', async () => {
    const q = moi();
    q.nguoiLapId = 'nguoi-lap';
    const { service, kho } = dungService({
      userId: 'u-1',
      viTriCuaToi: ['Phụ trách phòng ban'],
      quyTrinh: [q],
    });
    await service.traLai(ID_QT, { yKien: 'Thiếu hóa đơn' });

    expect(kho.daGhiTrangThai.at(-1)?.trangThai).toBe('YEU_CAU_BO_SUNG');
    expect(kho.thongBao).toHaveLength(1);
    expect(kho.thongBao[0]).toMatchObject({ userId: 'nguoi-lap', loai: 'BI_TRA_LAI' });
  });

  it('từ chối đưa về Từ chối — dữ liệu không vào báo cáo chính thức (mục 12)', async () => {
    const { service, kho } = dungService({
      userId: 'u-1',
      viTriCuaToi: ['Phụ trách phòng ban'],
      quyTrinh: [moi()],
    });
    await service.tuChoi(ID_QT, { yKien: 'Không hợp lệ' });
    expect(kho.daGhiTrangThai.at(-1)?.trangThai).toBe('TU_CHOI');
  });
});

describe('sauKhiSua — nghiệm thu 8: sửa trọng yếu thì phải duyệt lại', () => {
  const daXong = (): Partial<QuyTrinhPheDuyet> => ({
    id: ID_QT,
    doiTuongId: 'ct1',
    loaiDoiTuong: 'CHUNG_TU',
    loaiNghiepVuMa: 'TT_NCC',
    trangThai: 'CHINH_THUC',
    phienBan: 1,
    nguoiLapId: 'nguoi-lap',
    buoc: [
      { thuTu: 1, viTriTen: 'Phụ trách phòng ban', batBuoc: true, trangThai: 'DA_DUYET', nguoiXuLyId: 'u-1', thoiDiemXuLy: new Date() },
      { thuTu: 2, viTriTen: 'Kiểm soát kế toán', batBuoc: true, trangThai: 'DA_DUYET', nguoiXuLyId: 'u-2', thoiDiemXuLy: new Date() },
    ] as never,
  });

  const goc = { soTien: 100, noiDung: 'A', ngay: '2026-09-10T00:00:00.000Z', danhMuc: {} };

  it('đổi số tiền: tăng phiên bản, xoá phê duyệt cũ, quay về chờ cấp 1', async () => {
    const { service, kho } = dungService({
      userId: 'ke-toan',
      viTriCuaToi: [],
      quyTrinh: [daXong()],
    });

    const kq = await service.sauKhiSua('CHUNG_TU', 'ct1', goc, { ...goc, soTien: 200 });

    expect(kq).toEqual({ phaiDuyetLai: true, truongDaDoi: ['soTien'] });
    const sau = kho.quyTrinh[0];
    expect(sau.phienBan).toBe(2);
    expect(sau.buoc?.every((b) => b.nguoiXuLyId === undefined)).toBe(true);
    expect(kho.daGhiTrangThai.at(-1)?.trangThai).toBe('CHO_PHE_DUYET');
    // Chứng từ rời khỏi báo cáo chính thức cho tới khi duyệt lại xong.
    expect(kho.thongBao.at(-1)).toMatchObject({ loai: 'DEN_LUOT_DUYET' });
  });

  it('chỉ sửa ghi chú thì KHÔNG bắt duyệt lại', async () => {
    const { service, kho } = dungService({
      userId: 'ke-toan',
      viTriCuaToi: [],
      quyTrinh: [daXong()],
    });
    const kq = await service.sauKhiSua('CHUNG_TU', 'ct1', goc, {
      ...goc,
      ghiChu: 'bổ sung ghi chú',
    });
    expect(kq.phaiDuyetLai).toBe(false);
    expect(kho.daGhiTrangThai).toHaveLength(0);
  });

  it('chứng từ chưa từng gửi duyệt thì không có gì để làm', async () => {
    const { service } = dungService({ userId: 'x', viTriCuaToi: [], quyTrinh: [] });
    const kq = await service.sauKhiSua('CHUNG_TU', 'ct-la', goc, { ...goc, soTien: 999 });
    expect(kq).toEqual({ phaiDuyetLai: false, truongDaDoi: [] });
  });
});
