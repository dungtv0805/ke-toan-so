import React from "react";
import ReactDOM from "react-dom/client";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import "@/index.css";
import { useCotCoGian } from "@/hooks/useCotCoGian";
import {
  CAP_CHINH,
  capCot,
  cotCaNam,
  cotQuyVaThang,
  ghimTrai,
  onCellNhan,
  onCellNhanPhu,
  rowClassName,
  tien,
} from "@/pages/ke-hoach/tabs/lib/cotChung";
import type { HangBang } from "@/pages/ke-hoach/tabs/lib/tongHop";

/**
 * TRANG NGHIỆM THU cột ghim + co giãn của bảng kế hoạch. Chỉ chạy ở chế độ dev
 * (`npm run dev` rồi mở /ghim-cot.harness.html), KHÔNG vào bản build production
 * — vite chỉ đóng gói `index.html` khi không khai `rollupOptions.input`.
 *
 * Vì sao cần: jsdom không có `position: sticky` lẫn thanh cuộn, nên test tự
 * động KHÔNG bắt được lỗi lệch tiêu đề đã hai lần khiến việc ghim cột ở Nhật ký
 * chung phải gỡ bỏ. Trang này tái hiện đúng tổ hợp rủi ro mà không cần đăng
 * nhập, không cần dữ liệu thật:
 *
 *   - tám cột ghim trái, cột cuối vùng ghim là CẢ NĂM;
 *   - hàng TỔNG / hàng nhóm gộp hai cột ĐẦU bằng `colSpan` — sticky kèm colSpan
 *     là chỗ antd hay vỡ nhất;
 *   - tiêu đề hai tầng (Quý / Tháng) ở vùng cuộn;
 *   - cuộn cả hai chiều.
 *
 * Cần nhìn thấy gì thì coi là ĐẠT:
 *   1. Kéo ngang: tám cột trái đứng yên, có vạch phân cách; Q1..T12 chạy.
 *   2. Ô tiêu đề luôn thẳng cột với ô dữ liệu bên dưới, kể cả sau khi kéo giãn.
 *   3. Kéo tay ở mép phải một cột GHIM: các cột ghim sau nó dịch theo ngay,
 *      không chồng lên nhau, không hở khe.
 *   4. Tải lại trang: bề rộng vừa kéo còn nguyên.
 *   5. Nhấp đúp tay kéo: cột về bề rộng mặc định.
 */

type Hang = HangBang<unknown> & { chuaLuu?: boolean };

const thang = (n: number) => Array.from({ length: 12 }, (_, i) => n * (i + 1));

const hang = (
  key: string,
  loai: Hang["loai"],
  nhan: string,
  n: number,
): Hang => {
  const t = thang(n);
  const nam = t.reduce((s, x) => s + x, 0);
  return {
    key,
    loai,
    nhan,
    nhomKey: "N1",
    thang: t,
    quy: [0, 1, 2, 3].map((q) => t[q * 3] + t[q * 3 + 1] + t[q * 3 + 2]),
    namTheoThang: nam,
    namKhaiBao: nam + (loai === "chiTiet" ? 1_000_000 : 0),
    chenhLech: loai === "chiTiet" ? 1_000_000 : 0,
    phanTram: 0.25,
    lech: loai === "chiTiet",
  } as Hang;
};

const DU_LIEU: Hang[] = [
  hang("tong", "tong", "TỔNG CỘNG", 900_000),
  hang("nhom1", "nhom", "NSP02 - Phần mềm Master CEO", 300_000),
  ...Array.from({ length: 25 }, (_, i) =>
    hang(`ct${i}`, "chiTiet", `Dòng chi tiết số ${i + 1}`, 10_000 * (i + 1)),
  ),
];

const Harness: React.FC = () => {
  const cotGoc: ColumnsType<Hang> = [
    ...ghimTrai<Hang>([
      {
        title: "Mã",
        key: "ma",
        width: 130,
        onCell: onCellNhan,
        ...capCot(CAP_CHINH),
        render: (_: unknown, r: Hang) => r.nhan,
      },
      {
        title: "Tên sản phẩm hàng hóa, vật tư",
        key: "ten",
        width: 190,
        onCell: onCellNhanPhu,
        ...capCot(CAP_CHINH),
        render: (_: unknown, r: Hang) => (r.loai === "chiTiet" ? r.nhan : null),
      },
      {
        title: "Diễn giải",
        key: "ghiChu",
        width: 170,
        ...capCot(CAP_CHINH),
        render: () => "Cơ sở hình thành dòng kế hoạch",
      },
      { title: "Lượng", key: "luong", width: 110, align: "right", ...capCot(CAP_CHINH), render: () => "1.000" },
      { title: "Giá bình quân", key: "gia", width: 140, align: "right", ...capCot(CAP_CHINH), render: () => "50.000" },
      {
        title: "Thành tiền",
        key: "thanhTien",
        width: 160,
        align: "right",
        ...capCot(CAP_CHINH),
        render: (_: unknown, r: Hang) => tien(r.namKhaiBao),
      },
      { title: "%", key: "phanTram", width: 80, align: "right", ...capCot(CAP_CHINH), render: () => "25.00%" },
      ...cotCaNam<Hang>(),
    ]),
    ...cotQuyVaThang<Hang>({ suaDuoc: () => false, doiThang: () => {} }),
  ];

  const columns = useCotCoGian("kh-rong-cot-harness", cotGoc);

  return (
    <div style={{ padding: 12 }}>
      <h3>Nghiệm thu ghim cột + co giãn cột — bảng kế hoạch</h3>
      <p style={{ fontSize: 12, maxWidth: 900 }}>
        Kéo ngang để kiểm vùng ghim (8 cột đầu, hết CẢ NĂM). Kéo tay ở mép phải
        ô tiêu đề để đổi bề rộng. Tiêu đề phải luôn thẳng cột với dữ liệu.
      </p>
      <Table<Hang>
        rowKey="key"
        size="small"
        bordered
        columns={columns}
        dataSource={DU_LIEU}
        pagination={false}
        className="excel-table kh-bang"
        rowClassName={rowClassName}
        scroll={{ x: "max-content", y: 380 }}
      />
    </div>
  );
};

/**
 * Hai tham số URL để chụp ảnh nghiệm thu tự động (Chrome headless không cuộn
 * được, cũng không kéo chuột được):
 *   ?cuon=600  — cuộn ngang thân bảng 600px, để soi vùng ghim.
 *   ?rong=ma:260,caNam:220  — nạp sẵn bề rộng ĐÃ KÉO vào localStorage trước khi
 *     dựng bảng, mô phỏng đúng trạng thái sau khi người dùng kéo giãn cột ghim.
 */
const thamSo = new URLSearchParams(location.search);

const rongVao = thamSo.get("rong");
if (rongVao) {
  const map: Record<string, number> = {};
  for (const cap of rongVao.split(",")) {
    const [k, v] = cap.split(":");
    if (k && v) map[k] = Number(v);
  }
  localStorage.setItem("kh-rong-cot-harness", JSON.stringify(map));
} else {
  localStorage.removeItem("kh-rong-cot-harness");
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Harness />);

const cuon = Number(thamSo.get("cuon") ?? 0);

/**
 * Bản tự đo: so mép trái ô TIÊU ĐỀ với ô DỮ LIỆU cùng cột, và đọc nền của ô
 * ghim. Nhìn ảnh chụp để đoán thì rất dễ nhầm — ở đây in thẳng con số.
 */
function soiBang(): string[] {
  const than = document.querySelector<HTMLElement>(".ant-table-body");
  const dau = document.querySelector<HTMLElement>(".ant-table-header");
  const dong: string[] = [
    `scrollLeft: header=${dau?.scrollLeft ?? "?"} body=${than?.scrollLeft ?? "?"}`,
  ];

  // Hàng tiêu đề LÁ: cột thường có rowSpan=2 nên nằm ở hàng 1, còn Q1..T12 nằm
  // ở hàng 2. Gom theo thứ tự trái→phải bằng toạ độ thật.
  // KHÔNG sắp theo toạ độ: khi đã cuộn, ô ghim đè lên ô cuộn nên sắp theo `left`
  // ra thứ tự khác hẳn thứ tự cột. Lấy đúng thứ tự DOM: hàng 1 là các cột
  // thường (rowSpan=2), hàng 2 là Q1..T12.
  const hangDau = Array.from(
    document.querySelectorAll<HTMLElement>(".ant-table-header thead tr"),
  );
  const oDau = [
    ...Array.from(hangDau[0]?.querySelectorAll<HTMLElement>("th") ?? []).filter(
      (th) => th.colSpan <= 1,
    ),
    ...Array.from(hangDau[1]?.querySelectorAll<HTMLElement>("th") ?? []),
  ];

  // Phải lấy hàng CHI TIẾT: antd chèn `measure-row`, còn hàng TỔNG/nhóm gộp ô
  // bằng colSpan nên số `td` ít hơn — so với chúng là tự bịa ra lệch.
  const hangCt = document.querySelector<HTMLElement>(
    'tbody tr[data-row-key^="ct"]',
  );
  const oThan = Array.from(hangCt?.querySelectorAll<HTMLElement>("td") ?? []);
  dong.push(`so o: tieu-de-la=${oDau.length} hang-chi-tiet=${oThan.length}`);

  let lech = 0;
  for (let i = 0; i < Math.min(oDau.length, oThan.length); i++) {
    const a = oDau[i].getBoundingClientRect();
    const b = oThan[i].getBoundingClientRect();
    const d = Math.round(a.left - b.left);
    if (Math.abs(d) > 1) {
      lech++;
      if (lech <= 6)
        dong.push(
          `LECH cot#${i} "${oDau[i].innerText.trim().slice(0, 14)}": dau=${Math.round(a.left)} than=${Math.round(b.left)} (${d}px)`,
        );
    }
  }
  dong.push(
    lech === 0 ? "OK: moi cot tieu de thang hang voi du lieu" : `CO ${lech} cot lech`,
  );

  // Ô ghim phải ĐỤC và phải NẰM TRÊN phần cuộn.
  if (oThan[0])
    dong.push(`class o dau tien: "${oThan[0].className}" | position=${getComputedStyle(oThan[0]).position} left=${getComputedStyle(oThan[0]).left}`);

  // antd 5: `-fix-left`; antd 6: `-fix-start`. Bắt cả hai.
  const oGhim = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".ant-table-body .ant-table-cell-fix-left, .ant-table-body .ant-table-cell-fix-start",
    ),
  );
  dong.push(`so o ghim tim thay: ${oGhim.length}`);
  const trong = oGhim.filter((o) => {
    const n = getComputedStyle(o).backgroundColor;
    return n === "rgba(0, 0, 0, 0)" || n === "transparent";
  });
  dong.push(
    trong.length === 0 ? "OK: moi o ghim deu co nen duc" : `${trong.length} o ghim TRONG SUOT`,
  );

  const mau = oGhim[0];
  if (mau) {
    const st = getComputedStyle(mau);
    dong.push(`o ghim: position=${st.position} z-index=${st.zIndex} left=${st.left}`);
  }

  /**
   * Phép thử quyết định: ô CUỘN nào đang nằm đè lên vùng ghim mà vẫn NHÌN THẤY?
   * Nếu sticky làm đúng thì ô ghim che hết, `elementFromPoint` tại vùng ghim
   * phải luôn rơi vào một ô ghim.
   */
  /**
   * Phép thử quyết định cho hiện tượng "chữ chồng chữ": quét ngang vùng ghim
   * của một hàng, xem ô nào đang NẰM TRÊN CÙNG. Sticky làm đúng thì mọi điểm
   * trong vùng ghim phải rơi vào một ô ghim.
   */
  const ghimCuaHang = oThan.filter(
    (o) =>
      o.classList.contains("ant-table-cell-fix-start") ||
      o.classList.contains("ant-table-cell-fix-left"),
  );
  dong.push(`hang chi tiet co ${ghimCuaHang.length} o ghim`);

  const soiHang = (tr: HTMLElement | null, ten: string) => {
    if (!tr || ghimCuaHang.length === 0) return;
    const cuoi = ghimCuaHang[ghimCuaHang.length - 1].getBoundingClientRect();
    const y = tr.getBoundingClientRect().top + 10;
    const xau: string[] = [];
    for (let x = 6; x < cuoi.right - 4; x += 12) {
      const o = document.elementFromPoint(x, y)?.closest("td");
      if (!o) continue;
      const laGhim =
        o.classList.contains("ant-table-cell-fix-start") ||
        o.classList.contains("ant-table-cell-fix-left");
      if (!laGhim) xau.push(`x=${x}:"${o.textContent?.trim().slice(0, 10)}"`);
    }
    dong.push(
      xau.length === 0
        ? `OK ${ten}: vung ghim khong bi o cuon de len`
        : `${ten} BI DE: ${xau.slice(0, 5).join(" ")}${xau.length > 5 ? ` (+${xau.length - 5})` : ""}`,
    );
  };

  soiHang(hangCt, "hang chi tiet");
  soiHang(document.querySelector<HTMLElement>('tbody tr[data-row-key="tong"]'), "hang TONG");
  soiHang(document.querySelector<HTMLElement>('tbody tr[data-row-key="nhom1"]'), "hang nhom");

  return dong;
}

if (cuon > 0 || thamSo.get("soi")) {
  setTimeout(() => {
    if (cuon > 0) {
      const than = document.querySelector<HTMLElement>(".ant-table-body");
      if (than) {
        than.scrollLeft = cuon;
        // antd đồng bộ tiêu đề qua sự kiện scroll; gán scrollLeft trong Chrome
        // headless không phải lúc nào cũng phát ra, phát tay cho chắc.
        than.dispatchEvent(new Event("scroll", { bubbles: true }));
      }
    }
    setTimeout(() => {
      const hop = document.createElement("pre");
      hop.style.cssText =
        "font:12px/1.6 ui-monospace,monospace;background:#111;color:#0f0;padding:10px;margin:8px 0";
      hop.textContent = soiBang().join("\n");
      document.body.appendChild(hop);
    }, 400);
  }, 1200);
}
