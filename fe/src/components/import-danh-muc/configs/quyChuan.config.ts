import { quyChauanService } from "@/services/quyChaunService";
import { loaiGiaoDichService } from "@/services/loaiGiaoDichService";
import { hoSoChungTuService } from "@/services/hoSoChungTuService";
import { dongTienService } from "@/services/dongTienService";
import { nhomKhoanMucService } from "@/services/nhomKhoanMucService";
import { khoanMucCompleteSource, taiKhoanCompleteSource } from "./completeSetSources";
import type { ImportDanhMucConfig } from "../types";

export const quyChuanImportConfig: ImportDanhMucConfig = {
  title: "Quy chuẩn hạch toán",
  resource: "quy-chuan",
  apiPrefix: "/config",
  service: quyChauanService,
  // Không có cột mã — một nghiệp vụ là duy nhất trong phạm vi một loại giao dịch.
  uniqueBy: ["loaiGiaoDich", "nghiepVu"],
  columns: [
    {
      key: "loaiGiaoDich",
      header: "Mã loại giao dịch",
      required: true,
      example: "LGD01",
      ref: {
        service: loaiGiaoDichService,
        matchBy: "ma",
        label: "Loại giao dịch",
        displayField: "ten",
        assign: (found) => ({ loaiGiaoDich: String(found.ma ?? "") }),
      },
    },
    { key: "nghiepVu", header: "Nghiệp vụ", required: true, example: "Thu tiền khách hàng" },
    {
      key: "taiKhoanNo",
      header: "TK Nợ",
      required: true,
      example: "1111",
      ref: {
        // Fix 1: 150-800 tài khoản thật vượt xa 100 dòng của taiKhoanService.getAll() —
        // gần như mọi dòng sẽ báo "Tài khoản Nợ ... không tồn tại" nếu dùng service gốc.
        service: taiKhoanCompleteSource,
        matchBy: "ma",
        label: "Tài khoản Nợ",
        displayField: "ten",
        assign: (found) => ({ taiKhoanNo: String(found.ma ?? "") }),
      },
    },
    {
      key: "taiKhoanCo",
      header: "TK Có",
      required: true,
      example: "1311",
      ref: {
        // Fix 1: cùng lý do — dùng nguồn đầy đủ, không phải taiKhoanService.getAll() (100 dòng).
        service: taiKhoanCompleteSource,
        matchBy: "ma",
        label: "Tài khoản Có",
        displayField: "ten",
        assign: (found) => ({ taiKhoanCo: String(found.ma ?? "") }),
      },
    },
    {
      key: "hoSo",
      header: "Mã hồ sơ chứng từ",
      example: "HS01, HS02",
      ref: {
        service: hoSoChungTuService,
        matchBy: "ma",
        label: "Hồ sơ chứng từ",
        displayField: "ten",
        multi: true,
        assign: (found) => ({
          hoSoChungTu: found.map((f) => ({
            id: String(f.id ?? ""),
            ma: String(f.ma ?? ""),
            ten: String(f.ten ?? ""),
          })),
        }),
      },
    },
    // Bốn trường phân bổ. File import KHÔNG áp luật "bắt buộc theo fieldRules của
    // tài khoản" (luật đó chỉ chạy ở form nhập tay) — nhập hàng loạt mà chặn giữa
    // chừng thì không dùng được; ở đây chỉ kiểm mã có tồn tại hay không.
    {
      key: "nhomKhoanMuc",
      header: "Mã nhóm khoản mục",
      example: "NKM01",
      ref: {
        service: nhomKhoanMucService,
        matchBy: "ma",
        label: "Nhóm khoản mục",
        displayField: "ten",
        assign: (found) => ({ nhomKhoanMuc: String(found.ma ?? "") }),
      },
    },
    {
      key: "khoanMuc",
      header: "Mã khoản mục",
      example: "KM01",
      ref: {
        // Cùng lý do như TK: khoanMucService.getAll() chỉ trả 100 dòng.
        service: khoanMucCompleteSource,
        matchBy: "ma",
        label: "Khoản mục",
        displayField: "ten",
        assign: (found) => ({ khoanMuc: String(found.ma ?? "") }),
      },
    },
    {
      key: "dongTien",
      header: "Mã dòng tiền",
      example: "DT01",
      ref: {
        service: dongTienService,
        matchBy: "ma",
        label: "Dòng tiền",
        displayField: "ten",
        assign: (found) => ({ dongTien: String(found.ma ?? "") }),
      },
    },
    {
      key: "loaiChiPhi",
      header: "Loại chi phí",
      type: "enum",
      enumValues: [
        { label: "Chi phí cố định", value: "CO_DINH" },
        { label: "Chi phí biến đổi", value: "BIEN_DOI" },
      ],
      example: "Chi phí cố định",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
