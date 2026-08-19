import {
  buildDimensionPipeline,
  KE_HOACH_DIMENSIONS,
  layDuong,
} from './dimension-aggregation.helper';

const stages = (p: object[]) => p.map((s) => Object.keys(s)[0]);

describe('buildDimensionPipeline', () => {
  it('luôn lọc trước khi gom', () => {
    const p = buildDimensionPipeline('project', { tenantId: 't1' });
    expect(p[0]).toEqual({ $match: { tenantId: 't1' } });
  });

  it('gom chiều thường theo mã của danh mục tương ứng', () => {
    const p = buildDimensionPipeline('team', {}) as { $group?: { _id: string } }[];
    const group = p.find((s) => s.$group)!.$group!;
    expect(group._id).toBe('$danhMuc.doi.ma');
  });

  it('nhóm khoản mục gom theo trường nhóm (chuỗi) của khoản mục', () => {
    const p = buildDimensionPipeline('nhom-khoan-muc', {}) as {
      $group?: { _id: string };
    }[];
    expect(p.find((s) => s.$group)!.$group!._id).toBe('$danhMuc.khoanMuc.nhom');
  });

  it('chủ đầu tư lấy cả trường rời lẫn trường lồng trong dự án', () => {
    const p = buildDimensionPipeline('investor', {});
    expect(stages(p)).toContain('$addFields');
  });

  it('tài khoản gom cả bên Nợ lẫn bên Có', () => {
    const p = buildDimensionPipeline('account', {});
    expect(stages(p)).toContain('$facet');
  });

  it('đối tượng gom cả ĐT Nợ lẫn ĐT Có', () => {
    const p = buildDimensionPipeline('doi-tuong', {});
    expect(stages(p)).toContain('$facet');
  });

  it('mọi chiều đều dựng được pipeline và trả đủ 4 chỉ số', () => {
    for (const dim of KE_HOACH_DIMENSIONS) {
      const p = buildDimensionPipeline(dim, {});
      // pipeline hai nhánh có $project trung gian — chỉ tầng cuối mới là kết quả
      const project = [...p].reverse().find((s) => '$project' in s) as {
        $project: Record<string, unknown>;
      };
      expect(Object.keys(project.$project)).toEqual(
        expect.arrayContaining(['key', 'ten', 'doanhThu', 'chiPhi', 'tong', 'soLuong']),
      );
    }
  });

  it('chiều lạ thì báo lỗi thay vì gom sai', () => {
    expect(() => buildDimensionPipeline('khong-co' as never, {})).toThrow();
  });

  it('layDuong trả đường dẫn danh mục của chiều thường', () => {
    expect(layDuong('cash-flow')).toBe('danhMuc.dongTien');
  });
});
