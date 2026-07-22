import { taiKhoanService } from "@/services/taiKhoanService";
import { khoanMucService } from "@/services/khoanMucService";
import { nganHangService } from "@/services/nganHangService";
import type { RefSource } from "../types";

/**
 * Nguồn dữ liệu ĐẦY ĐỦ cho 3 danh mục mà module import dùng để (a) dò trùng
 * (`ImportDanhMucConfig.service`) và/hoặc (b) dò mã tham chiếu (`RefSpec.service`):
 * Tài khoản, Khoản mục, Ngân hàng & Quỹ.
 *
 * `taiKhoanService.getAll()`, `khoanMucService.getAll()`, `nganHangService.getAll()` đều
 * là shim @deprecated gọi `getPaginated({ limit: 100 })` — chỉ 100 bản ghi đầu. Một bảng
 * hệ thống tài khoản Việt Nam thật có 150-800 tài khoản, nên dùng thẳng getAll() ở đây sẽ:
 *   - Quy chuẩn hạch toán: hầu hết dòng báo lỗi "Tài khoản Nợ/Có ... không tồn tại" vì
 *     tài khoản thật nằm ngoài 100 bản ghi đầu ⇒ nút Import khoá vĩnh viễn.
 *   - Tài khoản: cột "Số tài khoản cha" lỗi tương tự, VÀ việc dò trùng chỉ thấy 100 bản ghi
 *     đầu nên dòng trùng thật vẫn hiện "Hợp lệ" ở preview, chỉ bị BE từ chối — sai hợp đồng
 *     "dò trùng ngay ở preview" của tính năng.
 *   - Khoản mục, Ngân hàng & Quỹ: mất khả năng dò trùng với các bản ghi từ thứ 101 trở đi.
 *
 * KHÔNG sửa hành vi của 3 getAll() gốc (nơi khác trong app có thể đang cố ý dựa vào giới hạn
 * 100 dòng đó) — thay vào đó cung cấp một nguồn khác ở tầng config, đúng như `RefSource`
 * (`{ getAll(): Promise<RefItem[]> }`) yêu cầu, không hơn không kém.
 */

/**
 * Tài khoản: BE có sẵn endpoint trả TRỌN VẸN tập active — `/tai-khoan/hierarchy`
 * (be/apps/master-data-service/src/tai-khoan/tai-khoan.service.ts: getHierarchy() →
 * findAll() không giới hạn, chỉ lọc isActive + tenant). Dùng thẳng endpoint có sẵn này
 * thay vì bịa thêm limit lớn.
 */
export const taiKhoanCompleteSource: RefSource = {
  getAll: () => taiKhoanService.getHierarchy(),
};

/**
 * Khoản mục: khác với 18 danh mục anh em (bo-phan, chu-dau-tu, du-an, ...),
 * `khoan-muc.controller.ts` KHÔNG có route `/all` trả trọn bộ — chỉ có `GET /` phân trang
 * và `GET /loai/:loai` (cũng phân trang, mặc định limit=100). Không tự thêm route BE (nằm
 * ngoài phạm vi được phép sửa), nên xin hẳn một trang lớn qua endpoint phân trang có sẵn —
 * `PaginationQueryDto.limit` không giới hạn trên (chỉ @Min(1)) nên đây là lựa chọn hợp lệ,
 * KHÔNG phải endpoint "trọn vẹn" thật sự. Nếu số khoản mục thật vượt ngưỡng này, cần BE bổ
 * sung route '/all' giống 18 danh mục kia.
 */
const KHOAN_MUC_COMPLETE_LIMIT = 10000;
export const khoanMucCompleteSource: RefSource = {
  getAll: async () =>
    (await khoanMucService.getPaginated({ limit: KHOAN_MUC_COMPLETE_LIMIT })).data,
};

/**
 * Ngân hàng & Quỹ: cùng tình trạng như Khoản mục — `ngan-hang.controller.ts` không có
 * route '/all'. Dùng cùng cách xin trang lớn qua `getPaginated`, cùng lý do như trên.
 */
const NGAN_HANG_COMPLETE_LIMIT = 10000;
export const nganHangCompleteSource: RefSource = {
  getAll: async () =>
    (await nganHangService.getPaginated({ limit: NGAN_HANG_COMPLETE_LIMIT })).data,
};
