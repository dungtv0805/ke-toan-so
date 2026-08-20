/**
 * Bảng "Dữ liệu tổng hợp" hiện cột nào thì trang Thêm/Sửa chứng từ hiện đúng
 * những ô đó.
 *
 * Tắt bớt cột ở "Chọn cột" là người dùng đã nói rõ công ty mình không dùng những
 * chiều phân bổ đó — bắt họ kéo ngang qua hơn 20 cột mỗi lần nhập liệu là thừa.
 *
 * Nguồn dữ liệu là lựa chọn cột đã lưu của bảng danh sách (localStorage, khoá
 * `NKC_COT_PAGE_KEY`), nên hai màn không bao giờ lệch nhau.
 */
export const NKC_COT_PAGE_KEY = "nkc.entryList.v3";

/**
 * Ô trong trang Thêm/Sửa (key cột của bảng chi tiết, hoặc tên trường ở phần đầu
 * chứng từ) → các cột tương ứng ngoài bảng danh sách.
 *
 * Ô hiện khi CÓ ÍT NHẤT một cột liên quan đang hiện: ngoài bảng, mỗi danh mục
 * tách thành 2 cột "Mã" và "Tên"; tắt cột mã mà vẫn xem tên thì rõ ràng vẫn đang
 * dùng chiều đó.
 *
 * Ô KHÔNG khai ở đây (STT, nghiệp vụ, diễn giải, TK Nợ/Có, số tiền, ngày phát
 * sinh, loại giao dịch, nút thao tác) là xương sống của chứng từ — luôn hiện, vì
 * ẩn đi thì không lưu nổi chứng từ.
 */
export const COT_THEO_TRUONG: Record<string, readonly string[]> = {
  // Phần đầu chứng từ
  ngayGhiSo: ["ngayGhiSo"],
  nguoiGiaoDich: ["nguoiGiaoDich"],
  diaChi: ["diaChi"],
  // Bảng chi tiết hạch toán
  sanPhamId: ["sanPhamMa", "sanPham"],
  doiTuongId: ["doiTuongMa", "doiTuong"],
  doiTuong2Id: ["doiTuong2Ma", "doiTuong2"],
  duAnId: ["duAnMa", "duAn"],
  boPhanId: ["boPhanMa", "boPhan"],
  doiId: ["doiMa", "doi"],
  nhanVienId: ["nhanVienMa", "nhanVien"],
  dongTienId: ["dongTienMa", "dongTien"],
  khoanMucId: ["khoanMucMa", "khoanMuc"],
  nhomKhoanMuc: ["nhomKhoanMucMa", "nhomKhoanMuc"],
  nhomKhuyenMaiId: ["nhomKhuyenMaiMa", "nhomKhuyenMai"],
  nhomQuanLyId: ["nhomQuanLyMa", "nhomQuanLy"],
  hopDongId: ["hopDongSo", "hopDong"],
  soTaiKhoan: ["soTaiKhoan"],
  ghiChu: ["ghiChu"],
};

/**
 * @param cotHienThi danh sách key cột đang hiện; `null`/`undefined` = chưa từng
 *   chọn cột → hiện tất cả (đúng quy ước của `useColumnVisibility`).
 */
export function taoBoLocTruong(
  cotHienThi: readonly string[] | null | undefined
): (truong: string) => boolean {
  if (!cotHienThi) return () => true;
  const dangHien = new Set(cotHienThi);
  return (truong: string) => {
    const cot = COT_THEO_TRUONG[truong];
    if (!cot) return true;
    return cot.some((c) => dangHien.has(c));
  };
}
