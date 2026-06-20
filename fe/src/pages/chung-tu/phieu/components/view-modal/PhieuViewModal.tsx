import dayjs from "dayjs";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePhieuState } from "../../PhieuHandlerContext";
import { formatCurrency } from "../../lib/format";
import { usePrintPhieu } from "../../lib/usePrintPhieu";

interface FieldRowProps {
  label: string;
  value?: string | null;
}

function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex py-2 border-b last:border-b-0">
      <span className="w-40 flex-shrink-0 text-sm text-muted-foreground font-medium">
        {label}
      </span>
      <span className="text-sm">{value || "-"}</span>
    </div>
  );
}

export function PhieuViewModal() {
  const [phieu, setPhieu] = usePhieuState("viewModalPhieu", null);
  const print = usePrintPhieu();

  const handleOpenChange = (open: boolean) => {
    if (!open) setPhieu(null);
  };

  return (
    <Dialog open={!!phieu} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết phiếu</DialogTitle>
        </DialogHeader>

        {phieu && (
          <div className="divide-y">
            <FieldRow label="Số phiếu" value={phieu.soPhieu} />
            <FieldRow
              label="Ngày"
              value={dayjs(phieu.ngay).format("DD/MM/YYYY")}
            />
            <FieldRow
              label="Số tiền"
              value={formatCurrency(phieu.soTien)}
            />
            <FieldRow label="Nội dung" value={phieu.noiDung} />
            <FieldRow label="Người giao dịch" value={phieu.nguoiGiaoDich} />
            <FieldRow label="Địa chỉ" value={phieu.diaChi} />
            <FieldRow label="Ghi chú" value={phieu.ghiChu} />

            {/* Danh mục */}
            <FieldRow
              label="Đối tượng"
              value={phieu.danhMuc?.doiTuong?.ten}
            />
            <FieldRow
              label="TK Nợ"
              value={
                phieu.danhMuc?.taiKhoanNo
                  ? `${phieu.danhMuc.taiKhoanNo.ma} - ${phieu.danhMuc.taiKhoanNo.ten}`
                  : undefined
              }
            />
            <FieldRow
              label="TK Có"
              value={
                phieu.danhMuc?.taiKhoanCo
                  ? `${phieu.danhMuc.taiKhoanCo.ma} - ${phieu.danhMuc.taiKhoanCo.ten}`
                  : undefined
              }
            />
            <FieldRow
              label="Dự án"
              value={phieu.danhMuc?.duAn?.ten}
            />
            <FieldRow
              label="Bộ phận"
              value={phieu.danhMuc?.boPhan?.ten}
            />
            <FieldRow
              label="Sản phẩm"
              value={phieu.danhMuc?.sanPham?.ten}
            />
            <FieldRow
              label="Dòng tiền"
              value={phieu.danhMuc?.dongTien?.ten}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => phieu && print(phieu)}
            disabled={!phieu}
          >
            <Printer className="h-4 w-4 mr-1" />
            In / Xuất PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
