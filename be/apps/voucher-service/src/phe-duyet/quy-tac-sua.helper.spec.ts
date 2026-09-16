import { kiemTraQuyenSua, kiemTraQuyenXoa } from './quy-tac-sua.helper';

const CT = (over: Record<string, unknown> = {}) => ({
  nguoiTaoId: 'nguoi-lap',
  ...over,
});

describe('kiemTraQuyenSua — mục 11', () => {
  it('chứng từ chưa từng gửi duyệt: ai có quyền sửa thì sửa', () => {
    expect(kiemTraQuyenSua(CT(), 'ai-do')).toEqual({ choPhep: true, phaiDuyetLai: false });
  });

  it('chứng từ NHÁP: sửa thoải mái, chưa có phê duyệt nào để mất', () => {
    expect(kiemTraQuyenSua(CT({ trangThaiPheDuyet: 'NHAP' }), 'ai-do'))
      .toEqual({ choPhep: true, phaiDuyetLai: false });
  });

  it('ĐANG chờ duyệt: chỉ người lập được sửa', () => {
    const ct = CT({ trangThaiPheDuyet: 'CHO_PHE_DUYET' });
    expect(kiemTraQuyenSua(ct, 'nguoi-lap')).toEqual({ choPhep: true, phaiDuyetLai: true });

    const nguoiKhac = kiemTraQuyenSua(ct, 'ke-toan-khac');
    expect(nguoiKhac.choPhep).toBe(false);
    expect(nguoiKhac.lyDo).toMatch(/đang chờ phê duyệt/i);
  });

  it('bị trả lại: người lập sửa rồi gửi lại — đúng vòng đời mục 10', () => {
    expect(kiemTraQuyenSua(CT({ trangThaiPheDuyet: 'YEU_CAU_BO_SUNG' }), 'nguoi-lap'))
      .toEqual({ choPhep: true, phaiDuyetLai: true });
  });

  it('bị từ chối: vẫn sửa được để làm lại', () => {
    expect(kiemTraQuyenSua(CT({ trangThaiPheDuyet: 'TU_CHOI' }), 'nguoi-lap').choPhep).toBe(true);
  });

  it('ĐÃ chính thức: cho sửa nhưng BẮT duyệt lại — "không được giữ phê duyệt cũ"', () => {
    expect(kiemTraQuyenSua(CT({ trangThaiPheDuyet: 'CHINH_THUC' }), 'ke-toan-truong'))
      .toEqual({ choPhep: true, phaiDuyetLai: true });
  });

  it('đã kiểm soát đủ cũng phải duyệt lại', () => {
    expect(kiemTraQuyenSua(CT({ trangThaiPheDuyet: 'DA_KIEM_SOAT' }), 'x').phaiDuyetLai).toBe(true);
  });
});

describe('kiemTraQuyenXoa', () => {
  it('không cho xoá chứng từ đang chờ duyệt — người duyệt đang cầm nó trên màn hình', () => {
    const kq = kiemTraQuyenXoa(CT({ trangThaiPheDuyet: 'CHO_PHE_DUYET' }));
    expect(kq.choPhep).toBe(false);
    expect(kq.lyDo).toMatch(/đang chờ phê duyệt/i);
  });

  it('không cho xoá chứng từ đã chính thức — số đã lên báo cáo', () => {
    expect(kiemTraQuyenXoa(CT({ trangThaiPheDuyet: 'CHINH_THUC' })).choPhep).toBe(false);
  });

  it('nháp / bị trả lại / bị từ chối thì xoá được', () => {
    for (const tt of [undefined, 'NHAP', 'YEU_CAU_BO_SUNG', 'TU_CHOI']) {
      expect(kiemTraQuyenXoa(CT({ trangThaiPheDuyet: tt })).choPhep).toBe(true);
    }
  });
});
