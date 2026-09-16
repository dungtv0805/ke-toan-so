import React, { useState } from "react";
import {
  AutoComplete,
  Button,
  DatePicker,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  EyeOutlined,
  LinkOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import dayjs, { type Dayjs } from "dayjs";
import {
  pheDuyetService,
  type HoSoPheDuyet,
  type QuyTrinhPheDuyet,
} from "@/services/pheDuyetService";
import { nhatKyChungService } from "@/services/nhatKyChungService";

interface Props {
  quyTrinh: QuyTrinhPheDuyet;
  /** Gọi sau khi danh sách hồ sơ đổi, để ngăn kéo nạp lại chi tiết. */
  onThayDoi: (moi: QuyTrinhPheDuyet) => void;
  /** Đã phê duyệt xong thì chỉ xem, không thêm/gỡ được (giữ vết kiểm toán). */
  chiXem: boolean;
}

const doc = (b?: number) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

/** Hồ sơ / chứng từ kèm theo — mục 8 tài liệu phê duyệt nghiệp vụ. */
export function HoSoDinhKem({ quyTrinh, onThayDoi, chiXem }: Props) {
  const [dangTaiLen, setDangTaiLen] = useState(false);
  const [moLienKet, setMoLienKet] = useState(false);
  const [dangMoFile, setDangMoFile] = useState<string | null>(null);

  // Form gắn chứng từ nội bộ
  const [tuKhoa, setTuKhoa] = useState("");
  const [goiY, setGoiY] = useState<{ value: string; label: string; id: string }[]>([]);
  const [chungTuChon, setChungTuChon] = useState<{ id: string; nhan: string } | null>(null);
  const [loaiHoSo, setLoaiHoSo] = useState("");
  const [soHoSo, setSoHoSo] = useState("");
  const [ngayHoSo, setNgayHoSo] = useState<Dayjs | null>(null);
  const [dangGan, setDangGan] = useState(false);

  const taiLen = async (file: File) => {
    setDangTaiLen(true);
    try {
      onThayDoi(await pheDuyetService.taiLenHoSo(quyTrinh.id, file));
      message.success(`Đã đính kèm "${file.name}"`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Không tải được file lên");
    } finally {
      setDangTaiLen(false);
    }
    // Trả false: antd Upload không tự gửi request, mình tự gọi service.
    return false;
  };

  const xem = async (h: HoSoPheDuyet) => {
    setDangMoFile(h.id);
    try {
      const url = await pheDuyetService.moFileHoSo(quyTrinh.id, h.id);
      window.open(url, "_blank", "noopener");
      // Nhả sau khi tab mới đã đọc xong; thu hồi ngay là tab trắng.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Không mở được file");
    } finally {
      setDangMoFile(null);
    }
  };

  const go = async (h: HoSoPheDuyet) => {
    try {
      onThayDoi(await pheDuyetService.xoaHoSo(quyTrinh.id, h.id));
      message.success("Đã gỡ hồ sơ");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Không gỡ được hồ sơ");
    }
  };

  const timChungTu = async (v: string) => {
    setTuKhoa(v);
    setChungTuChon(null);
    if (v.trim().length < 2) {
      setGoiY([]);
      return;
    }
    try {
      const res = await nhatKyChungService.getEntries({ search: v, limit: 10 });
      setGoiY(
        (res?.data ?? []).map((e) => ({
          id: e.id,
          value: `${e.soPhieu} — ${e.dienGiai ?? ""}`.trim(),
          label: `${e.soPhieu} · ${new Intl.NumberFormat("vi-VN").format(e.soTien ?? 0)} đ · ${e.dienGiai ?? ""}`,
        })),
      );
    } catch {
      setGoiY([]);
    }
  };

  const ganLienKet = async () => {
    if (!chungTuChon) {
      message.warning("Chọn một chứng từ trong danh sách gợi ý");
      return;
    }
    setDangGan(true);
    try {
      onThayDoi(
        await pheDuyetService.themHoSoLienKet(quyTrinh.id, {
          ten: chungTuChon.nhan,
          loai: loaiHoSo || undefined,
          so: soHoSo || undefined,
          ngayChungTu: ngayHoSo?.toISOString(),
          doiTuongIdLienKet: chungTuChon.id,
        }),
      );
      message.success("Đã gắn chứng từ nội bộ");
      setMoLienKet(false);
      setTuKhoa("");
      setChungTuChon(null);
      setLoaiHoSo("");
      setSoHoSo("");
      setNgayHoSo(null);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Không gắn được chứng từ");
    } finally {
      setDangGan(false);
    }
  };

  return (
    <Space direction="vertical" size="small" style={{ width: "100%" }}>
      {!chiXem && (
        <Space wrap>
          <Upload
            beforeUpload={taiLen}
            showUploadList={false}
            fileList={[] as UploadFile[]}
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.tif,.tiff,.bmp,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          >
            <Button size="small" icon={<UploadOutlined />} loading={dangTaiLen}>
              Tải hồ sơ lên
            </Button>
          </Upload>
          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={() => setMoLienKet(true)}
          >
            Gắn chứng từ nội bộ
          </Button>
          <span style={{ fontSize: 11, color: "#8A8A8F" }}>
            PDF, ảnh scan, Word, Excel — tối đa 25MB
          </span>
        </Space>
      )}

      {!quyTrinh.hoSo?.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có hồ sơ đính kèm"
        />
      ) : (
        <List<HoSoPheDuyet>
          size="small"
          bordered
          dataSource={quyTrinh.hoSo}
          renderItem={(h) => (
            <List.Item
              actions={[
                h.nguon === "TAI_LEN" ? (
                  <Button
                    key="xem"
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    loading={dangMoFile === h.id}
                    onClick={() => xem(h)}
                  >
                    Xem
                  </Button>
                ) : (
                  <Tooltip key="lk" title="Chứng từ tạo trên Master CEO">
                    <Tag icon={<LinkOutlined />} color="blue">
                      Nội bộ
                    </Tag>
                  </Tooltip>
                ),
                ...(chiXem
                  ? []
                  : [
                      <Popconfirm
                        key="go"
                        title="Gỡ hồ sơ này?"
                        okText="Gỡ"
                        cancelText="Huỷ"
                        onConfirm={() => go(h)}
                      >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]),
              ]}
            >
              <List.Item.Meta
                title={h.ten}
                description={[
                  h.loai,
                  h.so && `số ${h.so}`,
                  h.ngayChungTu && dayjs(h.ngayChungTu).format("DD/MM/YYYY"),
                  h.fileTen && `${h.fileTen} (${doc(h.size)})`,
                  h.nguoiGanTen && `gắn bởi ${h.nguoiGanTen}`,
                  h.thoiDiemGan && dayjs(h.thoiDiemGan).format("DD/MM/YYYY HH:mm"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </List.Item>
          )}
        />
      )}

      <Modal
        open={moLienKet}
        title="Gắn chứng từ đã có trên hệ thống"
        onCancel={() => setMoLienKet(false)}
        onOk={ganLienKet}
        confirmLoading={dangGan}
        okText="Gắn"
        cancelText="Huỷ"
        width={640}
      >
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <AutoComplete
            style={{ width: "100%" }}
            value={tuKhoa}
            options={goiY}
            onSearch={timChungTu}
            onChange={setTuKhoa}
            onSelect={(v, opt) => {
              setChungTuChon({ id: (opt as { id: string }).id, nhan: v as string });
              setTuKhoa(v as string);
            }}
            placeholder="Gõ số phiếu hoặc nội dung để tìm chứng từ…"
          />
          {chungTuChon && (
            <Tag color="green">Đã chọn: {chungTuChon.nhan}</Tag>
          )}
          <Input
            placeholder="Loại hồ sơ (Hóa đơn, Hợp đồng, Biên bản…)"
            value={loaiHoSo}
            onChange={(e) => setLoaiHoSo(e.target.value)}
          />
          <Input
            placeholder="Số chứng từ"
            value={soHoSo}
            onChange={(e) => setSoHoSo(e.target.value)}
          />
          <DatePicker
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            placeholder="Ngày chứng từ"
            value={ngayHoSo}
            onChange={setNgayHoSo}
          />
        </Space>
      </Modal>
    </Space>
  );
}
