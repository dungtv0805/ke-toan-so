# Phê duyệt nghiệp vụ — thiết kế

Nguồn: `docs/Yeu_cau_chuc_nang_phe_duyet_nghiep_vu_Master_CEO.docx`.
Phạm vi đợt này: **đầy đủ mục 1–16**, áp dụng cho chứng từ kế toán (Nhật ký
chung / Phiếu thu / Phiếu chi). Engine viết tổng quát theo mục 17 để đợt sau
cắm thêm phiếu kho, đề xuất mua… không phải viết lại.

## Quyết định kiến trúc

| Vấn đề | Chọn | Vì sao |
|---|---|---|
| Engine đặt ở đâu | Module `phe-duyet` trong **config-service** | Vị trí phân quyền (`vai_tro`) và người dùng đã ở đây. Không đẻ microservice mới → không đụng gateway, PM2, env |
| Định danh nghiệp vụ | `loaiDoiTuong` + `doiTuongId` | Mục 17. Đợt 1 chỉ có `CHUNG_TU`; thêm loại = thêm 1 dòng bảng điều phối |
| Tên cấp duyệt | Dùng thẳng `vai_tro.ten` của công ty | Mục 2 + 3: không hard-code chức danh |
| Ai giữ vị trí | Bảng `vi_tri_phe_duyet_nguoi_dung` (nhiều–nhiều) | `app_user_roles` ràng 1 user = 1 vai trò/công ty → công ty nhỏ kẹt luồng 3 cấp |
| Gating báo cáo | Denormalize `trangThaiPheDuyet` lên `chung_tu` | Mọi báo cáo đã đi qua 1 file `nhat-ky-chung.service.ts`; `$lookup` mỗi báo cáo thì đắt |
| Ai ghi trạng thái lên chứng từ | config-service ghi thẳng (chung 1 MongoDB) | Bớt 1 hop HTTP và 1 kiểu lỗi; engine điều phối qua `DongBoTrangThaiService` |
| Thông báo | Bảng `thong_bao` + chuông trong app | Mục 13 không đòi email |

## Dữ liệu

`cau_hinh_phe_duyet` — ma trận mục 4. Một dòng = một loại nghiệp vụ.
`{ tenantId, loaiDoiTuong, loaiNghiepVuMa, buoc: [{thuTu, viTriTen, batBuoc}] }`

`vi_tri_phe_duyet_nguoi_dung` — ai đang giữ vị trí nào (mục 3).
`{ tenantId, viTriTen, userId, hoTen, isActive }`

`quy_trinh_phe_duyet` — một nghiệp vụ đang chạy. Trạng thái mục 10, mốc thời
gian mục 9, hồ sơ mục 8 nhúng trong đây.
`{ tenantId, loaiDoiTuong, doiTuongId, loaiNghiepVuMa, soPhieu, noiDung, soTien,
   nguoiLapId, nguoiLapTen, boPhan, trangThai, buocHienTai, phienBan,
   ngayGuiDuyet, ngayHoanThanh, buoc: [...], hoSo: [...] }`

`lich_su_phe_duyet` — append-only, mục 14. Sửa trọng yếu rồi duyệt lại vẫn giữ
nguyên vết cũ vì không bao giờ ghi đè.

`thong_bao` — mục 13.

`chung_tu` thêm 2 cột: `trangThaiPheDuyet`, `phienBanPheDuyet`.

## Luồng (mục 5)

1. Tạo chứng từ → `NHAP`.
2. `POST /phe-duyet/gui-duyet` → đọc cấu hình theo `loaiNghiepVuMa`, sinh các
   bước, bước 1 `DANG_CHO` + ghi `batDauCho`, các bước sau `CHUA_DEN_LUOT`.
   Bắn thông báo cho **đúng người giữ vị trí bước 1**.
3. Duyệt → ghi `nguoiXuLy` + `thoiDiemXuLy` + `thoiGianXuLyGiay`, rồi mới mở
   bước kế và ghi `batDauCho` của nó. Cấp sau trước đó không thấy gì.
4. Hết bước bắt buộc → `DA_KIEM_SOAT` → `CHINH_THUC`, ghi `ngayHoanThanh`,
   đồng bộ `chung_tu.trangThaiPheDuyet = CHINH_THUC`.
5. Trả lại → `YEU_CAU_BO_SUNG`, báo người lập. Từ chối → `TU_CHOI`.

## Sửa sau khi duyệt (mục 11)

`chung-tu.service` so trường trọng yếu trước/sau: `soTien`, `danhMuc.taiKhoanNo`,
`danhMuc.taiKhoanCo`, `danhMuc.doiTuong`, `noiDung`, `ngay`. Lệch → tăng
`phienBan`, ghi lịch sử `SUA_TRONG_YEU`, reset toàn bộ bước về đầu, trạng thái
về `CHO_PHE_DUYET`, chứng từ rời khỏi báo cáo chính thức.
Đang `CHO_PHE_DUYET` mà không phải người lập thì không cho sửa.

## Gating báo cáo (mục 12)

`nhat-ky-chung.service.ts`: mọi `$match` thêm điều kiện chỉ lấy
`trangThaiPheDuyet ∈ {CHINH_THUC, null}`. `null` = dữ liệu có trước tính năng
này — script `be/scripts/backfill-trang-thai-phe-duyet.js` gắn `CHINH_THUC`
cho toàn bộ chứng từ cũ. Màn Nhật ký chung truyền `baoGomChuaDuyet=1` để người
lập vẫn thấy phiếu nháp của mình.

## Màn hình

| Đường dẫn | Nội dung | Mục |
|---|---|---|
| `/phe-duyet/cho-toi-duyet` | Danh sách đến lượt tôi + Drawer chi tiết (`?id=`) | 6, 7 |
| `/phe-duyet/bao-cao-toc-do` | Thời gian xử lý theo vị trí / người / loại | 15 |
| `/cau-hinh/phe-duyet` | Ma trận cấu hình + gán người giữ vị trí | 3, 4 |
| Chuông trên header | Thông báo chưa đọc | 13 |
| Nhật ký chung / Phiếu thu / Phiếu chi | Cột trạng thái + nút Gửi phê duyệt | 5 |

## Nghiệm thu

10 điều kiện mục 16, mỗi điều kiện có test tự động ở `phe-duyet.engine.spec.ts`
hoặc `nhat-ky-chung` spec tương ứng.
