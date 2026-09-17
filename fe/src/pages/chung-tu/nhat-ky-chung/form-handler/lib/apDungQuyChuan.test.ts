import { describe, it, expect } from 'vitest';
import { apDungQuyChuan } from './apDungQuyChuan';
import type { QuyChuan, DongTien, KhoanMuc } from '@/types';
import type { ChungTuChiTiet } from '../sub-handler/init/init.state';

// Dùng đúng kiểu thật, không ép kiểu: khai khống trường là test xanh mà chạy thật vỡ.
const DONG_TIEN = [
  { id: 'dt-10', ma: 'T10', ten: 'Thu lãi tiền gửi', loai: 'Đầu tư' },
  { id: 'dt-20', ma: 'T20', ten: 'Thu bán hàng', loai: 'Kinh doanh' },
] as unknown as DongTien[];

const KHOAN_MUC = [
  { id: 'km-1', ma: 'DT01', ten: 'Doanh thu tài chính', loai: 'Thu', nhom: 'DT' },
] as unknown as KhoanMuc[];

const DM = { dongTienList: DONG_TIEN, khoanMucList: KHOAN_MUC };

const dongTrong = (): ChungTuChiTiet => ({
  key: 'r1',
  taiKhoanNo: '',
  taiKhoanCo: '',
  soTien: 0,
});

const QC: QuyChuan = {
  id: 'qc1',
  loaiGiaoDich: 'TANG_TIEN_GUI',
  nghiepVu: 'Lãi Ngân hàng',
  taiKhoanNo: '112',
  taiKhoanCo: '515',
  dongTien: 'T10',
};

describe('apDungQuyChuan — chép thiết lập từ Quy chuẩn hạch toán sang dòng hạch toán', () => {
  it('chép tài khoản Nợ/Có như trước đây', () => {
    const ra = apDungQuyChuan(dongTrong(), QC, DM);
    expect(ra.taiKhoanNo).toBe('112');
    expect(ra.taiKhoanCo).toBe('515');
  });

  it('CHÉP CẢ DÒNG TIỀN — đây là lỗi kế toán báo: quy chuẩn có T10 mà ô vẫn trống', () => {
    const ra = apDungQuyChuan(dongTrong(), QC, DM);
    expect(ra.dongTienId).toBe('dt-10');
  });

  it('dòng tiền phải kèm snapshot, nếu không lưu xong báo cáo không đọc ra mã', () => {
    const ra = apDungQuyChuan(dongTrong(), QC, DM);
    expect(ra.dongTienSnapshot).toMatchObject({ id: 'dt-10', ma: 'T10', ten: 'Thu lãi tiền gửi' });
  });

  it('quy chuẩn lưu MÃ còn dòng hạch toán dùng ID — phải tra bảng, không gán thẳng', () => {
    const ra = apDungQuyChuan(dongTrong(), QC, DM);
    expect(ra.dongTienId).not.toBe('T10');
  });

  it('chép cả khoản mục, cũng tra theo mã', () => {
    const ra = apDungQuyChuan(dongTrong(), { ...QC, khoanMuc: 'DT01' }, DM);
    expect(ra.khoanMucId).toBe('km-1');
    expect(ra.khoanMucSnapshot).toMatchObject({ ma: 'DT01', ten: 'Doanh thu tài chính' });
  });

  it('quy chuẩn không khai dòng tiền thì GIỮ NGUYÊN cái người dùng đang chọn, không xoá', () => {
    const dong = { ...dongTrong(), dongTienId: 'dt-20', dongTienSnapshot: { id: 'dt-20' } };
    const ra = apDungQuyChuan(dong, { ...QC, dongTien: undefined }, DM);
    expect(ra.dongTienId).toBe('dt-20');
    expect(ra.dongTienSnapshot).toEqual({ id: 'dt-20' });
  });

  it('mã trong quy chuẩn không còn trong danh mục (đã xoá) thì giữ nguyên, không làm trống ô', () => {
    const dong = { ...dongTrong(), dongTienId: 'dt-20' };
    const ra = apDungQuyChuan(dong, { ...QC, dongTien: 'T99' }, DM);
    expect(ra.dongTienId).toBe('dt-20');
  });

  it('không có quy chuẩn thì trả về đúng dòng cũ', () => {
    const dong = { ...dongTrong(), taiKhoanNo: '111' };
    expect(apDungQuyChuan(dong, undefined, DM)).toEqual(dong);
  });

  it('không sửa dòng truyền vào', () => {
    const dong = dongTrong();
    apDungQuyChuan(dong, QC, DM);
    expect(dong).toEqual({ key: 'r1', taiKhoanNo: '', taiKhoanCo: '', soTien: 0 });
  });

  it('mô tả của quy chuẩn thành nội dung dòng', () => {
    const ra = apDungQuyChuan(dongTrong(), { ...QC, moTa: 'Lãi tiền gửi tháng 9' }, DM);
    expect(ra.noiDung).toBe('Lãi tiền gửi tháng 9');
  });

  it('quy chuẩn không có mô tả thì giữ nội dung người dùng đã gõ', () => {
    const dong = { ...dongTrong(), noiDung: 'Người dùng tự gõ' };
    expect(apDungQuyChuan(dong, QC, DM).noiDung).toBe('Người dùng tự gõ');
  });

  it('danh mục chưa tải xong thì không vỡ, chỉ bỏ qua phần tra bảng', () => {
    const ra = apDungQuyChuan(dongTrong(), QC, { dongTienList: [], khoanMucList: [] });
    expect(ra.taiKhoanNo).toBe('112');
    expect(ra.dongTienId).toBeUndefined();
  });
});
