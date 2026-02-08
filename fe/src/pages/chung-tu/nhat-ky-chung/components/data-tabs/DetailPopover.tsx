import { Popover, Descriptions, Typography } from "antd";
import { useState } from "react";

const { Text } = Typography;

type DetailType =
  | "doiTuong"
  | "duAn"
  | "boPhan"
  | "sanPham"
  | "dongTien"
  | "nhanVien"
  | "nhomKhuyenMai"
  | "nhomQuanLy"
  | "taiKhoan"
  | "khoanMuc"
  | "hopDong";

interface DetailData {
  ma?: string;
  ten?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDetailData = DetailData & Record<string, any>;

interface DetailPopoverProps {
  type: DetailType;
  data?: AnyDetailData | null;
  children: React.ReactNode;
}

const typeLabels: Record<DetailType, string> = {
  doiTuong: "Đối tượng",
  duAn: "Dự án",
  boPhan: "Bộ phận",
  sanPham: "Sản phẩm",
  dongTien: "Dòng tiền",
  nhanVien: "Nhân viên",
  nhomKhuyenMai: "Nhóm khuyến mại",
  nhomQuanLy: "Nhóm quản lý",
  taiKhoan: "Tài khoản",
  khoanMuc: "Khoản mục",
  hopDong: "Hợp đồng",
};

// Render specific fields based on type
const renderDetailContent = (type: DetailType, data: AnyDetailData) => {
  const commonItems = [
    { label: "Mã", value: data.ma },
    { label: "Tên", value: data.ten },
  ];

  const specificItems: Record<DetailType, Array<{ label: string; value: unknown }>> = {
    doiTuong: [
      { label: "Loại", value: data.loai },
      { label: "Điện thoại", value: data.dienThoai },
      { label: "Email", value: data.email },
      { label: "Địa chỉ", value: data.diaChi },
      { label: "Mã số thuế", value: data.maSoThue },
    ],
    duAn: [
      { label: "Chủ đầu tư", value: data.chuDuAn || data.chuDauTuTen },
      { label: "Mã CĐT", value: data.chuDuAnMa || data.chuDauTuMa },
      { label: "Địa điểm", value: data.diaDiem },
      { label: "Trạng thái", value: data.trangThai },
    ],
    boPhan: [
      { label: "Mô tả", value: data.moTa },
    ],
    sanPham: [
      { label: "Đơn vị", value: data.donVi },
      { label: "Giá bán", value: data.giaBan ? new Intl.NumberFormat('vi-VN').format(data.giaBan as number) + ' đ' : undefined },
      { label: "Mô tả", value: data.moTa },
    ],
    dongTien: [
      { label: "Loại", value: data.loai },
      { label: "Mô tả", value: data.moTa },
    ],
    nhanVien: [
      { label: "Điện thoại", value: data.dienThoai },
      { label: "Email", value: data.email },
      { label: "Bộ phận", value: data.boPhan },
    ],
    nhomKhuyenMai: [
      { label: "Mô tả", value: data.moTa },
    ],
    nhomQuanLy: [
      { label: "Mô tả", value: data.moTa },
    ],
    taiKhoan: [
      { label: "Loại", value: data.loai },
      { label: "Nhóm", value: data.nhom },
    ],
    khoanMuc: [
      { label: "Loại", value: data.loai },
      { label: "Nhóm", value: data.nhom },
    ],
    hopDong: [
      { label: "Số HĐ", value: data.soHopDong },
      { label: "Công trình", value: data.tenCongTrinh },
      { label: "Giá trị", value: data.giaTriSauThue ? new Intl.NumberFormat('vi-VN').format(data.giaTriSauThue as number) + ' đ' : undefined },
      { label: "Trạng thái", value: data.trangThai },
    ],
  };

  const items = [...commonItems, ...specificItems[type]].filter(item => item.value);

  return (
    <Descriptions 
      column={1} 
      size="small" 
      bordered
      style={{ minWidth: 250 }}
    >
      {items.map((item, index) => (
        <Descriptions.Item key={index} label={item.label}>
          {String(item.value)}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};

export function DetailPopover({ type, data, children }: DetailPopoverProps) {
  const [open, setOpen] = useState(false);

  if (!data || (!data.ma && !data.ten && !data.soHopDong)) {
    return <>{children}</>;
  }

  const content = (
    <div style={{ maxWidth: 350 }}>
      {renderDetailContent(type, data)}
    </div>
  );

  return (
    <Popover
      content={content}
      title={
        <Text strong className="text-primary">
          {typeLabels[type]}: {data.ten || data.tenCongTrinh || data.ma || data.soHopDong}
        </Text>
      }
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="right"
    >
      <span 
        className="cursor-pointer hover:text-primary hover:underline transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </span>
    </Popover>
  );
}
