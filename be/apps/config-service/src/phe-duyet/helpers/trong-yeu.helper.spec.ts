import { TRUONG_TRONG_YEU, thayDoiTrongYeu } from './trong-yeu.helper';

const GOC = {
  soTien: 85_000_000,
  noiDung: 'Thanh toán hóa đơn tháng 8',
  ngay: '2026-09-10T00:00:00.000Z',
  danhMuc: {
    taiKhoanNo: { ma: '331', ten: 'Phải trả người bán' },
    taiKhoanCo: { ma: '1121', ten: 'Tiền gửi ngân hàng' },
    doiTuong: { ma: 'NCC01', ten: 'Công ty A' },
  },
};

describe('thayDoiTrongYeu — mục 11', () => {
  it('không đổi gì thì không bắt duyệt lại', () => {
    expect(thayDoiTrongYeu(GOC, { ...GOC })).toEqual([]);
  });

  it('đổi số tiền là trọng yếu', () => {
    expect(thayDoiTrongYeu(GOC, { ...GOC, soTien: 90_000_000 })).toEqual(['soTien']);
  });

  it('đổi tài khoản hạch toán là trọng yếu', () => {
    const sau = { ...GOC, danhMuc: { ...GOC.danhMuc, taiKhoanNo: { ma: '642', ten: 'Chi phí QLDN' } } };
    expect(thayDoiTrongYeu(GOC, sau)).toEqual(['danhMuc.taiKhoanNo']);
  });

  it('đổi đối tượng là trọng yếu', () => {
    const sau = { ...GOC, danhMuc: { ...GOC.danhMuc, doiTuong: { ma: 'NCC02', ten: 'Công ty B' } } };
    expect(thayDoiTrongYeu(GOC, sau)).toEqual(['danhMuc.doiTuong']);
  });

  it('đổi nội dung giao dịch là trọng yếu', () => {
    expect(thayDoiTrongYeu(GOC, { ...GOC, noiDung: 'Tạm ứng' })).toEqual(['noiDung']);
  });

  it('đổi ngày nghiệp vụ là trọng yếu — nó quyết định chứng từ rơi vào kỳ nào', () => {
    expect(thayDoiTrongYeu(GOC, { ...GOC, ngay: '2026-10-01T00:00:00.000Z' })).toEqual(['ngay']);
  });

  it('gom nhiều thay đổi trong một lần sửa', () => {
    const sau = {
      ...GOC,
      soTien: 1,
      noiDung: 'Khác',
      danhMuc: { ...GOC.danhMuc, doiTuong: { ma: 'X', ten: 'X' } },
    };
    expect(thayDoiTrongYeu(GOC, sau).sort()).toEqual(
      ['danhMuc.doiTuong', 'noiDung', 'soTien'].sort(),
    );
  });

  it('SO THEO MÃ, không theo tên — đổi tên đối tượng trong danh mục không phải sửa chứng từ', () => {
    const sau = {
      ...GOC,
      danhMuc: { ...GOC.danhMuc, doiTuong: { ma: 'NCC01', ten: 'Công ty A (đổi tên)' } },
    };
    expect(thayDoiTrongYeu(GOC, sau)).toEqual([]);
  });

  it('cùng ngày viết khác định dạng không phải là thay đổi', () => {
    expect(thayDoiTrongYeu(GOC, { ...GOC, ngay: new Date('2026-09-10T00:00:00Z') })).toEqual([]);
  });

  it('số tiền kiểu chuỗi từ Mongo Decimal128 không bị coi là đổi', () => {
    expect(thayDoiTrongYeu(GOC, { ...GOC, soTien: '85000000' })).toEqual([]);
  });

  it('ghi chú, địa chỉ, người giao dịch KHÔNG trọng yếu — sửa không phải duyệt lại', () => {
    const sau = { ...GOC, ghiChu: 'abc', diaChi: 'Hà Nội', nguoiGiaoDich: 'Anh B' };
    expect(thayDoiTrongYeu(GOC, sau)).toEqual([]);
  });

  it('bỏ trống một trường trọng yếu cũng là thay đổi', () => {
    const sau = { ...GOC, danhMuc: { ...GOC.danhMuc, doiTuong: undefined } };
    expect(thayDoiTrongYeu(GOC, sau)).toEqual(['danhMuc.doiTuong']);
  });

  it('danh sách trường trọng yếu đúng 6 trường tài liệu liệt kê', () => {
    expect(TRUONG_TRONG_YEU).toEqual([
      'soTien',
      'danhMuc.taiKhoanNo',
      'danhMuc.taiKhoanCo',
      'danhMuc.doiTuong',
      'noiDung',
      'ngay',
    ]);
  });
});
