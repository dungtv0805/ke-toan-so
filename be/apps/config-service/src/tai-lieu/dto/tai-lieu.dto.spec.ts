import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateFileDto, CreateYoutubeDto } from './tai-lieu.dto';

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
