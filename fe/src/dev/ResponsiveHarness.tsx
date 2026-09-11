import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Button, Col, ConfigProvider, Form, Input, Modal, Row, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import "@/index.css";
import "@/styles/responsive.css";
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { useManHinh, useManCamUng } from "@/hooks/useManHinh";
import { tokenTheoManHinh } from "@/config/tokenTheoManHinh";

/**
 * TRANG NGHIỆM THU responsive — chỉ chạy ở dev (`npm run dev` rồi mở
 * /responsive.harness.html, thêm `?modal=1` để mở sẵn popup). Không vào bản build.
 *
 * Dựng lại đúng khung `.app-content > .app-content-inner` của MainLayout với một
 * trang "cao một màn" (h-full + flex + overflow hidden) như trang Thực hiện, để
 * thấy các quy tắc toàn cục của styles/responsive.css:
 *
 *   ĐIỆN THOẠI (390px) coi là ĐẠT khi:
 *     1. Cả trang cuộn dọc; bảng không bị kẹp trong vùng vài chục px; thấy phân trang.
 *     2. Chỉ cột "Số CT" còn ghim; cột "Tên đối tượng" (ghim trái thứ hai) và cột
 *        "Thao tác" (ghim phải) chạy theo khi vuốt ngang.
 *     3. Ô tìm kiếm chiếm trọn một dòng; 2 ô lọc chia đôi dòng sau.
 *     4. Popup phủ kín màn, form 1 cột.
 *   MÁY TÍNH (1440px): y hệt trước khi có responsive — 3 cột ghim, bảng cuộn trong
 *   vùng cao cố định, popup 720px ở giữa, form 2 cột.
 */
type Dong = { key: number; soCt: string; ten: string; ngay: string; dienGiai: string; no: string; co: string; tien: number };

const DU_LIEU: Dong[] = Array.from({ length: 40 }, (_, i) => ({
  key: i,
  soCt: `PC${String(i + 1).padStart(4, "0")}`,
  ten: `Công ty TNHH Thương mại Dịch vụ số ${i + 1}`,
  ngay: `0${(i % 9) + 1}/09/2026`,
  dienGiai: "Thanh toán tiền điện văn phòng tháng 08/2026 theo hóa đơn",
  no: "6422",
  co: "1121",
  tien: 1_250_000 * (i + 1),
}));

const COT: ColumnsType<Dong> = [
  { key: "soCt", dataIndex: "soCt", title: "Số CT", width: 100, fixed: "left" },
  { key: "ten", dataIndex: "ten", title: "Tên đối tượng", width: 230, fixed: "left" },
  { key: "ngay", dataIndex: "ngay", title: "Ngày", width: 100 },
  { key: "dienGiai", dataIndex: "dienGiai", title: "Diễn giải", width: 320 },
  { key: "no", dataIndex: "no", title: "TK Nợ", width: 80 },
  { key: "co", dataIndex: "co", title: "TK Có", width: 80 },
  { key: "tien", dataIndex: "tien", title: "Số tiền", width: 140, align: "right", render: (v: number) => v.toLocaleString("vi-VN") },
  { key: "thaoTac", title: "Thao tác", width: 90, fixed: "right", render: () => <Button size="small">Sửa</Button> },
];

function Harness() {
  const manHinh = useManHinh();
  const camUng = useManCamUng();
  const [mo, datMo] = useState(new URLSearchParams(location.search).has("modal"));
  const [tim, datTim] = useState("");
  return (
    <ConfigProvider theme={{ token: { fontSize: 11, controlHeight: 28, ...tokenTheoManHinh(manHinh, camUng) } }}>
      <div style={{ height: 48, background: "#fff", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", padding: "0 12px" }}>
        Khung giả MainLayout — màn: <b style={{ marginLeft: 4 }}>{manHinh}</b>
      </div>
      <div className="app-content" style={{ background: "#F5F5F7" }}>
        <div className="app-content-inner">
          <div className="h-full flex flex-col overflow-hidden">
            <FilterBar
              search={{ value: tim, onChange: datTim }}
              onReset={() => datTim("")}
              filters={
                <>
                  <Select style={{ width: 180 }} placeholder="Tài khoản" options={[{ value: "1121", label: "1121" }]} />
                  <Select style={{ width: 180 }} placeholder="Đối tượng" options={[{ value: "a", label: "A" }]} />
                </>
              }
              actions={<Button type="primary" onClick={() => datMo(true)}>Thêm mới</Button>}
            />
            <div style={{ flex: 1, minHeight: 0 }}>
              <BangDuLieu<Dong> columns={COT} dataSource={DU_LIEU} pagination={{ pageSize: 20 }} />
            </div>
            <Table<Dong>
              size="small"
              columns={COT}
              dataSource={DU_LIEU.slice(0, 5)}
              pagination={false}
              scroll={{ x: 1100, y: "calc(100vh - 420px)" }}
            />
          </div>
        </div>
      </div>
      <Modal open={mo} title="Thêm phiếu chi" width={720} onCancel={() => datMo(false)} onOk={() => datMo(false)}>
        <Form layout="vertical">
          <Row gutter={12}>
            <Col xs={24} sm={12}><Form.Item label="Số phiếu"><Input /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item label="Ngày"><Input /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="TK Nợ"><Input /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="TK Có"><Input /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Số tiền"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Harness />);
