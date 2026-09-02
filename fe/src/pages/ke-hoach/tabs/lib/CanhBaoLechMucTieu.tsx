import React, { useMemo } from "react";
import { Alert } from "antd";
import { tongLech, type HangBang } from "./tongHop";
import { tien } from "./cotChung";

/**
 * Cảnh báo cấp bảng — đặt phía trên bảng, chỗ dễ nhìn nhất.
 *
 * Chỉ cảnh báo, KHÔNG chặn lưu: kế hoạch được lập dần trong nhiều buổi, chặn
 * lưu khi chưa phân bổ đủ sẽ làm mất công gõ dở.
 *
 * Phần lệch của từng dòng nằm ở nền đỏ của chính dòng đó và ở ô CẢ NĂM tô màu;
 * ở đây chỉ nói tổng, để người dùng biết còn bao nhiêu phải chia trước khi cuộn
 * xuống tìm dòng đỏ.
 *
 * Gói gọn trong MỘT dòng (`banner`, không dùng `description`): bảng kế hoạch
 * cuộn cả hai chiều, mỗi dòng chiều cao nhường cho cảnh báo là một dòng dữ
 * liệu người dùng không nhìn thấy.
 */
export const CanhBaoLechMucTieu: React.FC<{
  rows: HangBang<unknown>[];
}> = ({ rows }) => {
  const lech = useMemo(() => tongLech(rows), [rows]);

  if (lech.soDongLech === 0) return null;

  return (
    <Alert
      type="error"
      showIcon
      banner
      className="kh-canh-bao"
      message={
        <span className="text-xs">
          Kế hoạch chưa khớp mục tiêu năm
          {lech.thieu > 0 && (
            <>
              {" — còn cần phân bổ "}
              <b className="text-red-600">{tien(lech.thieu)} ₫</b>
            </>
          )}
          {lech.vuot > 0 && (
            <>
              {lech.thieu > 0 ? ", " : " — "}
              {"phân bổ vượt "}
              <b className="text-green-600">{tien(lech.vuot)} ₫</b>
            </>
          )}
          {` · ${lech.soDongLech} dòng lệch`}
        </span>
      }
    />
  );
};
