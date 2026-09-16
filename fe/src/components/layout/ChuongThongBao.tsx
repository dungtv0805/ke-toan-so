import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Dropdown, Empty, List, Space, Tag, Tooltip, Typography } from "antd";
import { BellOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { thongBaoService, type LoaiThongBao, type ThongBao } from "@/services/thongBaoService";

const { Text } = Typography;

const MAU: Record<LoaiThongBao, string> = {
  DEN_LUOT_DUYET: "processing",
  BI_TRA_LAI: "orange",
  BI_TU_CHOI: "red",
  HOAN_THANH: "green",
};

const NHAN: Record<LoaiThongBao, string> = {
  DEN_LUOT_DUYET: "Chờ duyệt",
  BI_TRA_LAI: "Trả lại",
  BI_TU_CHOI: "Từ chối",
  HOAN_THANH: "Đã xong",
};

/** Nhịp hỏi máy chủ. 60 giây đủ nhanh cho luồng duyệt mà không quấy server. */
const NHIP_MS = 60_000;

/**
 * Chuông thông báo — mục 13 tài liệu Phê duyệt nghiệp vụ.
 *
 * Hỏi máy chủ theo nhịp thay vì đẩy realtime: hệ thống chưa có WebSocket, và
 * phê duyệt là việc tính bằng giờ chứ không phải giây.
 */
export function ChuongThongBao() {
  const navigate = useNavigate();
  const [soChuaDoc, setSoChuaDoc] = useState(0);
  const [danhSach, setDanhSach] = useState<ThongBao[]>([]);
  const [dangMo, setDangMo] = useState(false);

  const demLai = useCallback(async () => {
    try {
      const res = await thongBaoService.demChuaDoc();
      setSoChuaDoc(res?.soLuong ?? 0);
    } catch {
      // Người dùng chưa được cấp quyền, hoặc service chưa chạy — im lặng.
      // Chuông là tiện ích phụ, không được phép làm vỡ thanh tiêu đề.
    }
  }, []);

  useEffect(() => {
    void demLai();
    const t = setInterval(demLai, NHIP_MS);
    return () => clearInterval(t);
  }, [demLai]);

  const mo = async (open: boolean) => {
    setDangMo(open);
    if (!open) return;
    try {
      setDanhSach((await thongBaoService.danhSach()) ?? []);
    } catch {
      setDanhSach([]);
    }
  };

  const bam = async (tb: ThongBao) => {
    setDangMo(false);
    try {
      if (!tb.daDoc) await thongBaoService.danhDauDaDoc(tb.id);
    } finally {
      void demLai();
      if (tb.duongDan) navigate(tb.duongDan);
    }
  };

  const docHet = async () => {
    await thongBaoService.danhDauTatCa();
    setDanhSach((ds) => ds.map((t) => ({ ...t, daDoc: true })));
    void demLai();
  };

  return (
    <Dropdown
      open={dangMo}
      onOpenChange={mo}
      trigger={["click"]}
      placement="bottomRight"
      dropdownRender={() => (
        <div
          style={{
            width: 360,
            maxHeight: 420,
            overflow: "auto",
            background: "var(--ant-color-bg-elevated, #fff)",
            borderRadius: 9,
            boxShadow: "0 6px 16px rgba(0,0,0,.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              borderBottom: "1px solid #E5E5EA",
            }}
          >
            <Text strong>Thông báo</Text>
            {soChuaDoc > 0 && (
              <Button type="link" size="small" onClick={docHet}>
                Đánh dấu đã đọc hết
              </Button>
            )}
          </div>
          {!danhSach.length ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có thông báo"
              style={{ padding: 24 }}
            />
          ) : (
            <List<ThongBao>
              size="small"
              dataSource={danhSach}
              renderItem={(tb) => (
                <List.Item
                  onClick={() => bam(tb)}
                  style={{
                    cursor: "pointer",
                    padding: "8px 12px",
                    background: tb.daDoc ? undefined : "rgba(31,119,105,.06)",
                  }}
                >
                  <Space direction="vertical" size={0} style={{ width: "100%" }}>
                    <Space size={4}>
                      <Tag color={MAU[tb.loai]} style={{ marginInlineEnd: 0 }}>
                        {NHAN[tb.loai] ?? tb.loai}
                      </Tag>
                      <Text strong style={{ fontSize: 12 }}>
                        {tb.tieuDe}
                      </Text>
                    </Space>
                    {tb.noiDung && (
                      <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                        {tb.noiDung}
                      </Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {dayjs(tb.createdAt).format("DD/MM/YYYY HH:mm")}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </div>
      )}
    >
      <Tooltip title="Thông báo phê duyệt">
        <Badge count={soChuaDoc} size="small" offset={[-2, 2]}>
          <Button
            type="text"
            icon={<BellOutlined />}
            className="!text-muted-foreground hover:!text-foreground"
          />
        </Badge>
      </Tooltip>
    </Dropdown>
  );
}
