import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQuyChuan_Dto } from './create-quy-chuan.dto';

const validBase = {
  loaiGiaoDich: 'LGD01',
  nghiepVu: 'Thu tiền khách hàng',
  taiKhoanNo: '1111',
  taiKhoanCo: '1311',
};

describe('CreateQuyChuan_Dto — hoSoChungTu (Fix 9: validate từng phần tử, không chỉ @IsArray)', () => {
  it('không có hoSoChungTu (optional) thì hợp lệ', async () => {
    const dto = plainToInstance(CreateQuyChuan_Dto, { ...validBase });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('mảng đúng hình dạng { id, ma, ten } thì hợp lệ', async () => {
    const dto = plainToInstance(CreateQuyChuan_Dto, {
      ...validBase,
      hoSoChungTu: [{ id: '1', ma: 'HS01', ten: 'Hóa đơn GTGT' }],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('một phần tử thiếu trường bắt buộc (vd thiếu "ten") thì báo lỗi', async () => {
    const dto = plainToInstance(CreateQuyChuan_Dto, {
      ...validBase,
      hoSoChungTu: [{ id: '1', ma: 'HS01' }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'hoSoChungTu')).toBe(true);
  });

  it('phần tử là object bất kỳ (JSON tuỳ ý, không đúng hình dạng) thì báo lỗi', async () => {
    const dto = plainToInstance(CreateQuyChuan_Dto, {
      ...validBase,
      hoSoChungTu: [{ foo: 'bar', baz: 123 }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('phần tử có trường đúng tên nhưng sai kiểu (số thay vì chuỗi) thì báo lỗi', async () => {
    const dto = plainToInstance(CreateQuyChuan_Dto, {
      ...validBase,
      hoSoChungTu: [{ id: 1, ma: 'HS01', ten: 'Hóa đơn GTGT' }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CreateQuyChuan_Dto — 4 trường phân bổ (khoản mục, nhóm khoản mục, dòng tiền, loại chi phí)', () => {
  it('không khai trường nào cũng hợp lệ — bắt buộc hay không là do fieldRules của tài khoản', async () => {
    const dto = plainToInstance(CreateQuyChuan_Dto, { ...validBase });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('khai đủ 4 trường đúng kiểu thì hợp lệ', async () => {
    const dto = plainToInstance(CreateQuyChuan_Dto, {
      ...validBase,
      nhomKhoanMuc: 'NKM01',
      khoanMuc: 'KM01',
      dongTien: 'DT01',
      loaiChiPhi: 'CO_DINH',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('loaiChiPhi ngoài hai giá trị CO_DINH / BIEN_DOI thì báo lỗi', async () => {
    const dto = plainToInstance(CreateQuyChuan_Dto, { ...validBase, loaiChiPhi: 'KHAC' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'loaiChiPhi')).toBe(true);
  });

  it('chuỗi rỗng được coi như bỏ trống, không báo lỗi', async () => {
    const dto = plainToInstance(CreateQuyChuan_Dto, {
      ...validBase,
      khoanMuc: '',
      loaiChiPhi: '',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('khoanMuc sai kiểu (số) thì báo lỗi', async () => {
    const dto = plainToInstance(CreateQuyChuan_Dto, { ...validBase, khoanMuc: 123 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'khoanMuc')).toBe(true);
  });
});
