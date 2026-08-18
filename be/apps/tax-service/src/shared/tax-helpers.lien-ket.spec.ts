import {
  locTheoLienKet,
  nenTatChoBoSung,
  gomTheoSoChungTu,
  tachDanhSachSoChungTu,
  dtoCoSoTien,
} from './tax-helpers';

const hd = (over: Record<string, unknown> = {}) =>
  ({ soChungTu: undefined, choBoSung: false, ...over }) as {
    soChungTu?: string;
    choBoSung?: boolean;
  };

describe('locTheoLienKet', () => {
  const items = [
    hd({ soChungTu: 'PC0001' }),
    hd({}),
    hd({ soChungTu: 'PC0002', choBoSung: true }),
  ];

  it('không truyền bộ lọc thì giữ nguyên cả danh sách', () => {
    expect(locTheoLienKet(items)).toHaveLength(3);
  });

  it('"da" chỉ giữ dòng đã có số chứng từ', () => {
    expect(locTheoLienKet(items, 'da').map((i) => i.soChungTu)).toEqual([
      'PC0001',
      'PC0002',
    ]);
  });

  it('"chua" chỉ giữ dòng chưa liên kết', () => {
    expect(locTheoLienKet(items, 'chua')).toHaveLength(1);
  });

  it('"cho-bo-sung" giữ dòng chờ bổ sung, kể cả khi đã liên kết', () => {
    expect(locTheoLienKet(items, 'cho-bo-sung')).toHaveLength(1);
  });

  it('coi chuỗi rỗng và khoảng trắng là CHƯA liên kết', () => {
    expect(locTheoLienKet([hd({ soChungTu: '   ' })], 'chua')).toHaveLength(1);
    expect(locTheoLienKet([hd({ soChungTu: '   ' })], 'da')).toHaveLength(0);
  });
});

describe('nenTatChoBoSung', () => {
  it('có giá trị chưa thuế thì hết chờ bổ sung', () => {
    expect(nenTatChoBoSung({ giaTriChuaThue: 1_000_000 })).toBe(true);
  });

  it('chỉ có tiền thuế cũng đủ (hóa đơn điều chỉnh chỉ ghi thuế)', () => {
    expect(nenTatChoBoSung({ giaTriChuaThue: 0, tienThue: 50_000 })).toBe(true);
  });

  it('cả hai bằng 0 thì vẫn là chờ bổ sung', () => {
    expect(nenTatChoBoSung({ giaTriChuaThue: 0, tienThue: 0 })).toBe(false);
    expect(nenTatChoBoSung({})).toBe(false);
  });
});

describe('gomTheoSoChungTu', () => {
  it('gom các hóa đơn cùng số chứng từ về một khóa', () => {
    const map = gomTheoSoChungTu([
      hd({ soChungTu: 'PC0001' }),
      hd({ soChungTu: 'PC0001' }),
      hd({ soChungTu: 'PC0002' }),
    ]);
    expect(map['PC0001']).toHaveLength(2);
    expect(map['PC0002']).toHaveLength(1);
  });

  it('bỏ qua dòng chưa liên kết — không tạo khóa rỗng', () => {
    expect(gomTheoSoChungTu([hd({}), hd({ soChungTu: '' })])).toEqual({});
  });
});

describe('tachDanhSachSoChungTu', () => {
  it('tách theo dấu phẩy, bỏ khoảng trắng và phần tử rỗng', () => {
    expect(tachDanhSachSoChungTu(' PC0001, PC0002 ,,PC0003 ')).toEqual([
      'PC0001',
      'PC0002',
      'PC0003',
    ]);
  });

  it('không truyền gì thì ra mảng rỗng', () => {
    expect(tachDanhSachSoChungTu()).toEqual([]);
    expect(tachDanhSachSoChungTu('')).toEqual([]);
  });

  it('bỏ trùng lặp — 20 dòng cùng một số phiếu chỉ hỏi một lần', () => {
    expect(tachDanhSachSoChungTu('PC0001,PC0001')).toEqual(['PC0001']);
  });
});

describe('dtoCoSoTien', () => {
  it('DTO gắn/gỡ liên kết (chỉ soChungTu) → false', () => {
    expect(dtoCoSoTien({ soChungTu: 'PC0001' } as never)).toBe(false);
    expect(dtoCoSoTien({ soChungTu: '' } as never)).toBe(false);
  });

  it('DTO sửa thông tin không phải tiền → false', () => {
    expect(dtoCoSoTien({ ghiChu: 'x', tenHangHoa: 'y' } as never)).toBe(false);
    expect(dtoCoSoTien({} as never)).toBe(false);
  });

  it('có bất kỳ trường tiền nào → true', () => {
    expect(dtoCoSoTien({ giaTriChuaThue: 0 })).toBe(true);
    expect(dtoCoSoTien({ thueSuat: '10' })).toBe(true);
    expect(dtoCoSoTien({ tienThue: 0 })).toBe(true);
    expect(dtoCoSoTien({ tongThanhToan: 0 })).toBe(true);
  });
});
