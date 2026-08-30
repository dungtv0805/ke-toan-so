import React from "react";
import KqkdPage from "../kqkd/KqkdPage";

/**
 * P&L KHÔNG KHẤU HAO — báo cáo độc lập, dùng chung toàn bộ khung của báo cáo
 * KQKD thực hiện.
 *
 * Không tạo nguồn dữ liệu mới: chỉ bật cờ để BE bỏ các phát sinh khấu hao
 * (khoản mục Khấu hao kèm tài khoản 214) ngay ở tầng đọc bút toán, trước khi
 * tổng hợp. Bút toán khấu hao vẫn nguyên trong sổ, báo cáo tài chính không đổi.
 */
const PnlKhongKhauHaoPage: React.FC = () => (
  <KqkdPage
    loaiTruKhauHao
    duongDanQuyen="/bao-cao/pnl-khong-khau-hao"
    tieuDe="P&L không khấu hao"
  />
);

export default PnlKhongKhauHaoPage;
