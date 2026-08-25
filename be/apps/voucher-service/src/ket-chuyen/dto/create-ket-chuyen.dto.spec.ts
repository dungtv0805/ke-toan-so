import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateKetChuyenDto } from './create-ket-chuyen.dto';

const BODY_HOP_LE = {
  denNgay: '2026-08-31',
  ngayHachToan: '2026-08-31',
  ngayChungTu: '2026-08-31',
  dienGiai: 'Kết chuyển lãi lỗ đến ngày 31/08/2026',
  dong: [
    {
      maKetChuyen: '511-911',
      dienGiai: 'Kết chuyển doanh thu',
      taiKhoanNo: '511',
      taiKhoanCo: '911',
      soTien: 100,
    },
  ],
};

const loiCua = async (body: unknown) =>
  validate(plainToInstance(CreateKetChuyenDto, body as object));

describe('CreateKetChuyenDto', () => {
  it('chấp nhận body hợp lệ', async () => {
    expect(await loiCua(BODY_HOP_LE)).toHaveLength(0);
  });

  it('từ chối mảng dòng rỗng (nếu lọt sẽ đốt một số phiếu NVK rồi trả soDong: 0)', async () => {
    const loi = await loiCua({ ...BODY_HOP_LE, dong: [] });

    expect(loi).toHaveLength(1);
    expect(loi[0].property).toBe('dong');
  });

  it('nêu lý do bằng tiếng Việt khi mảng dòng rỗng', async () => {
    const loi = await loiCua({ ...BODY_HOP_LE, dong: [] });

    expect(Object.values(loi[0].constraints || {}).join(' ')).toMatch(
      /dòng hạch toán/i,
    );
  });
});
