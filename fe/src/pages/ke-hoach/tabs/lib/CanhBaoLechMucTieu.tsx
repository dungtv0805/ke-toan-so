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
 * Phần lệch của từng dòng nằm ở cột CHÊNH LỆCH; ở đây chỉ nói tổng, để người
 * dùng biết còn bao nhiêu phải chia trước khi cuộn xuống tìm dòng đỏ.
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
      className="mb-2"
      message="Kế hoạch chi tiết chưa khớp với mục tiêu năm. Vui lòng kiểm tra các dòng được cảnh báo bên dưới."
      description={
        <span className="text-xs">
          {lech.thieu > 0 && (
            <>
              Còn cần phân bổ:{" "}
              <b className="text-red-600">{tien(lech.thieu)} ₫</b>
            </>
          )}
          {lech.thieu > 0 && lech.vuot > 0 && " · "}
          {lech.vuot > 0 && (
            <>
              Phân bổ vượt:{" "}
              <b className="text-green-600">{tien(lech.vuot)} ₫</b>
            </>
          )}
          {" · "}
          {lech.soDongLech} dòng lệch
        </span>
      }
    />
  );
};
