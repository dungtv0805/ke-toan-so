import { ObjectId } from 'mongodb';

/**
 * Id của một bản ghi phê duyệt, đọc thẳng từ `_id`.
 *
 * KHÔNG dùng getter `id` của BaseEntity: proxy tenant (libs/database) trải
 * entity thành object thường khi `save`, nên kết quả `save` không còn getter
 * — `qt.id` ra undefined, thông báo và lịch sử bị ghi `?id=undefined`.
 */
export function idCua(x: { _id?: unknown }): string | undefined {
  return x?._id ? String(x._id) : undefined;
}

function laObjectThuong(v: object): boolean {
  return !(
    v instanceof Date ||
    v instanceof ObjectId ||
    Buffer.isBuffer(v)
  );
}

/**
 * Gắn `id` (chuỗi) vào mọi object có `_id` trong response.
 *
 * Getter `id` không đi qua JSON.stringify, nên FE chỉ nhận `_id` — nút
 * "Xem & duyệt" gọi `/phe-duyet/undefined` và báo "Không tìm thấy".
 */
export function kemId(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(kemId);
  if (!v || typeof v !== 'object' || !laObjectThuong(v)) return v;

  const ra: Record<string, unknown> = {};
  for (const [k, gt] of Object.entries(v)) ra[k] = kemId(gt);
  const id = idCua(v as { _id?: unknown });
  if (id && ra.id === undefined) ra.id = id;
  return ra;
}
