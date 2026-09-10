# Nguồn icon — đặt file SVG gốc ở đây

Đây là **nguồn duy nhất** cho bộ nhận diện app. Từ đây sinh ra component React
cho cả hai repo (`ke-toan-so/fe` và `identity-service/portal`); sửa icon thì sửa
file ở đây trước, đừng sửa thẳng trong component.

## Tên file phải đặt đúng

| File | Dùng cho |
|---|---|
| `masterceo-mark.svg` | Dấu M của MasterCeo — chỉ hình, KHÔNG kèm chữ "MASTERCEO" |
| `ke-toan.svg` | Glyph app Tài chính |
| `giao-viec.svg` | Glyph app Giao việc |
| `nhan-su.svg` | Glyph app Nhân sự |

Tên file trùng `appId` bên Identity (`ke-toan`, `giao-viec`, `nhan-su`) — appId là
khoá SSO, không đổi được, nên bám theo nó là an toàn nhất.

## Yêu cầu với file glyph app

- Chỉ **hình bên trong ô**, không vẽ ô bo tròn và không vẽ nền gradient — phần
  đó do code dựng theo quy cách (bo góc 27% cạnh, glyph 55% cạnh).
- Hình **một màu trắng đặc**, không viền, không đổ bóng.
- `viewBox` vuông, gốc `0 0`.
- Xuất dạng `path`, không dùng `<image>` nhúng ảnh raster.

## Riêng dấu M MasterCeo — CÒN THIẾU

Vẽ đúng phần chữ M (teal + vàng), **bỏ chữ "MASTERCEO" bên dưới** — chữ đã có
riêng bằng text trên header rồi, để trong ảnh nữa là lặp và ở 28px sẽ nhoè.
Giữ nguyên hai màu, không cần đổi thành trắng.

Vùng cần lấy, đo trên `fe/public/logo.jpg` (480×480): **x 130–350, y 77–248**.
Dưới `y = 248` là khoảng trắng rồi tới dòng chữ "MASTERCEO" (y 284–337) — phần
đó KHÔNG lấy.

Chưa có file này thì header portal vẫn dùng `logo.jpg` như cũ (Task 12 trong
`docs/superpowers/plans/2026-09-10-dong-bo-giao-dien.md` đang chờ).
