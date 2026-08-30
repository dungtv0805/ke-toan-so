import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Select, Space, Table, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { taiKhoanService } from "@/services/taiKhoanService";
import type { TaiKhoan } from "@/types";
import { sapXepTheoNhan } from "@/lib/sapXep";
import {
  dinhKhoanKeHoachService,
  khoaDinhKhoan,
  NHAN_DINH_KHOAN,
  type CauHinhDinhKhoan,
} from "@/services/dinhKhoanKeHoachService";

const { Text } = Typography;

/** getAll() của danh mục tài khoản chỉ trả 100 bản ghi → dùng getPaginated. */
const TAI_KHOAN_LIMIT = 1000;

interface Hang extends CauHinhDinhKhoan {
  khoa: string;
  nhan: string;
}

/**
 * Cấu hình cặp Nợ/Có mà engine dùng khi sinh dòng hạch toán kế hoạch từ các
 * bảng chi tiết.
 *
 * Tài liệu yêu cầu không quy định cặp tài khoản nào, nên bộ mặc định BE seed
 * sẵn chỉ là giả định kỹ thuật — công ty phải xem lại ở đây trước khi tin vào
 * P&L Kế hoạch, vì báo cáo đó tổng hợp từ chính các bút toán này.
 */
export const DinhKhoanModal: React.FC<{
  moLen: boolean;
  dong: () => void;
}> = ({ moLen, dong }) => {
  const [cauHinh, setCauHinh] = useState<CauHinhDinhKhoan[]>([]);
  const [taiKhoanList, setTaiKhoanList] = useState<TaiKhoan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!moLen) return;
    setLoading(true);
    Promise.all([
      dinhKhoanKeHoachService.lay(),
      taiKhoanService.getPaginated({ limit: TAI_KHOAN_LIMIT }),
    ])
      .then(([ch, tk]) => {
        setCauHinh(ch);
        setTaiKhoanList(tk.data);
      })
      .catch(() => message.error("Không nạp được cấu hình định khoản"))
      .finally(() => setLoading(false));
  }, [moLen]);

  const taiKhoanOptions = useMemo(
    () =>
      sapXepTheoNhan(
        taiKhoanList.map((t) => ({
          value: t.ma,
          label: `${t.ma} - ${t.ten}`,
        })),
      ),
    [taiKhoanList],
  );

  const rows = useMemo<Hang[]>(() => {
    const theoKhoa = new Map(
      cauHinh.map((c) => [khoaDinhKhoan(c.bang, c.phanLoai), c]),
    );
    return NHAN_DINH_KHOAN.map(({ khoa, nhan }) => {
      const [bang, phanLoai] = khoa.split(":");
      const cu = theoKhoa.get(khoa);
      return {
        khoa,
        nhan,
        bang: bang as CauHinhDinhKhoan["bang"],
        phanLoai,
        taiKhoanNo: cu?.taiKhoanNo ?? { ma: "", ten: "" },
        taiKhoanCo: cu?.taiKhoanCo ?? { ma: "", ten: "" },
      };
    });
  }, [cauHinh]);

  const doiTaiKhoan = (
    khoa: string,
    ben: "taiKhoanNo" | "taiKhoanCo",
    ma: string,
  ) => {
    const tk = taiKhoanList.find((t) => t.ma === ma);
    if (!tk) return;
    setCauHinh((truoc) => {
      const con = truoc.filter(
        (c) => khoaDinhKhoan(c.bang, c.phanLoai) !== khoa,
      );
      const hang = rows.find((r) => r.khoa === khoa)!;
      const cu = truoc.find((c) => khoaDinhKhoan(c.bang, c.phanLoai) === khoa);
      return [
        ...con,
        {
          bang: hang.bang,
          phanLoai: hang.phanLoai,
          taiKhoanNo: cu?.taiKhoanNo ?? hang.taiKhoanNo,
          taiKhoanCo: cu?.taiKhoanCo ?? hang.taiKhoanCo,
          [ben]: { ma: tk.ma, ten: tk.ten },
        } as CauHinhDinhKhoan,
      ];
    });
  };

  const luu = async () => {
    const thieu = rows.filter(
      (r) => !r.taiKhoanNo.ma || !r.taiKhoanCo.ma,
    );
    if (thieu.length > 0) {
      message.warning(
        `Còn ${thieu.length} dòng chưa chọn đủ tài khoản Nợ và Có`,
      );
      return;
    }
    setSaving(true);
    try {
      await dinhKhoanKeHoachService.luu(
        rows.map(({ bang, phanLoai, taiKhoanNo, taiKhoanCo }) => ({
          bang,
          phanLoai,
          taiKhoanNo,
          taiKhoanCo,
        })),
      );
      message.success("Đã lưu cấu hình định khoản");
      dong();
    } catch (error) {
      message.error(
        (error as { message?: string })?.message ?? "Lưu cấu hình thất bại",
      );
    } finally {
      setSaving(false);
    }
  };

  const oTaiKhoan = (row: Hang, ben: "taiKhoanNo" | "taiKhoanCo") => (
    <Select
      size="small"
      className="w-full"
      placeholder="Chọn tài khoản"
      showSearch
      optionFilterProp="label"
      options={taiKhoanOptions}
      value={row[ben].ma || undefined}
      onChange={(v) => doiTaiKhoan(row.khoa, ben, v)}
    />
  );

  const columns: ColumnsType<Hang> = [
    {
      title: "Bảng chi tiết",
      dataIndex: "nhan",
      width: 240,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Tài khoản Nợ",
      key: "no",
      width: 280,
      render: (_: unknown, row: Hang) => oTaiKhoan(row, "taiKhoanNo"),
    },
    {
      title: "Tài khoản Có",
      key: "co",
      width: 280,
      render: (_: unknown, row: Hang) => oTaiKhoan(row, "taiKhoanCo"),
    },
  ];

  return (
    <Modal
      title="Định khoản kế hoạch"
      open={moLen}
      onCancel={dong}
      onOk={luu}
      okText="Lưu"
      cancelText="Đóng"
      confirmLoading={saving}
      width={900}
      destroyOnClose
    >
      <Space direction="vertical" size={12} className="w-full">
        <Alert
          type="warning"
          showIcon
          message="Bộ mặc định là giả định kỹ thuật, chưa được nghiệp vụ xác nhận."
          description="Mỗi dòng của bảng chi tiết sẽ sinh ra bút toán kế hoạch theo đúng cặp tài khoản khai ở đây. Chọn sai thì P&L Kế hoạch lệch theo, vì báo cáo đó tổng hợp từ chính các bút toán này."
        />
        <Table<Hang>
          rowKey="khoa"
          size="small"
          bordered
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={false}
        />
      </Space>
    </Modal>
  );
};
