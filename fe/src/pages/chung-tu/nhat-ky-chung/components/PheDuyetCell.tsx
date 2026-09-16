import React, { useState } from "react";
import { Button, Popconfirm, Space, Tag, Tooltip, message } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { NhatKyChung } from "@/types";
import {
  pheDuyetService,
  type TrangThaiPheDuyet,
} from "@/services/pheDuyetService";
import {
  mauTrangThai,
  nhanTrangThai,
} from "@/pages/phe-duyet/lib/thoiGian";

interface Props {
  entry: NhatKyChung;
  onSaved: () => void;
}

/** Trạng thái mà người lập còn được gửi (lại) phê duyệt — mục 5 và 10. */
const CHO_PHEP_GUI = ["NHAP", "YEU_CAU_BO_SUNG", "TU_CHOI"];

/**
 * Ô "Phê duyệt" trên lưới chứng từ.
 *
 * Hai việc: hiện trạng thái hiện tại (mục 10) và cho gửi phê duyệt (mục 5
 * bước 2). Không có nút Duyệt ở đây — duyệt là việc của màn "Chờ tôi duyệt",
 * nơi người duyệt nhìn đủ hồ sơ và luồng trước khi ký.
 */
export function PheDuyetCell({ entry, onSaved }: Props) {
  const navigate = useNavigate();
  const [dangGui, setDangGui] = useState(false);

  const trangThai = entry.trangThaiPheDuyet as TrangThaiPheDuyet | undefined;
  const loaiGD = entry.danhMuc?.loaiGiaoDich;

  const guiDuyet = async () => {
    if (!loaiGD?.ma) {
      // Không có loại giao dịch thì không tra được luồng duyệt nào áp dụng.
      message.warning(
        'Chứng từ chưa gắn "Loại giao dịch" nên chưa xác định được luồng phê duyệt. Bổ sung loại giao dịch trước.',
      );
      return;
    }

    setDangGui(true);
    try {
      await pheDuyetService.guiDuyet({
        doiTuongId: entry.id,
        loaiNghiepVuMa: loaiGD.ma,
        loaiNghiepVuTen: loaiGD.ten,
        soPhieu: entry.soPhieu,
        noiDung: entry.dienGiai,
        soTien: entry.soTien,
        ngayNghiepVu: entry.ngay,
        boPhan: entry.boPhan,
      });
      message.success("Đã gửi phê duyệt");
      onSaved();
    } catch (e) {
      // Lỗi hay gặp: loại nghiệp vụ chưa thiết lập luồng, hoặc có cấp chưa ai
      // đảm nhiệm. Cả hai đều cần hiện nguyên văn để admin biết vào đâu sửa.
      message.error(e instanceof Error ? e.message : "Không gửi phê duyệt được");
    } finally {
      setDangGui(false);
    }
  };

  const the = (
    <Tag color={mauTrangThai(trangThai)} style={{ marginInlineEnd: 0 }}>
      {nhanTrangThai(trangThai)}
    </Tag>
  );

  if (!trangThai || CHO_PHEP_GUI.includes(trangThai)) {
    return (
      <Space size={4}>
        {trangThai && the}
        <Popconfirm
          title="Gửi phê duyệt?"
          description="Chứng từ sẽ chuyển đến cấp duyệt đầu tiên và không sửa được cho tới khi có kết quả."
          okText="Gửi"
          cancelText="Huỷ"
          onConfirm={guiDuyet}
        >
          <Button size="small" type="link" icon={<SendOutlined />} loading={dangGui}>
            Gửi duyệt
          </Button>
        </Popconfirm>
      </Space>
    );
  }

  return (
    <Tooltip title="Xem luồng phê duyệt">
      <span
        style={{ cursor: "pointer" }}
        onClick={() => navigate("/phe-duyet/cho-toi-duyet")}
      >
        {the}
      </span>
    </Tooltip>
  );
}
