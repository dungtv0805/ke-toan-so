import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { phieuFormSchema, PhieuFormValues } from "../../phieuFormSchema";
import {
  usePhieuState,
  usePhieuHandler,
  usePhieuConfig,
} from "../../PhieuHandlerContext";
import {
  buildDoiTuongSnapshot,
  buildDuAnSnapshot,
  buildBoPhanSnapshot,
  buildSanPhamSnapshot,
  buildDongTienSnapshot,
} from "@/utils/snapshotBuilder";
import { DoiTuong, DuAn, BoPhan, SanPham, DongTien } from "@/types";
import { TaiKhoanItem } from "../../handler/sub-handler/init/init.state";

const NONE_VALUE = "__none__";

export function PhieuFormModal() {
  const handler = usePhieuHandler();
  const config = usePhieuConfig();
  const [open, setOpen] = usePhieuState("formModalOpen", false);
  const [editingPhieu] = usePhieuState("editingPhieu", null);

  const [doiTuongList] = usePhieuState("doiTuongList", [] as DoiTuong[]);
  const [duAnList] = usePhieuState("duAnList", [] as DuAn[]);
  const [boPhanList] = usePhieuState("boPhanList", [] as BoPhan[]);
  const [sanPhamList] = usePhieuState("sanPhamList", [] as SanPham[]);
  const [dongTienList] = usePhieuState("dongTienList", [] as DongTien[]);
  const [taiKhoanList] = usePhieuState("taiKhoanList", [] as TaiKhoanItem[]);

  // Local state for danh mục selects (not part of zod schema)
  const [doiTuongMa, setDoiTuongMa] = useState<string>("");
  const [taiKhoanNoMa, setTaiKhoanNoMa] = useState<string>("");
  const [taiKhoanCoMa, setTaiKhoanCoMa] = useState<string>("");
  const [duAnMa, setDuAnMa] = useState<string>("");
  const [boPhanMa, setBoPhanMa] = useState<string>("");
  const [sanPhamMa, setSanPhamMa] = useState<string>("");
  const [dongTienMa, setDongTienMa] = useState<string>("");

  const form = useForm<PhieuFormValues>({
    resolver: zodResolver(phieuFormSchema),
    defaultValues: {
      ngay: "",
      soTien: 0,
      noiDung: "",
      nguoiGiaoDich: "",
      diaChi: "",
      ghiChu: "",
    },
  });

  // Reset form and selects when editingPhieu or open changes
  useEffect(() => {
    if (open) {
      if (editingPhieu) {
        form.reset({
          ngay: dayjs(editingPhieu.ngay).format("YYYY-MM-DD"),
          soTien: editingPhieu.soTien,
          noiDung: editingPhieu.noiDung,
          nguoiGiaoDich: editingPhieu.nguoiGiaoDich ?? "",
          diaChi: editingPhieu.diaChi ?? "",
          ghiChu: editingPhieu.ghiChu ?? "",
        });
        setDoiTuongMa(editingPhieu.danhMuc?.doiTuong?.ma ?? "");
        setTaiKhoanNoMa(editingPhieu.danhMuc?.taiKhoanNo?.ma ?? "");
        setTaiKhoanCoMa(editingPhieu.danhMuc?.taiKhoanCo?.ma ?? "");
        setDuAnMa(editingPhieu.danhMuc?.duAn?.ma ?? "");
        setBoPhanMa(editingPhieu.danhMuc?.boPhan?.ma ?? "");
        setSanPhamMa(editingPhieu.danhMuc?.sanPham?.ma ?? "");
        setDongTienMa(editingPhieu.danhMuc?.dongTien?.ma ?? "");
      } else {
        form.reset({
          ngay: "",
          soTien: 0,
          noiDung: "",
          nguoiGiaoDich: "",
          diaChi: "",
          ghiChu: "",
        });
        setDoiTuongMa("");
        setTaiKhoanNoMa("");
        setTaiKhoanCoMa("");
        setDuAnMa("");
        setBoPhanMa("");
        setSanPhamMa("");
        setDongTienMa("");
      }
    }
  }, [editingPhieu, open, form]);

  const handleSubmit = async (values: PhieuFormValues) => {
    // Build danhMuc snapshots from selected items
    const danhMuc: Record<string, unknown> = {};

    if (doiTuongMa) {
      const found = doiTuongList.find((d) => d.ma === doiTuongMa);
      if (found) danhMuc.doiTuong = buildDoiTuongSnapshot(found);
    }
    if (taiKhoanNoMa) {
      const foundNo = taiKhoanList.find((t) => t.ma === taiKhoanNoMa);
      if (foundNo) danhMuc.taiKhoanNo = { ma: foundNo.ma, ten: foundNo.ten, loai: foundNo.loai, nhom: foundNo.nhom };
    }
    if (taiKhoanCoMa) {
      const foundCo = taiKhoanList.find((t) => t.ma === taiKhoanCoMa);
      if (foundCo) danhMuc.taiKhoanCo = { ma: foundCo.ma, ten: foundCo.ten, loai: foundCo.loai, nhom: foundCo.nhom };
    }
    if (duAnMa) {
      const found = duAnList.find((d) => d.ma === duAnMa);
      if (found) danhMuc.duAn = buildDuAnSnapshot(found);
    }
    if (boPhanMa) {
      const found = boPhanList.find((b) => b.ma === boPhanMa);
      if (found) danhMuc.boPhan = buildBoPhanSnapshot(found);
    }
    if (sanPhamMa) {
      const found = sanPhamList.find((s) => s.ma === sanPhamMa);
      if (found) danhMuc.sanPham = buildSanPhamSnapshot(found);
    }
    if (dongTienMa) {
      const found = dongTienList.find((d) => d.ma === dongTienMa);
      if (found) danhMuc.dongTien = buildDongTienSnapshot(found);
    }

    const dto = {
      ...values,
      danhMuc: Object.keys(danhMuc).length > 0 ? danhMuc : undefined,
    };

    const ok = await handler.executeEvent("submitPhieu", {
      id: editingPhieu?.id,
      dto: dto as Parameters<typeof handler.executeEvent<"submitPhieu">>[1]["dto"],
    });

    if (ok) {
      toast.success(editingPhieu ? "Đã cập nhật" : "Đã tạo phiếu");
      setOpen(false);
    } else {
      toast.error("Lưu thất bại");
    }
  };

  const title = `${editingPhieu ? "Sửa" : "Thêm"} ${config.title}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Basic info grid */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ngay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày</FormLabel>
                    <FormControl>
                      <input
                        type="date"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="soTien"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tiền</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="noiDung"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nội dung</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Nội dung phiếu..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nguoiGiaoDich"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Người giao dịch</FormLabel>
                    <FormControl>
                      <Input placeholder="Tên người giao dịch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="diaChi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Input placeholder="Địa chỉ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ghiChu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ghi chú..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Danh mục section */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Danh mục</p>
              <div className="grid grid-cols-2 gap-4">
                {/* Đối tượng */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Đối tượng</label>
                  <Select
                    value={doiTuongMa || NONE_VALUE}
                    onValueChange={(v) => setDoiTuongMa(v === NONE_VALUE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn đối tượng --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>-- Không chọn --</SelectItem>
                      {doiTuongList.map((d) => (
                        <SelectItem key={d.ma} value={d.ma}>
                          {d.ma} - {d.ten}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tài khoản Nợ */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Tài khoản Nợ</label>
                  <Select
                    value={taiKhoanNoMa || NONE_VALUE}
                    onValueChange={(v) => setTaiKhoanNoMa(v === NONE_VALUE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn TK Nợ --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>-- Không chọn --</SelectItem>
                      {taiKhoanList.map((t) => (
                        <SelectItem key={t.ma} value={t.ma}>
                          {t.ma} - {t.ten}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tài khoản Có */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Tài khoản Có</label>
                  <Select
                    value={taiKhoanCoMa || NONE_VALUE}
                    onValueChange={(v) => setTaiKhoanCoMa(v === NONE_VALUE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn TK Có --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>-- Không chọn --</SelectItem>
                      {taiKhoanList.map((t) => (
                        <SelectItem key={t.ma} value={t.ma}>
                          {t.ma} - {t.ten}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dự án */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Dự án</label>
                  <Select
                    value={duAnMa || NONE_VALUE}
                    onValueChange={(v) => setDuAnMa(v === NONE_VALUE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn dự án --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>-- Không chọn --</SelectItem>
                      {duAnList.map((d) => (
                        <SelectItem key={d.ma} value={d.ma}>
                          {d.ma} - {d.ten}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bộ phận */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Bộ phận</label>
                  <Select
                    value={boPhanMa || NONE_VALUE}
                    onValueChange={(v) => setBoPhanMa(v === NONE_VALUE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn bộ phận --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>-- Không chọn --</SelectItem>
                      {boPhanList.map((b) => (
                        <SelectItem key={b.ma} value={b.ma}>
                          {b.ma} - {b.ten}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sản phẩm */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Sản phẩm</label>
                  <Select
                    value={sanPhamMa || NONE_VALUE}
                    onValueChange={(v) => setSanPhamMa(v === NONE_VALUE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn sản phẩm --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>-- Không chọn --</SelectItem>
                      {sanPhamList.map((s) => (
                        <SelectItem key={s.ma} value={s.ma}>
                          {s.ma} - {s.ten}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dòng tiền */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Dòng tiền</label>
                  <Select
                    value={dongTienMa || NONE_VALUE}
                    onValueChange={(v) => setDongTienMa(v === NONE_VALUE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn dòng tiền --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>-- Không chọn --</SelectItem>
                      {dongTienList.map((d) => (
                        <SelectItem key={d.ma} value={d.ma}>
                          {d.ma} - {d.ten}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
