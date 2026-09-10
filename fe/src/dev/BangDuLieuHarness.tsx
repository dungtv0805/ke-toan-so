import React from "react";
import ReactDOM from "react-dom/client";
import type { ColumnsType } from "antd/es/table";
import "@/index.css";
import { Button } from "antd";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { IconNhapExcel, IconXuatExcel } from "@/components/icons/ExcelIcons";
import { OIconApp } from "@/components/icons/OIconApp";
import { IconLuoiApp } from "@/components/icons/IconLuoiApp";
import { ManChonUngDung } from "@/components/layout/ManChonUngDung";

const APP_MAU = [
  { appId: "ke-toan", name: "Tài chính" },
  { appId: "giao-viec", name: "Giao việc" },
  { appId: "nhan-su", name: "Nhân sự" },
];

const CO_ICON = [88, 64, 40, 28, 24, 20, 16];
const APP_ICON = ["ke-toan", "giao-viec", "nhan-su", "app-la"];

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
  const [toi, setToi] = React.useState(false);

  // Chế độ tối bật bằng lớp `dark` trên <html> — giống MainLayout.
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", toi);
    document.body.style.background = toi ? "hsl(222 47% 11%)" : "";
    document.body.style.color = toi ? "hsl(0 0% 95%)" : "";
  }, [toi]);

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 28 }}>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
        <input type="checkbox" checked={toi} onChange={(e) => setToi(e.target.checked)} />
        Chế độ tối (ô icon app phải GIỮ NGUYÊN màu, không đảo; dải loading và icon
        Excel phải còn đọc được)
      </label>
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
          6 — Header trái: lưới 9 chấm + ô icon app 28px + tên app
        </h3>
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            background: "hsl(var(--card))",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <IconLuoiApp size={18} />
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <OIconApp appId="ke-toan" size={28} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Tài chính</span>
            </span>
          </div>
          <span style={{ fontSize: 12, color: "#6E6E73" }}>
            🏦 XD Điện Thanh Long ▾ &nbsp; ⚙ &nbsp; 👤
          </span>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>
          5 — Modal "Chọn ứng dụng": Tài chính đang dùng, Nhân sự chưa bật cho công ty
        </h3>
        <div
          style={{
            width: 560,
            background: "#fff",
            border: "1px solid #E5E5EA",
            borderRadius: 14,
            padding: "20px 24px",
            boxShadow: "0 12px 36px #00000024",
            overflow: "hidden",
          }}
        >
          <ManChonUngDung
            danhSach={APP_MAU}
            appHienTai="ke-toan"
            daBat={(id) => id !== "nhan-su"}
            tenCongTy="XD Điện Thanh Long"
            onChon={() => {}}
            onDong={() => {}}
          />
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>
          4 — Bộ icon app: 88/64/40/28 phải có gradient + lớp sáng; 20/16 màu đặc;
          hàng cuối (app lạ) phải xám, KHÔNG mượn màu app khác
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {APP_ICON.map((appId) => (
            <div key={appId} style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
              {CO_ICON.map((size) => (
                <div key={size} style={{ textAlign: "center" }}>
                  <OIconApp appId={appId} size={size} />
                  <div style={{ fontSize: 9, marginTop: 4, color: "#888" }}>{size}</div>
                </div>
              ))}
              <span style={{ fontSize: 12, marginLeft: 8 }}>{appId}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <IconLuoiApp size={18} />
          <span style={{ fontSize: 12 }}>lưới 9 chấm (18px)</span>
        </div>
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
