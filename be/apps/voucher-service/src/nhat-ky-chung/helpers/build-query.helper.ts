import { NhatKyChungQueryDto } from '../dto';

export function buildMongoQuery(
  query: NhatKyChungQueryDto,
  tenantId?: string,
): Record<string, unknown> {
  const { search, startDate, endDate, loai } = query;
  const mongoQuery: Record<string, unknown> = {};

  // Add tenantId filter if provided
  if (tenantId) {
    mongoQuery.tenantId = tenantId;
  }

  // Filter by loai (voucher type)
  if (loai) {
    mongoQuery.loai = loai;
  }

  // Filter by date range
  if (startDate || endDate) {
    mongoQuery.ngay = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      (mongoQuery.ngay as Record<string, Date>).$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (mongoQuery.ngay as Record<string, Date>).$lte = end;
    }
  }

  // Use MongoDB text search if search keyword provided
  if (search) {
    mongoQuery.$text = { $search: search };
  }

  return mongoQuery;
}
