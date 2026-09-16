import type { BuocCauHinh, BuocPheDuyet } from '@app/entities';
import {
  apDungDuyet,
  apDungTraLai,
  apDungTuChoi,
  buocDangCho,
  datLaiTuDau,
  sinhBuocTuCauHinh,
  tinhThoiGianXuLyGiay,
  tongThoiGianGiay,
} from './buoc.helper';

const T = (iso: string) => new Date(iso);

const CAU_HINH: BuocCauHinh[] = [
  { thuTu: 1, viTriTen: 'Phụ trách phòng ban', batBuoc: true },
  { thuTu: 2, viTriTen: 'Kiểm soát kế toán', batBuoc: true },
  { thuTu: 3, viTriTen: 'Giám đốc', batBuoc: true },
];

describe('sinhBuocTuCauHinh — mục 5 bước 2 và 3', () => {
  it('bước 1 vào DANG_CHO và được ghi mốc bắt đầu chờ, các bước sau CHUA_DEN_LUOT', () => {
    const buoc = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 1);
    expect(buoc.map((b) => b.trangThai)).toEqual([
      'DANG_CHO',
      'CHUA_DEN_LUOT',
      'CHUA_DEN_LUOT',
    ]);
    expect(buoc[0].batDauCho).toEqual(T('2026-09-10T09:15:00Z'));
    // Mục 5 bước 4: mốc chờ của cấp sau CHỈ được ghi khi cấp trước duyệt xong.
    expect(buoc[1].batDauCho).toBeUndefined();
    expect(buoc[2].batDauCho).toBeUndefined();
  });

  it('sắp xếp lại theo thứ tự dù cấu hình khai lộn xộn', () => {
    const lonXon: BuocCauHinh[] = [
      { thuTu: 3, viTriTen: 'Giám đốc', batBuoc: true },
      { thuTu: 1, viTriTen: 'Phụ trách phòng ban', batBuoc: true },
      { thuTu: 2, viTriTen: 'Kiểm soát kế toán', batBuoc: true },
    ];
    expect(sinhBuocTuCauHinh(lonXon, T('2026-09-10T09:15:00Z'), 1).map((b) => b.viTriTen))
      .toEqual(['Phụ trách phòng ban', 'Kiểm soát kế toán', 'Giám đốc']);
  });

  it('cấu hình rỗng thì không sinh bước nào — gọi tầng trên phải tự chặn', () => {
    expect(sinhBuocTuCauHinh([], T('2026-09-10T09:15:00Z'), 1)).toEqual([]);
  });

  it('ghi phiên bản nghiệp vụ vào từng bước — mục 14', () => {
    const buoc = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 3);
    expect(buoc.every((b) => b.phienBan === 3)).toBe(true);
  });
});

describe('apDungDuyet — mục 5 bước 4, tuần tự', () => {
  it('duyệt cấp 1 xong mới mở cấp 2 và ghi mốc chờ của cấp 2', () => {
    const buoc = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 1);
    const kq = apDungDuyet(buoc, {
      thuTu: 1,
      nguoiXuLyId: 'u1',
      nguoiXuLyTen: 'Trưởng phòng A',
      yKien: 'ok',
      thoiDiem: T('2026-09-10T10:20:00Z'),
    });

    expect(kq.buoc[0].trangThai).toBe('DA_DUYET');
    expect(kq.buoc[0].nguoiXuLyId).toBe('u1');
    expect(kq.buoc[0].thoiDiemXuLy).toEqual(T('2026-09-10T10:20:00Z'));
    // 09:15 → 10:20 = 1 giờ 5 phút, đúng ví dụ bảng mục 9.
    expect(kq.buoc[0].thoiGianXuLyGiay).toBe(3900);

    expect(kq.buoc[1].trangThai).toBe('DANG_CHO');
    expect(kq.buoc[1].batDauCho).toEqual(T('2026-09-10T10:20:00Z'));
    expect(kq.buoc[2].trangThai).toBe('CHUA_DEN_LUOT');

    expect(kq.buocKeTiep).toBe(2);
    expect(kq.hoanThanh).toBe(false);
  });

  it('duyệt cấp cuối thì hoàn thành, không còn bước chờ', () => {
    let buoc = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 1);
    buoc = apDungDuyet(buoc, { thuTu: 1, nguoiXuLyId: 'u1', thoiDiem: T('2026-09-10T10:20:00Z') }).buoc;
    buoc = apDungDuyet(buoc, { thuTu: 2, nguoiXuLyId: 'u2', thoiDiem: T('2026-09-10T14:35:00Z') }).buoc;
    const kq = apDungDuyet(buoc, { thuTu: 3, nguoiXuLyId: 'u3', thoiDiem: T('2026-09-11T08:10:00Z') });

    expect(kq.hoanThanh).toBe(true);
    expect(kq.buocKeTiep).toBe(0);
    expect(kq.buoc.every((b) => b.trangThai === 'DA_DUYET')).toBe(true);
    // Bảng mục 9: 01g05 · 04g15 · 17g35.
    expect(kq.buoc.map((b) => b.thoiGianXuLyGiay)).toEqual([3900, 15300, 63300]);
  });

  it('không cho duyệt bước chưa đến lượt — mục 6', () => {
    const buoc = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 1);
    expect(() =>
      apDungDuyet(buoc, { thuTu: 2, nguoiXuLyId: 'u2', thoiDiem: T('2026-09-10T10:00:00Z') }),
    ).toThrow(/chưa đến lượt/i);
  });

  it('không cho duyệt lại bước đã duyệt', () => {
    const buoc = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 1);
    const sau = apDungDuyet(buoc, { thuTu: 1, nguoiXuLyId: 'u1', thoiDiem: T('2026-09-10T10:20:00Z') }).buoc;
    expect(() =>
      apDungDuyet(sau, { thuTu: 1, nguoiXuLyId: 'u1', thoiDiem: T('2026-09-10T11:00:00Z') }),
    ).toThrow(/chưa đến lượt/i);
  });

  it('bỏ qua bước không bắt buộc ở cuối luồng thì vẫn hoàn thành', () => {
    const cauHinh: BuocCauHinh[] = [
      { thuTu: 1, viTriTen: 'Kiểm soát kế toán', batBuoc: true },
      { thuTu: 2, viTriTen: 'Giám đốc', batBuoc: false },
    ];
    const buoc = sinhBuocTuCauHinh(cauHinh, T('2026-09-10T09:00:00Z'), 1);
    const kq = apDungDuyet(buoc, { thuTu: 1, nguoiXuLyId: 'u1', thoiDiem: T('2026-09-10T10:00:00Z') });
    // Bước 2 vẫn được mở để ai đó duyệt nếu muốn, nhưng không còn bước BẮT BUỘC
    // nào chưa duyệt nên nghiệp vụ đã đủ điều kiện chính thức — mục 5 bước 5.
    expect(kq.hoanThanh).toBe(true);
  });
});

describe('apDungTraLai / apDungTuChoi — mục 7', () => {
  it('trả lại ghi người xử lý, ý kiến và dừng luồng', () => {
    const buoc = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 1);
    const kq = apDungTraLai(buoc, {
      thuTu: 1,
      nguoiXuLyId: 'u1',
      yKien: 'Thiếu hóa đơn',
      thoiDiem: T('2026-09-10T10:00:00Z'),
    });
    expect(kq.buoc[0].trangThai).toBe('TRA_LAI');
    expect(kq.buoc[0].yKien).toBe('Thiếu hóa đơn');
    expect(kq.buoc[1].trangThai).toBe('CHUA_DEN_LUOT');
    expect(kq.buoc[1].batDauCho).toBeUndefined();
  });

  it('từ chối cũng dừng luồng, cấp sau không bao giờ thấy', () => {
    const buoc = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 1);
    const kq = apDungTuChoi(buoc, {
      thuTu: 1,
      nguoiXuLyId: 'u1',
      yKien: 'Không hợp lệ',
      thoiDiem: T('2026-09-10T10:00:00Z'),
    });
    expect(kq.buoc[0].trangThai).toBe('TU_CHOI');
    expect(buocDangCho(kq.buoc)).toBeUndefined();
  });
});

describe('datLaiTuDau — mục 11, sửa nội dung trọng yếu sau khi đã có cấp duyệt', () => {
  it('xoá sạch dấu vết duyệt cũ và quay về chờ cấp 1 với phiên bản mới', () => {
    let buoc = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 1);
    buoc = apDungDuyet(buoc, { thuTu: 1, nguoiXuLyId: 'u1', thoiDiem: T('2026-09-10T10:20:00Z') }).buoc;
    buoc = apDungDuyet(buoc, { thuTu: 2, nguoiXuLyId: 'u2', thoiDiem: T('2026-09-10T14:35:00Z') }).buoc;

    const moi = datLaiTuDau(buoc, T('2026-09-12T08:00:00Z'), 2);

    expect(moi.map((b) => b.trangThai)).toEqual(['DANG_CHO', 'CHUA_DEN_LUOT', 'CHUA_DEN_LUOT']);
    // "Không được giữ phê duyệt cũ cho nội dung đã thay đổi".
    expect(moi.every((b) => b.nguoiXuLyId === undefined)).toBe(true);
    expect(moi.every((b) => b.thoiDiemXuLy === undefined)).toBe(true);
    expect(moi.every((b) => b.phienBan === 2)).toBe(true);
    expect(moi[0].batDauCho).toEqual(T('2026-09-12T08:00:00Z'));
  });

  it('giữ nguyên thứ tự và tên vị trí — mục 3: đổi người chứ không đổi luồng', () => {
    const buoc = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 1);
    expect(datLaiTuDau(buoc, T('2026-09-12T08:00:00Z'), 2).map((b) => b.viTriTen))
      .toEqual(['Phụ trách phòng ban', 'Kiểm soát kế toán', 'Giám đốc']);
  });
});

describe('tinhThoiGianXuLyGiay / tongThoiGianGiay — mục 9', () => {
  it('thời gian xử lý một vị trí = thời điểm xử lý trừ thời điểm bắt đầu chờ', () => {
    expect(tinhThoiGianXuLyGiay(T('2026-09-10T10:20:00Z'), T('2026-09-10T14:35:00Z'))).toBe(15300);
  });

  it('thiếu một mốc thì không bịa ra số', () => {
    expect(tinhThoiGianXuLyGiay(undefined, T('2026-09-10T14:35:00Z'))).toBeUndefined();
    expect(tinhThoiGianXuLyGiay(T('2026-09-10T10:20:00Z'), undefined)).toBeUndefined();
  });

  it('tổng thời gian phê duyệt = hoàn thành cấp cuối trừ lần gửi duyệt ĐẦU TIÊN', () => {
    expect(tongThoiGianGiay(T('2026-09-10T09:15:00Z'), T('2026-09-11T08:10:00Z'))).toBe(82500);
  });
});

describe('buocDangCho', () => {
  it('trả về đúng bước đang đến lượt', () => {
    const buoc: BuocPheDuyet[] = sinhBuocTuCauHinh(CAU_HINH, T('2026-09-10T09:15:00Z'), 1);
    expect(buocDangCho(buoc)?.thuTu).toBe(1);
  });

  it('không có bước nào đang chờ thì trả undefined', () => {
    expect(buocDangCho([])).toBeUndefined();
  });
});
