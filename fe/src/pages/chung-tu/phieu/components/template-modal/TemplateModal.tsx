import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePhieuState, usePhieuConfig } from "../../PhieuHandlerContext";
import { useAuth } from "@/contexts/AuthContext";
import { phieuTemplateService } from "@/services/phieuTemplateService";
import { getDefaultTemplate, PHIEU_PLACEHOLDERS } from "../../lib/printTemplates";
import { buildPhieuHtml } from "../../lib/printPhieu";
import { ChungTu, LoaiChungTu } from "@/types";

/** Phiếu mẫu để xem trước (preview). */
function buildSample(loai: LoaiChungTu): ChungTu {
  return {
    id: "preview",
    soPhieu: loai === "PHIEU_CHI" ? "PC0001" : "PT0001",
    loai,
    ngay: "2026-06-20T00:00:00.000Z",
    soTien: 1234567,
    noiDung: loai === "PHIEU_CHI" ? "Chi mua văn phòng phẩm" : "Thu tiền dịch vụ",
    nguoiGiaoDich: "Nguyễn Văn A",
    diaChi: "123 Đường ABC, Hà Nội",
    ghiChu: "02",
    danhMuc: {
      taiKhoanNo: { ma: "111", ten: "Tiền mặt", loai: "", nhom: "" },
      taiKhoanCo: { ma: "511", ten: "Doanh thu", loai: "", nhom: "" },
    },
  } as unknown as ChungTu;
}

export function TemplateModal() {
  const config = usePhieuConfig();
  const { currentTenant } = useAuth();
  const [open, setOpen] = usePhieuState("templateModalOpen", false);
  const [printTemplate, setPrintTemplate] = usePhieuState("printTemplate", null);

  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setHtml(printTemplate || getDefaultTemplate(config.loai));
  }, [open, printTemplate, config.loai]);

  const previewHtml = useMemo(
    () =>
      buildPhieuHtml(buildSample(config.loai), html, {
        tenCongTy: currentTenant?.tenantName ?? "",
        diaChiCongTy: "",
      }),
    [html, config.loai, currentTenant]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await phieuTemplateService.upsert(config.loai, html);
      setPrintTemplate(html);
      toast.success("Đã lưu mẫu in");
      setOpen(false);
    } catch {
      toast.error("Lưu mẫu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await phieuTemplateService.remove(config.loai);
      setPrintTemplate(null);
      setHtml(getDefaultTemplate(config.loai));
      toast.success("Đã khôi phục mẫu mặc định");
    } catch {
      toast.error("Khôi phục thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setHtml(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  return (
    <Dialog open={!!open} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Mẫu in — {config.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Trình soạn thảo */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Mã HTML</span>
              <label className="text-xs text-primary cursor-pointer hover:underline">
                Tải file .html
                <input
                  type="file"
                  accept=".html,.htm,text/html"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <Textarea
              className="flex-1 font-mono text-xs resize-none min-h-[260px]"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
            />
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Placeholder hỗ trợ</summary>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                {PHIEU_PLACEHOLDERS.map((p) => (
                  <div key={p.token}>
                    <code className="text-foreground">{p.token}</code> — {p.moTa}
                  </div>
                ))}
              </div>
            </details>
          </div>

          {/* Xem trước */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <span className="text-sm font-medium">Xem trước</span>
            <iframe
              title="preview"
              className="flex-1 w-full rounded-md border bg-white min-h-[260px]"
              srcDoc={previewHtml}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Khôi phục mặc định
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Đóng
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              Lưu mẫu
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
