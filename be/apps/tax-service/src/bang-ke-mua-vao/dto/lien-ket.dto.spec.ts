import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBangKeMuaVaoDto, BangKeMuaVaoQueryDto } from './index';

const base = {
  ngayHoaDon: '2026-06-01',
  soHoaDon: '0000123',
  tenNguoiBan: 'Cty A',
  giaTriChuaThue: 0,
  thueSuat: '10',
};

describe('CreateBangKeMuaVaoDto — dòng nháp từ chứng từ', () => {
  it('giá trị 0 + choBoSung true là hợp lệ', async () => {
    const dto = plainToInstance(CreateBangKeMuaVaoDto, {
      ...base,
      choBoSung: true,
      soChungTu: 'PC0001',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('choBoSung sai kiểu thì báo lỗi', async () => {
    const dto = plainToInstance(CreateBangKeMuaVaoDto, {
      ...base,
      choBoSung: 'co',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'choBoSung')).toBe(true);
  });
});

describe('BangKeMuaVaoQueryDto — lọc theo liên kết', () => {
  it('nhận soChungTu và lienKet hợp lệ', async () => {
    const dto = plainToInstance(BangKeMuaVaoQueryDto, {
      soChungTu: 'PC0001',
      lienKet: 'chua',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('lienKet ngoài 3 giá trị cho phép thì báo lỗi', async () => {
    const dto = plainToInstance(BangKeMuaVaoQueryDto, { lienKet: 'linh tinh' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'lienKet')).toBe(true);
  });
});
