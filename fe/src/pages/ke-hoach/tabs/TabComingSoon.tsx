import React from "react";
import { Result } from "antd";
import { RocketOutlined } from "@ant-design/icons";

/**
 * Khung "Sắp có" dùng bên trong tab. Không dùng `pages/ComingSoon.tsx` vì component
 * đó tra tiêu đề theo `location.pathname` — chuyển tab thì pathname không đổi.
 */
export const TabComingSoon: React.FC<{ tieuDe: string }> = ({ tieuDe }) => (
  <Result
    icon={<RocketOutlined className="text-primary" />}
    title={tieuDe}
    subTitle="Bảng này đang được xây dựng."
  />
);
