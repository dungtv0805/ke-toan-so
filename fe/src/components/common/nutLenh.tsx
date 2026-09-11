import type { ReactNode } from "react";
import { Button, Tooltip } from "antd";
import type { ButtonProps } from "antd";

/**
 * Nút lệnh trên thanh công cụ: đủ chữ trên màn rộng, CHỈ ICON khi `gon`
 * (thường là `useManHinh() === "mobile"`) — lúc đó nhãn chuyển vào Tooltip và
 * `aria-label` để trình đọc màn hình vẫn đọc được. Hai nút dùng chung một icon
 * (vd Import / Xuất Excel) thì trang tự đổi icon khi gọn cho khỏi nhầm.
 */
export const nutLenh = (
  gon: boolean,
  nhan: string,
  props: ButtonProps & { icon: ReactNode },
) =>
  gon ? (
    <Tooltip title={nhan}>
      <Button {...props} aria-label={nhan} />
    </Tooltip>
  ) : (
    <Button {...props}>{nhan}</Button>
  );
