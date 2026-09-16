import React, { useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Input,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  CloseOutlined,
  PaperClipOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { BuocPheDuyet, LichSuPheDuyet } from "@/services/pheDuyetService";
import { HoSoDinhKem } from "../ho-so/HoSoDinhKem";
import { formatCurrency } from "@/pages/chung-tu/phieu/lib/format";
import {
  dinhDangThoiLuong,
  MAU_BUOC,
  mauTrangThai,
  nhanTrangThai,
  NHAN_BUOC,
} from "../../../lib/thoiGian";
import {
  useChoToiDuyetHandler,
  useChoToiDuyetState,
} from "../../ChoToiDuyetHandlerContext";
import "./ChiTietDrawer.state";

const { Text } = Typography;

const NHAN_KET_QUA: Record<string, string> = {
  GUI_DUYET: "Gửi phê duyệt",
  DUYET: "Duyệt",
  TRA_LAI: "Trả lại / yêu cầu bổ sung",
  TU_CHOI: "Từ chối",
  SUA_TRONG_YEU: "Sửa nội dung trọng yếu",
};

const MAU_KET_QUA: Record<string, string> = {
  GUI_DUYET: "blue",
  DUYET: "green",
  TRA_LAI: "orange",
  TU_CHOI: "red",
  SUA_TRONG_YEU: "purple",
};

const gioPhut = (v?: string) => (v ? dayjs(v).format("DD/MM HH:mm") : "—");

/** Màn hình chi tiết phê duyệt — mục 7 và 8. */
export function ChiTietDrawer() {
  const handler = useChoToiDuyetHandler();
  const [dangMoId] = useChoToiDuyetState("dangMoId", null);
  const [chiTiet] = useChoToiDuyetState("chiTiet", null);
  const [lichSu] = useChoToiDuyetState("lichSu", []);
  const [dangTaiChiTiet] = useChoToiDuyetState("dangTaiChiTiet", false);
  const [dangXuLy] = useChoToiDuyetState("dangXuLy", false);

  const [yKien, setYKien] = useState("");

  const dong = () => {
    setYKien("");
    handler.executeEvent("dongChiTiet", {});
  };

  const xuLy = (hanhDong: "DUYET" | "TRA_LAI" | "TU_CHOI") => {
    if (!dangMoId) return;
    handler
      .executeEvent("xuLyPheDuyet", { id: dangMoId, hanhDong, yKien })
      .then((ok) => {
        if (ok) setYKien("");
      });
  };

  const cotBuoc: ColumnsType<BuocPheDuyet> = [
    { title: "Cấp", dataIndex: "thuTu", width: 50 },
    { title: "Vị trí", dataIndex: "viTriTen", width: 160 },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      width: 120,
      render: (v: string) => <Tag color={MAU_BUOC[v]}>{NHAN_BUOC[v] ?? v}</Tag>,
    },
    {
      title: "Người xử lý",
      dataIndex: "nguoiXuLyTen",
      width: 150,
      render: (v?: string, r?: BuocPheDuyet) => v || r?.nguoiXuLyId || "—",
    },
    // Hai mốc của mục 9. Thiếu cột "Bắt đầu chờ" thì không nhìn ra cấp nào
    // giữ hồ sơ lâu, chỉ thấy mốc duyệt.
    { title: "Bắt đầu chờ", dataIndex: "batDauCho", width: 110, render: gioPhut },
    { title: "Thời điểm duyệt", dataIndex: "thoiDiemXuLy", width: 120, render: gioPhut },
    {
      title: "Thời gian xử lý",
      dataIndex: "thoiGianXuLyGiay",
      width: 150,
      render: (v?: number) => dinhDangThoiLuong(v),
    },
    { title: "Ý kiến", dataIndex: "yKien", ellipsis: true, render: (v?: string) => v || "—" },
  ];

  const canXuLy = chiTiet?.trangThai === "CHO_PHE_DUYET";

  return (
    <Drawer
      open={!!dangMoId}
      onClose={dong}
      width={920}
      title={
        chiTiet ? (
          <Space>
            <span>{chiTiet.soPhieu || "Nghiệp vụ"}</span>
            <Tag color={mauTrangThai(chiTiet.trangThai)}>
              {nhanTrangThai(chiTiet.trangThai)}
            </Tag>
            {chiTiet.phienBan > 1 && (
              <Tag color="purple">Phiên bản {chiTiet.phienBan}</Tag>
            )}
          </Space>
        ) : (
          "Chi tiết phê duyệt"
        )
      }
      footer={
        canXuLy ? (
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={dangXuLy}
              onClick={() => xuLy("DUYET")}
            >
              Duyệt
            </Button>
            <Button
              icon={<RollbackOutlined />}
              loading={dangXuLy}
              onClick={() => xuLy("TRA_LAI")}
            >
              Yêu cầu bổ sung / Trả lại
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              loading={dangXuLy}
              onClick={() => xuLy("TU_CHOI")}
            >
              Từ chối
            </Button>
          </Space>
        ) : null
      }
    >
      {dangTaiChiTiet ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : !chiTiet ? (
        <Empty description="Không đọc được nghiệp vụ" />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {chiTiet.phienBan > 1 && (
            <Alert
              type="warning"
              showIcon
              message="Nghiệp vụ đã bị sửa nội dung trọng yếu sau khi có cấp duyệt"
              description="Toàn bộ phê duyệt trước đó đã bị huỷ, luồng chạy lại từ cấp 1. Xem mục Lịch sử bên dưới."
            />
          )}

          <Descriptions size="small" bordered column={2} title="Thông tin nghiệp vụ">
            <Descriptions.Item label="Số phiếu">{chiTiet.soPhieu || "—"}</Descriptions.Item>
            <Descriptions.Item label="Loại nghiệp vụ">
              {chiTiet.loaiNghiepVuTen || chiTiet.loaiNghiepVuMa}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày nghiệp vụ">
              {chiTiet.ngayNghiepVu ? dayjs(chiTiet.ngayNghiepVu).format("DD/MM/YYYY") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Số tiền">
              <Text strong>{formatCurrency(Number(chiTiet.soTien) || 0)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Diễn giải" span={2}>
              {chiTiet.noiDung || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Người lập">
              {chiTiet.nguoiLapTen || chiTiet.nguoiLapId || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Bộ phận">{chiTiet.boPhan || "—"}</Descriptions.Item>
            <Descriptions.Item label="Gửi duyệt lúc">
              {chiTiet.ngayGuiDuyet ? dayjs(chiTiet.ngayGuiDuyet).format("DD/MM/YYYY HH:mm") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng thời gian phê duyệt">
              {chiTiet.ngayHoanThanh && chiTiet.ngayGuiDuyet
                ? dinhDangThoiLuong(
                    dayjs(chiTiet.ngayHoanThanh).diff(dayjs(chiTiet.ngayGuiDuyet), "second"),
                  )
                : "Chưa xong"}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Divider titlePlacement="start" plain>
              Luồng phê duyệt
            </Divider>
            <Table<BuocPheDuyet>
              rowKey="thuTu"
              size="small"
              pagination={false}
              dataSource={chiTiet.buoc ?? []}
              columns={cotBuoc}
              scroll={{ x: 900 }}
            />
          </div>

          <div>
            <Divider titlePlacement="start" plain>
              <PaperClipOutlined /> Hồ sơ / chứng từ kèm theo
            </Divider>
            <HoSoDinhKem
              quyTrinh={chiTiet}
              onThayDoi={(moi) => handler.executeEvent("capNhatChiTiet", { quyTrinh: moi })}
              chiXem={
                chiTiet.trangThai === "CHINH_THUC" ||
                chiTiet.trangThai === "DA_KIEM_SOAT"
              }
            />
          </div>

          <div>
            <Divider titlePlacement="start" plain>
              Lịch sử
            </Divider>
            <Timeline
              items={(lichSu ?? []).map((d: LichSuPheDuyet) => ({
                color: MAU_KET_QUA[d.ketQua] ?? "gray",
                children: (
                  <Space direction="vertical" size={0}>
                    <Text strong>
                      {NHAN_KET_QUA[d.ketQua] ?? d.ketQua}
                      {d.viTriTen ? ` — ${d.viTriTen}` : ""}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {gioPhut(d.thoiDiemXuLy ?? d.createdAt)}
                      {d.nguoiXuLyTen ? ` · ${d.nguoiXuLyTen}` : ""}
                      {d.thoiGianXuLyGiay !== undefined
                        ? ` · xử lý trong ${dinhDangThoiLuong(d.thoiGianXuLyGiay)}`
                        : ""}
                      {` · phiên bản ${d.phienBan}`}
                    </Text>
                    {d.yKien && <Text italic>“{d.yKien}”</Text>}
                  </Space>
                ),
              }))}
            />
          </div>

          {canXuLy && (
            <div>
              <Divider titlePlacement="start" plain>
                Ý kiến của bạn
              </Divider>
              <Input.TextArea
                rows={3}
                value={yKien}
                onChange={(e) => setYKien(e.target.value)}
                placeholder="Bắt buộc nhập khi trả lại hoặc từ chối"
              />
            </div>
          )}
        </Space>
      )}
    </Drawer>
  );
}
