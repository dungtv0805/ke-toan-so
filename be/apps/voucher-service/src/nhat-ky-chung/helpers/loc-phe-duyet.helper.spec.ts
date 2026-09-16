import {
  DIEU_KIEN_CHINH_THUC,
  apDungLocPheDuyet,
} from './loc-phe-duyet.helper';

describe('apDungLocPheDuyet — mục 12', () => {
  it('mặc định CHỈ lấy chứng từ chính thức', () => {
    expect(apDungLocPheDuyet({ tenantId: 't1' })).toEqual({
      tenantId: 't1',
      trangThaiPheDuyet: DIEU_KIEN_CHINH_THUC,
    });
  });

  it('chứng từ CŨ (chưa có trường trạng thái) vẫn phải lên báo cáo', () => {
    // `$in` kèm null khớp cả document thiếu hẳn field. Không có điều này thì
    // bật tính năng là mọi báo cáo về 0 cho tới khi chạy xong backfill.
    expect(DIEU_KIEN_CHINH_THUC.$in).toContain(null);
    expect(DIEU_KIEN_CHINH_THUC.$in).toContain('CHINH_THUC');
  });

  it('không lọt trạng thái nào khác vào báo cáo chính thức', () => {
    for (const tt of ['NHAP', 'CHO_PHE_DUYET', 'YEU_CAU_BO_SUNG', 'TU_CHOI', 'DA_KIEM_SOAT']) {
      expect(DIEU_KIEN_CHINH_THUC.$in).not.toContain(tt);
    }
  });

  it('baoGomChuaDuyet=true thì không lọc gì — màn nhập liệu cần thấy phiếu nháp', () => {
    expect(apDungLocPheDuyet({ tenantId: 't1' }, { baoGomChuaDuyet: true })).toEqual({
      tenantId: 't1',
    });
  });

  it('lọc theo một trạng thái cụ thể thì tôn trọng lựa chọn của người dùng', () => {
    expect(
      apDungLocPheDuyet({}, { baoGomChuaDuyet: true, trangThaiPheDuyet: 'CHO_PHE_DUYET' }),
    ).toEqual({ trangThaiPheDuyet: 'CHO_PHE_DUYET' });
  });

  it('lọc trạng thái cụ thể nhưng KHÔNG bật baoGomChuaDuyet thì vẫn chỉ ra chính thức', () => {
    // Nếu không, một tham số query là mở được cửa hậu đưa số chưa duyệt vào báo cáo.
    expect(
      apDungLocPheDuyet({}, { trangThaiPheDuyet: 'CHO_PHE_DUYET' }),
    ).toEqual({ trangThaiPheDuyet: DIEU_KIEN_CHINH_THUC });
  });

  it('CHUA_CO_QUY_TRINH lọc đúng chứng từ chưa từng gửi duyệt', () => {
    expect(
      apDungLocPheDuyet({}, { baoGomChuaDuyet: true, trangThaiPheDuyet: 'CHUA_GUI' }),
    ).toEqual({ trangThaiPheDuyet: { $in: [null, 'NHAP'] } });
  });

  it('không nuốt mất điều kiện lọc sẵn có', () => {
    const ra = apDungLocPheDuyet({ ngay: { $gte: 1 }, 'danhMuc.doiTuong.ma': 'KH01' });
    expect(ra['danhMuc.doiTuong.ma']).toBe('KH01');
    expect(ra.ngay).toEqual({ $gte: 1 });
  });

  it('không sửa đối tượng truyền vào', () => {
    const goc = { tenantId: 't1' };
    apDungLocPheDuyet(goc);
    expect(goc).toEqual({ tenantId: 't1' });
  });
});
