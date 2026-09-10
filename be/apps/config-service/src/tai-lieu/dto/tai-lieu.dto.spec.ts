import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateFileDto, CreateYoutubeDto, TAI_LIEU_CATEGORIES } from './tai-lieu.dto';

const loiCua = (dto: object) =>
  validateSync(dto as object).flatMap((e) => Object.keys(e.constraints ?? {}));

describe('CATS — whitelist category của Thư viện', () => {
  // Thêm mục Thư viện mới mà quên whitelist này thì upload báo 400 rất khó đoán.
  const CATS = ['quy-trinh', 'bieu-mau', 'chinh-sach', 'huong-dan'];

  it.each(CATS)('nhận category "%s"', (category) => {
    const dto = plainToInstance(CreateFileDto, { title: 'a', category });
    expect(loiCua(dto)).toHaveLength(0);
  });

  it('từ chối category lạ', () => {
    const dto = plainToInstance(CreateFileDto, {
      title: 'a',
      category: 'linh-tinh',
    });
    expect(loiCua(dto)).toContain('isIn');
  });

  it('link YouTube cũng theo đúng bộ category đó', () => {
    const dto = plainToInstance(CreateYoutubeDto, {
      title: 'a',
      category: 'quy-trinh',
      youtubeUrl: 'https://youtu.be/abc',
    });
    expect(loiCua(dto)).toHaveLength(0);
  });
});

describe('TAI_LIEU_CATEGORIES — thư viện riêng của từng phân hệ', () => {
  const PHAN_HE = ['tong-hop', 'von-dong-tien', 'mua-hang', 'ban-hang', 'tien-luong', 'kho', 'tai-san', 'ccdc', 'thue'];

  it('có Quy trình + Hướng dẫn riêng của 9 phân hệ, cộng 4 thư viện chung', () => {
    for (const ph of PHAN_HE) {
      expect(TAI_LIEU_CATEGORIES).toContain(`${ph}/quy-trinh`);
      expect(TAI_LIEU_CATEGORIES).toContain(`${ph}/huong-dan`);
    }
    expect(TAI_LIEU_CATEGORIES).toHaveLength(22);
  });

  it.each(['kho/quy-trinh', 'thue/huong-dan'])('upload vào "%s" hợp lệ', (category) => {
    const dto = plainToInstance(CreateFileDto, { title: 'a', category });
    expect(loiCua(dto)).toHaveLength(0);
  });

  it('không nhận route nghiệp vụ khác làm category', () => {
    for (const category of ['chung-tu/phieu-thu', 'tong-quan', 'kho/nhap-kho']) {
      const dto = plainToInstance(CreateFileDto, { title: 'a', category });
      expect(loiCua(dto)).toContain('isIn');
    }
  });
});
