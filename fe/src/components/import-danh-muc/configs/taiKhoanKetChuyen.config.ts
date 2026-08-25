import { taiKhoanKetChuyenService } from "@/services/taiKhoanKetChuyenService";
import type { ImportDanhMucConfig } from "../types";

export const taiKhoanKetChuyenImportConfig: ImportDanhMucConfig = {
  title: "Tài khoản kết chuyển",
  resource: "tai-khoan-ket-chuyen",
  service: taiKhoanKetChuyenService,
  uniqueBy: ["ma"],
  columns: [
    { key: "thuTu", header: "Thứ tự kết chuyển", required: true, example: "10" },
    { key: "ma", header: "Mã kết chuyển", required: true, example: "511-911" },
    { key: "taiKhoanTu", header: "Kết chuyển từ", required: true, example: "511" },
    // Snapshot tên tài khoản: entity giữ hai field này để danh sách vẫn đọc được tên
    // kể cả khi danh mục Tài khoản đổi tên sau đó. Không bắt buộc để file cũ vẫn nhập được.
    { key: "tenTaiKhoanTu", header: "Tên tài khoản kết chuyển từ", example: "Doanh thu bán hàng và cung cấp dịch vụ" },
    { key: "taiKhoanDen", header: "Kết chuyển đến", required: true, example: "911" },
    { key: "tenTaiKhoanDen", header: "Tên tài khoản kết chuyển đến", example: "Xác định kết quả kinh doanh" },
    // BE ràng @IsIn(['NO','CO','HAI_BEN']) nhưng danh sách và file xuất Excel của trang này
    // hiển thị "Nợ/Có/Hai bên", nên người dùng gõ tiếng Việt là chuyện đương nhiên. Để cột
    // kiểu chuỗi thì chữ đó đi thẳng lên BE và quay về đúng một câu chung chung
    // "Dữ liệu không hợp lệ ở các trường: ben". Khai enum để FE quy đổi trước khi gửi,
    // đồng thời file mẫu có dropdown và preview báo lỗi kèm gợi ý ngay tại dòng sai.
    // Mã thô NO/CO/HAI_BEN vẫn nhận được vì resolveEnum khớp cả `value`.
    {
      key: "ben",
      header: "Bên kết chuyển",
      // Tên cột cũ của file mẫu trước khi cột này thành enum — giữ để file đã tải vẫn nhập được.
      headerAliases: ["Bên kết chuyển (NO/CO/HAI_BEN)"],
      required: true,
      type: "enum",
      enumValues: [
        { label: "Nợ", value: "NO" },
        { label: "Có", value: "CO" },
        { label: "Hai bên", value: "HAI_BEN" },
      ],
      example: "Có",
    },
    { key: "dienGiai", header: "Diễn giải", example: "Kết chuyển doanh thu bán hàng và cung cấp dịch vụ" },
  ],
};
