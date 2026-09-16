import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  InputNumber,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { SaveOutlined, WarningOutlined } from "@ant-design/icons";
import {
  pheDuyetService,
  type CauHinhPheDuyet,
  type GanViTri,
} from "@/services/pheDuyetService";
import { loaiGiaoDichService } from "@/services/loaiGiaoDichService";
import { nguoiDungService } from "@/services/nguoiDungService";
import type { NguoiDung } from "@/types";

/** Một dòng của ma trận mục 4: một loại nghiệp vụ, mỗi vị trí một ô thứ tự. */
interface DongMaTran {
  ma: string;
  ten: string;
  /** viTriTen → thứ tự duyệt. undefined = ô trống, vị trí không tham gia. */
  thuTu: Record<string, number | undefined>;
}

function MaTranPheDuyet() {
  const [viTri, setViTri] = useState<string[]>([]);
  const [dong, setDong] = useState<DongMaTran[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangLuu, setDangLuu] = useState<string | null>(null);

  const nap = async () => {
    setDangTai(true);
    try {
      const [cauHinhRes, loaiGD] = await Promise.all([
        pheDuyetService.layCauHinh(),
        loaiGiaoDichService.getAll(),
      ]);

      setViTri(cauHinhRes?.viTri ?? []);

      const theoMa = new Map<string, CauHinhPheDuyet>(
        (cauHinhRes?.cauHinh ?? []).map((c) => [c.loaiNghiepVuMa, c]),
      );

      // Ma trận luôn liệt kê ĐỦ loại nghiệp vụ đang có, kể cả loại chưa cấu
      // hình — nếu chỉ hiện loại đã cấu hình thì không có lối nào để thêm mới.
      setDong(
        (loaiGD ?? []).map((l) => {
          const ch = theoMa.get(l.ma);
          const thuTu: Record<string, number | undefined> = {};
          for (const b of ch?.buoc ?? []) thuTu[b.viTriTen] = b.thuTu;
          return { ma: l.ma, ten: l.ten, thuTu };
        }),
      );
    } catch (e) {
      message.error(
        e instanceof Error ? e.message : "Không tải được thiết lập phê duyệt",
      );
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    void nap();
  }, []);

  const doiO = (ma: string, viTriTen: string, giaTri: number | null) => {
    setDong((ds) =>
      ds.map((d) =>
        d.ma === ma
          ? { ...d, thuTu: { ...d.thuTu, [viTriTen]: giaTri ?? undefined } }
          : d,
      ),
    );
  };

  const luu = async (d: DongMaTran) => {
    setDangLuu(d.ma);
    try {
      const buoc = Object.entries(d.thuTu)
        .filter(([, v]) => typeof v === "number")
        .map(([viTriTen, v]) => ({
          thuTu: v as number,
          viTriTen,
          batBuoc: true,
        }));

      await pheDuyetService.luuCauHinh({
        loaiNghiepVuMa: d.ma,
        loaiNghiepVuTen: d.ten,
        buoc,
      });
      message.success(`Đã lưu luồng duyệt cho "${d.ten}"`);
      await nap();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setDangLuu(null);
    }
  };

  const cot: ColumnsType<DongMaTran> = useMemo(
    () => [
      {
        title: "Loại nghiệp vụ",
        dataIndex: "ten",
        fixed: "left",
        width: 220,
        render: (v: string, r) => (
          <Space direction="vertical" size={0}>
            <span style={{ fontWeight: 600 }}>{v}</span>
            <span style={{ fontSize: 10, color: "#8A8A8F" }}>{r.ma}</span>
          </Space>
        ),
      },
      ...viTri.map((vt) => ({
        title: vt,
        key: vt,
        width: 150,
        align: "center" as const,
        render: (_: unknown, r: DongMaTran) => (
          <InputNumber
            size="small"
            min={1}
            max={20}
            style={{ width: 70 }}
            placeholder="—"
            value={r.thuTu[vt]}
            onChange={(v) => doiO(r.ma, vt, v as number | null)}
          />
        ),
      })),
      {
        title: "",
        key: "luu",
        fixed: "right",
        width: 90,
        render: (_: unknown, r: DongMaTran) => (
          <Button
            size="small"
            type="primary"
            icon={<SaveOutlined />}
            loading={dangLuu === r.ma}
            onClick={() => luu(r)}
          >
            Lưu
          </Button>
        ),
      },
    ],
    [viTri, dangLuu],
  );

  if (dangTai) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Nhập 1, 2, 3… để xác định thứ tự duyệt. Ô trống nghĩa là vị trí đó không tham gia luồng."
        description="Cột là Vị trí phân quyền của công ty (lấy từ danh mục Vai trò). Mỗi loại nghiệp vụ có thể có số cấp duyệt khác nhau. Loại nghiệp vụ để trống hết các ô sẽ KHÔNG gửi phê duyệt được."
      />
      {!viTri.length && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="Công ty chưa có vai trò nào"
          description="Vào Cấu hình › Quản lý Vai trò để khai các vị trí trước, ma trận này mới có cột."
        />
      )}
      <Table<DongMaTran>
        rowKey="ma"
        size="small"
        dataSource={dong}
        columns={cot}
        pagination={false}
        scroll={{ x: 300 + viTri.length * 150 }}
        locale={{
          emptyText: (
            <Empty description="Chưa có loại nghiệp vụ nào trong danh mục Loại giao dịch" />
          ),
        }}
      />
    </Space>
  );
}

/** Ai đảm nhiệm vị trí nào — mục 3. */
function GanNguoiGiuViTri() {
  const [viTri, setViTri] = useState<string[]>([]);
  const [gan, setGan] = useState<GanViTri[]>([]);
  const [nguoiDung, setNguoiDung] = useState<NguoiDung[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangLuu, setDangLuu] = useState<string | null>(null);

  const nap = async () => {
    setDangTai(true);
    try {
      const [viTriRes, dsNguoiDung] = await Promise.all([
        pheDuyetService.layViTri(),
        nguoiDungService.getAll({ limit: 200 }),
      ]);
      setViTri(viTriRes?.viTri ?? []);
      setGan(viTriRes?.gan ?? []);
      setNguoiDung(dsNguoiDung?.data ?? []);
    } catch (e) {
      message.error(
        e instanceof Error ? e.message : "Không tải được danh sách vị trí",
      );
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    void nap();
  }, []);

  const nguoiCuaViTri = (vt: string) =>
    gan.filter((g) => g.viTriTen === vt).map((g) => g.userId);

  const doiNguoi = (vt: string, userIds: string[]) => {
    setGan((ds) => [
      ...ds.filter((g) => g.viTriTen !== vt),
      ...userIds.map((userId) => {
        const cu = ds.find((g) => g.viTriTen === vt && g.userId === userId);
        const nd = nguoiDung.find((n) => n.id === userId);
        return (
          cu ?? {
            id: `moi-${vt}-${userId}`,
            viTriTen: vt,
            userId,
            hoTen: nd?.hoTen,
            email: nd?.email,
          }
        );
      }),
    ]);
  };

  const luu = async (vt: string) => {
    setDangLuu(vt);
    try {
      await pheDuyetService.ganViTri({
        viTriTen: vt,
        nguoiDung: gan
          .filter((g) => g.viTriTen === vt)
          .map((g) => ({ userId: g.userId, hoTen: g.hoTen, email: g.email })),
      });
      message.success(`Đã cập nhật người đảm nhiệm "${vt}"`);
      await nap();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setDangLuu(null);
    }
  };

  if (dangTai) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Một người có thể giữ nhiều vị trí, và một vị trí có thể giao cho nhiều người."
        description="Giao một vị trí cho hai người trở lên để luồng không đứng khi có người nghỉ — ai xử lý trước cũng được. Thay nhân sự chỉ cần đổi ở đây, luồng phê duyệt giữ nguyên."
      />
      <Table
        rowKey={(vt: string) => vt}
        size="small"
        pagination={false}
        dataSource={viTri}
        columns={[
          { title: "Vị trí phân quyền", width: 220, render: (vt: string) => <Tag>{vt}</Tag> },
          {
            title: "Người đảm nhiệm",
            render: (vt: string) => (
              <Select
                mode="multiple"
                size="small"
                style={{ width: "100%" }}
                placeholder="Chọn người giữ vị trí này"
                value={nguoiCuaViTri(vt)}
                onChange={(v) => doiNguoi(vt, v as string[])}
                optionFilterProp="label"
                options={nguoiDung.map((n) => ({
                  value: n.id,
                  label: `${n.hoTen} — ${n.email}`,
                }))}
              />
            ),
          },
          {
            title: "",
            width: 90,
            render: (vt: string) => (
              <Button
                size="small"
                type="primary"
                icon={<SaveOutlined />}
                loading={dangLuu === vt}
                onClick={() => luu(vt)}
              >
                Lưu
              </Button>
            ),
          },
        ]}
        locale={{
          emptyText: <Empty description="Chưa có vai trò nào — khai ở Cấu hình › Quản lý Vai trò" />,
        }}
      />
    </Space>
  );
}

const CauHinhPheDuyetPage: React.FC = () => (
  <Card size="small" title="Thiết lập phê duyệt nghiệp vụ">
    <Tabs
      items={[
        {
          key: "vi-tri",
          label: (
            <Tooltip title="Mục 3 tài liệu">
              <span>Người đảm nhiệm vị trí</span>
            </Tooltip>
          ),
          children: <GanNguoiGiuViTri />,
        },
        {
          key: "ma-tran",
          label: (
            <Tooltip title="Mục 4 tài liệu">
              <span>Luồng duyệt theo loại nghiệp vụ</span>
            </Tooltip>
          ),
          children: <MaTranPheDuyet />,
        },
      ]}
    />
  </Card>
);

export default CauHinhPheDuyetPage;
