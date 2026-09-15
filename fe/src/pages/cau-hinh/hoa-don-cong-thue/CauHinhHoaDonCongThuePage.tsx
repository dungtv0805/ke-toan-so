import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
  hoaDonCongThueService,
  type CongTyCongThue,
} from '@/services/hoaDonCongThueService';

const RONG = { mst: '', tenCongTy: '', tenDangNhap: '', matKhau: '', kyKeKhai: 'thang' };

/**
 * Cấu hình tải hóa đơn cổng Thuế — khai báo từng công ty.
 *
 * Đây là chỗ đặt MỘT LẦN rồi hiếm khi sửa: mã số thuế, mật khẩu cổng Thuế, kỳ
 * kê khai và lịch tải riêng. Việc hằng ngày — đăng nhập captcha, tải hàng loạt
 * — nằm ở menu Thuế › Hóa đơn cổng Thuế, vì kế toán viên làm việc đó mỗi sáng
 * và không nên phải có quyền cấu hình mới vào được.
 */
const CauHinhHoaDonCongThuePage: React.FC = () => {
  const { toast } = useToast();
  const [ds, setDs] = useState<CongTyCongThue[]>([]);
  const [dangTai, setDangTai] = useState(true);

  const [suaMo, setSuaMo] = useState(false);
  const [form, setForm] = useState({ ...RONG });
  const [laThem, setLaThem] = useState(true);

  const nap = useCallback(async () => {
    try {
      setDs((await hoaDonCongThueService.danhSachCongTy()) ?? []);
    } catch (e: any) {
      toast({ title: 'Không tải được danh sách', description: e?.message, variant: 'destructive' });
    } finally {
      setDangTai(false);
    }
  }, [toast]);

  useEffect(() => {
    nap();
  }, [nap]);

  function moThem() {
    setForm({ ...RONG });
    setLaThem(true);
    setSuaMo(true);
  }

  function moSua(c: CongTyCongThue) {
    setForm({
      mst: c.mst,
      tenCongTy: c.tenCongTy ?? '',
      tenDangNhap: c.tenDangNhap ?? '',
      matKhau: '',
      kyKeKhai: c.kyKeKhai ?? 'thang',
    });
    setLaThem(false);
    setSuaMo(true);
  }

  async function luu() {
    try {
      await hoaDonCongThueService.luuCongTy({
        mst: form.mst.trim(),
        tenCongTy: form.tenCongTy.trim(),
        tenDangNhap: form.tenDangNhap.trim() || form.mst.trim(),
        // Để trống khi sửa = giữ nguyên mật khẩu cũ, không phải xóa đi.
        matKhau: form.matKhau || null,
        kyKeKhai: form.kyKeKhai,
      });
      setSuaMo(false);
      await nap();
      toast({ title: laThem ? 'Đã thêm mã số thuế' : 'Đã cập nhật' });
    } catch (e: any) {
      toast({ title: 'Lưu không được', description: e?.message, variant: 'destructive' });
    }
  }

  async function quenMatKhau(c: CongTyCongThue) {
    try {
      await hoaDonCongThueService.quenMatKhau(c.mst);
      await nap();
      toast({ title: `Đã xóa mật khẩu đã lưu của ${c.mst}` });
    } catch (e: any) {
      toast({ title: 'Không xóa được', description: e?.message, variant: 'destructive' });
    }
  }

  /** Bật/tắt và chỉnh lịch ngay trên dòng — đây là thứ hay phải sửa nhất. */
  async function doiLich(c: CongTyCongThue, thayDoi: Partial<CongTyCongThue>) {
    try {
      await hoaDonCongThueService.datLich(c.mst, {
        tuDongTai: thayDoi.tuDongTai ?? c.tuDongTai,
        gioChay: thayDoi.gioChay ?? c.gioChay,
        soNgayKeoLai: thayDoi.soNgayKeoLai ?? c.soNgayKeoLai,
      });
      await nap();
    } catch (e: any) {
      toast({ title: 'Không đặt được lịch', description: e?.message, variant: 'destructive' });
      await nap();
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Hóa đơn cổng Thuế</h1>
          <p className="text-sm text-muted-foreground">
            Khai báo mã số thuế và lịch tải riêng cho từng công ty. Việc tải hằng ngày nằm ở
            Thuế › Hóa đơn cổng Thuế.
          </p>
        </div>
        <Button onClick={moThem}>Thêm mã số thuế</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã số thuế</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead>Kỳ kê khai</TableHead>
              <TableHead>Mật khẩu</TableHead>
              <TableHead>Tự động tải</TableHead>
              <TableHead>Giờ chạy</TableHead>
              <TableHead>Kéo lại</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {dangTai && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Đang tải…
                </TableCell>
              </TableRow>
            )}

            {!dangTai && ds.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Chưa khai báo mã số thuế nào.
                </TableCell>
              </TableRow>
            )}

            {ds.map((c) => (
              <TableRow key={c.mst}>
                <TableCell className="font-mono">{c.mst}</TableCell>
                <TableCell>{c.tenCongTy || '—'}</TableCell>
                <TableCell>{c.kyKeKhai === 'quy' ? 'Quý' : 'Tháng'}</TableCell>
                <TableCell>
                  {c.coLuuMatKhau ? (
                    <span className="text-emerald-700">Đã lưu</span>
                  ) : (
                    <span className="text-muted-foreground">Không lưu</span>
                  )}
                </TableCell>

                <TableCell>
                  <Switch
                    checked={c.tuDongTai}
                    disabled={!c.coLuuMatKhau}
                    onCheckedChange={(v) => doiLich(c, { tuDongTai: v })}
                  />
                </TableCell>

                <TableCell>
                  <Input
                    type="time"
                    className="w-28"
                    value={c.gioChay}
                    disabled={!c.tuDongTai}
                    onChange={(e) => doiLich(c, { gioChay: e.target.value })}
                  />
                </TableCell>

                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    className="w-20"
                    value={c.soNgayKeoLai}
                    disabled={!c.tuDongTai}
                    onChange={(e) => doiLich(c, { soNgayKeoLai: Number(e.target.value) })}
                  />
                </TableCell>

                <TableCell className="space-x-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => moSua(c)}>
                    Sửa
                  </Button>
                  {c.coLuuMatKhau && (
                    <Button size="sm" variant="ghost" onClick={() => quenMatKhau(c)}>
                      Xóa mật khẩu
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
        <p>
          <strong>Hai chế độ mật khẩu.</strong> Có lưu thì mỗi phiên chỉ cần gõ captcha, và mới đặt
          được lịch tự động. Không lưu thì kế toán nhập mật khẩu mỗi phiên, hệ thống không giữ lại
          gì — an toàn hơn cho công ty nhạy cảm, nhưng máy không tự tải thay bạn được.
        </p>
        <p>
          <strong>Kéo lại N ngày là có chủ đích.</strong> Hóa đơn lên cổng Thuế trễ vài ngày so với
          ngày lập, và hóa đơn bị thay thế hay điều chỉnh về sau cũng cần cập nhật lại. Cơ chế chống
          trùng đảm bảo không sinh bản ghi thừa.
        </p>
      </div>

      {/* ------------------------------------------------- Thêm / sửa MST */}
      <Dialog open={suaMo} onOpenChange={setSuaMo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{laThem ? 'Thêm mã số thuế' : `Sửa ${form.mst}`}</DialogTitle>
            <DialogDescription>
              Mật khẩu được mã hóa trước khi lưu và không bao giờ trả ra API.
              {!laThem && ' Để trống ô mật khẩu nghĩa là giữ nguyên mật khẩu cũ.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="mst">Mã số thuế</Label>
              <Input
                id="mst"
                value={form.mst}
                disabled={!laThem}
                onChange={(e) => setForm({ ...form, mst: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="ten">Tên công ty</Label>
              <Input
                id="ten"
                value={form.tenCongTy}
                onChange={(e) => setForm({ ...form, tenCongTy: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="tdn">Tên đăng nhập cổng Thuế</Label>
              <Input
                id="tdn"
                placeholder="Để trống thì dùng chính mã số thuế"
                value={form.tenDangNhap}
                onChange={(e) => setForm({ ...form, tenDangNhap: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="ky">Kỳ kê khai</Label>
              <Select
                value={form.kyKeKhai}
                onValueChange={(v) => setForm({ ...form, kyKeKhai: v })}
              >
                <SelectTrigger id="ky">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thang">Theo tháng</SelectItem>
                  <SelectItem value="quy">Theo quý</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mk">Mật khẩu cổng Thuế</Label>
              <Input
                id="mk"
                type="password"
                autoComplete="new-password"
                placeholder={laThem ? 'Để trống nếu không muốn lưu' : 'Để trống = giữ nguyên'}
                value={form.matKhau}
                onChange={(e) => setForm({ ...form, matKhau: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSuaMo(false)}>
              Hủy
            </Button>
            <Button onClick={luu} disabled={!form.mst.trim()}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CauHinhHoaDonCongThuePage;
