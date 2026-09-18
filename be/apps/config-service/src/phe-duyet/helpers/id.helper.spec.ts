import { ObjectId } from 'mongodb';
import { QuyTrinhPheDuyet } from '@app/entities';
import { idCua, kemId } from './id.helper';

describe('idCua — lấy id từ _id, không dựa vào getter', () => {
  it('đọc được từ object thường (kết quả save qua proxy tenant)', () => {
    const _id = new ObjectId();
    // Proxy tenant trải entity thành object thường trước khi save → mất getter `id`.
    const daLuu = { ...new QuyTrinhPheDuyet(), _id } as unknown as QuyTrinhPheDuyet;
    expect(daLuu.id).toBeUndefined();
    expect(idCua(daLuu)).toBe(_id.toString());
  });

  it('không có _id thì trả undefined thay vì ném lỗi', () => {
    expect(idCua({} as QuyTrinhPheDuyet)).toBeUndefined();
  });
});

describe('kemId — thêm `id` vào JSON trả về FE', () => {
  it('entity có getter id vẫn ra JSON có id', () => {
    const qt = new QuyTrinhPheDuyet();
    qt._id = new ObjectId();
    expect(JSON.parse(JSON.stringify(qt)).id).toBeUndefined();
    expect(JSON.parse(JSON.stringify(kemId(qt))).id).toBe(qt._id.toString());
  });

  it('đi sâu vào mảng và object lồng, giữ nguyên Date/ObjectId', () => {
    const a = new ObjectId();
    const b = new ObjectId();
    const ngay = new Date('2026-09-18T00:00:00Z');
    const ra = kemId({
      success: true,
      data: { quyTrinh: { _id: a, ngayGuiDuyet: ngay }, lichSu: [{ _id: b }] },
    }) as any;
    expect(ra.data.quyTrinh.id).toBe(a.toString());
    expect(ra.data.quyTrinh.ngayGuiDuyet).toBe(ngay);
    expect(ra.data.quyTrinh._id).toBe(a);
    expect(ra.data.lichSu[0].id).toBe(b.toString());
  });

  it('không đè id đã có (hồ sơ đính kèm mang id riêng)', () => {
    const ra = kemId({ hoSo: [{ id: 'hs-1', ten: 'x' }] }) as any;
    expect(ra.hoSo[0].id).toBe('hs-1');
  });
});
