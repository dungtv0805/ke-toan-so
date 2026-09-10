import React from "react";
import ReactDOM from "react-dom/client";
import type { ColumnsType } from "antd/es/table";
import "@/index.css";
import { Button } from "antd";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { IconNhapExcel, IconXuatExcel } from "@/components/icons/ExcelIcons";

/**
 * TRANG NGHIỆM THU `BangDuLieu`. Chạy `npm run dev` rồi mở
 * /bang-du-lieu.harness.html — không cần đăng nhập, không cần dữ liệu thật.
 *
 * Vì sao cần: jsdom không có bố cục thật, nên test tự động KHÔNG trả lời được
 * câu hỏi quyết định của đợt này — `scroll.x = "max-content"` khi bảng ÍT CỘT
 * thì kéo đầy khung hay để thừa trắng bên phải.
 *
 * Cần nhìn thấy gì thì coi là ĐẠT:
 *   1. Bảng ít cột (3 cột): kéo đầy chiều ngang khung, KHÔNG thừa mảng trắng.
 *   2. Bảng nhiều cột (14 cột): cuộn ngang được, không bóp méo cột.
 *   3. Đang tải: dữ liệu cũ NẰM NGUYÊN, chỉ có dải mảnh chạy trên đầu bảng.
 *   4. Rảnh: dải trong suốt nhưng vẫn chiếm chỗ — bảng không nhảy lên xuống.
 */

interface Dong {
  id: string;
  ma: string;
  ten: string;
  ghiChu: string;
  [k: string]: string;
}

const DU_LIEU: Dong[] = Array.from({ length: 6 }, (_, i) => {
  const d: Dong = {
    id: String(i + 1),
    ma: `DVT${String(i + 1).padStart(3, "0")}`,
    ten: ["Cái", "Chiếc", "Bộ", "Thùng", "Kilôgam", "Mét khối"][i],
    ghiChu: "Ghi chú mẫu",
  };
  for (let c = 1; c <= 11; c++) d[`c${c}`] = `Giá trị ${c}.${i + 1}`;
  return d;
});

const COT_IT: ColumnsType<Dong> = [
  { title: "Mã", dataIndex: "ma", key: "ma" },
  { title: "Tên đơn vị", dataIndex: "ten", key: "ten" },
  { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu" },
];

const COT_NHIEU: ColumnsType<Dong> = [
  ...COT_IT,
  ...Array.from({ length: 11 }, (_, c) => ({
    title: `Cột dài số ${c + 1}`,
    dataIndex: `c${c + 1}`,
    key: `c${c + 1}`,
  })),
];

function Harness() {
  const [dangTai, setDangTai] = React.useState(false);

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 28 }}>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
        <input
          type="checkbox"
          checked={dangTai}
          onChange={(e) => setDangTai(e.target.checked)}
        />
        Đang tải (dữ liệu cũ phải nằm nguyên, chỉ dải mảnh chạy)
      </label>

      <section>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>
          1 — Bảng ÍT CỘT: có kéo đầy khung không, hay thừa trắng bên phải?
        </h3>
        <BangDuLieu<Dong>
          columns={COT_IT}
          dataSource={DU_LIEU}
          rowKey="id"
          loading={dangTai}
          pagination={false}
          buTruDoc={520}
        />
      </section>

      <section>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>
          3 — Icon Excel trên nút: mũi tên vào / ra, ô bảng tính xanh
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Button icon={<IconNhapExcel />}>Import Excel</Button>
          <Button icon={<IconXuatExcel />}>Xuất Excel</Button>
          <Button type="primary" icon={<IconXuatExcel />}>
            Nút nền đậm
          </Button>
          <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 16 }}>
            <IconNhapExcel size={48} />
            <IconXuatExcel size={48} />
            <span style={{ fontSize: 11, color: "#666" }}>(phóng to để soi)</span>
          </span>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>2 — Bảng NHIỀU CỘT: phải cuộn ngang</h3>
        <BangDuLieu<Dong>
          columns={COT_NHIEU}
          dataSource={DU_LIEU}
          rowKey="id"
          loading={dangTai}
          pagination={false}
          buTruDoc={520}
        />
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Harness />);
