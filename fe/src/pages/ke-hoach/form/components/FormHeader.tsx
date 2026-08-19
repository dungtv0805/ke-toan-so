import React from "react";
import { DatePicker, Select, Input, Tag } from "antd";
import dayjs from "dayjs";
import { ngayLuu } from "../../lib/keHoachRow";
import { useKeHoachFormHandler, useKeHoachFormState } from "../KeHoachFormHandlerContext";
import type { KeHoachFormHeader } from "../form-handler/sub-handler/init/init.state";
import type { DongKeHoach } from "../lib/keHoachFormRows";

const tien = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

/** Thông tin dùng chung cho cả lô — bố cục bám đúng FormHeader của chứng từ. */
export const FormHeader: React.FC = () => {
  const handler = useKeHoachFormHandler();
  const [header] = useKeHoachFormState("header");
  const [phienBanList] = useKeHoachFormState("phienBanList", []);
  const [dongList] = useKeHoachFormState("dongList", []);

  const h = (header ?? {}) as KeHoachFormHeader;
  const tongTien = ((dongList ?? []) as DongKeHoach[]).reduce(
    (s, d) => s + (Number(d.soTien) || 0),
    0,
  );

  const doi = (field: keyof KeHoachFormHeader, value: unknown) =>
    handler.executeEvent("updateHeader", { field, value });

  return (
    <div className="nkc-header-form">
      <div className="flex flex-wrap gap-3 items-end mb-2">
        <div className="nkc-field" style={{ minWidth: 120 }}>
          <label className="nkc-label">Loại</label>
          <Tag color={h.loaiKeHoach === "DU_BAO" ? "purple" : "blue"} className="mt-1">
            {h.loaiKeHoach === "DU_BAO" ? "Dự báo" : "Kế hoạch"}
          </Tag>
        </div>

        <div className="nkc-field flex-1" style={{ minWidth: 180 }}>
          <label className="nkc-label">Phiên bản</label>
          <Select
            size="small"
            className="w-full"
            allowClear
            showSearch
            placeholder="Mặc định"
            // Cho gõ tên phiên bản mới ngay tại đây, không cần khai báo trước.
            mode="tags"
            maxCount={1}
            value={h.phienBan ? [h.phienBan] : []}
            options={((phienBanList ?? []) as string[]).map((p) => ({ value: p, label: p }))}
            onChange={(v: string[]) => doi("phienBan", v[v.length - 1])}
          />
        </div>

        <div className="nkc-field" style={{ minWidth: 150 }}>
          <label className="nkc-label">Ngày mặc định</label>
          <DatePicker
            size="small"
            className="w-full"
            format="DD/MM/YYYY"
            allowClear={false}
            value={h.ngayMacDinh ? dayjs(h.ngayMacDinh) : undefined}
            onChange={(d) => doi("ngayMacDinh", d ? ngayLuu(d) : undefined)}
          />
        </div>

        <div className="nkc-field flex-1" style={{ minWidth: 220 }}>
          <label className="nkc-label">Diễn giải chung</label>
          <Input
            size="small"
            placeholder="Dòng nào bỏ trống diễn giải sẽ lấy nội dung này"
            value={h.dienGiaiChung ?? ""}
            onChange={(e) => doi("dienGiaiChung", e.target.value)}
          />
        </div>

        <div className="nkc-field" style={{ minWidth: 140 }}>
          <label className="nkc-label">Tổng tiền</label>
          <div className="font-semibold text-base">{tien(tongTien)}</div>
        </div>
      </div>
    </div>
  );
};
