import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  NHAN_TRANG_THAI,
  type CongTyCongThue,
  type LuotChay,
  type TrangThaiPhien,
} from '@/services/hoaDonCongThueService';

const homNay = () => new Date().toISOString().slice(0, 10);
const dauThangNay = () => `${new Date().toISOString().slice(0, 7)}-01`;

/**
 * Tải hóa đơn điện tử từ cổng Thuế.
 *
 * Nút thắt của màn hình này là CAPTCHA: cổng Thuế bắt nhập mã cho mỗi phiên
 * đăng nhập, nên mọi thứ chạm tới cổng đều phải đi qua một người ngồi đó. Thiết
 * kế vì thế xoay quanh việc gom captcha lại cho gọn thay vì giấu nó đi.
 */
const HoaDonCongThuePage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [congTy, setCongTy] = useState<CongTyCongThue[]>([]);
  const [phien, setPhien] = useState<TrangThaiPhien[]>([]);
  const [dangTai, setDangTai] = useState(true);

  const [khoang, setKhoang] = useState({ tuNgay: dauThangNay(), denNgay: homNay() });
  const [luot, setLuot] = useState<LuotChay | null>(null);
  const hoiRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [captcha, setCaptcha] = useState<{ mst: string; sessionId: string; svg: string } | null>(null);
  const [maCaptcha, setMaCaptcha] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const nap = useCallback(async () => {
    try {
      const [ds, ph] = await Promise.all([
        hoaDonCongThueService.danhSachCongTy(),
        hoaDonCongThueService.trangThaiPhien(),
      ]);
      setCongTy(ds ?? []);
      setPhien(ph ?? []);
    } catch (e: any) {
      toast({ title: 'Không tải được danh sách', description: e?.message, variant: 'destructive' });
    } finally {
      setDangTai(false);
    }
  }, [toast]);

  useEffect(() => {
    nap();
    hoaDonCongThueService.luotGanNhat().then(setLuot).catch(() => undefined);
  }, [nap]);

  // Lượt chạy diễn ra ở phía máy chủ nên đóng tab không làm hỏng nó; ở đây chỉ
  // hỏi tiến độ cho tới khi xong.
  useEffect(() => {
    if (!luot || luot.trangThai !== 'dang_chay') {
      if (hoiRef.current) clearInterval(hoiRef.current);
      return;
    }
    hoiRef.current = setInterval(async () => {
      const moi = await hoaDonCongThueService.luotChay(luot.id).catch(() => null);
      if (moi) setLuot(moi);
    }, 2000);
    return () => {
      if (hoiRef.current) clearInterval(hoiRef.current);
    };
  }, [luot?.id, luot?.trangThai]);

  const daDangNhap = (mst: string) => phien.find((p) => p.mst === mst)?.daDangNhap ?? false;

  async function moDangNhap(c: CongTyCongThue) {
    try {
      const r = await hoaDonCongThueService.dangNhap(c.mst);
      if (r.sessionId && r.captchaSvg) {
        setCaptcha({ mst: c.mst, sessionId: r.sessionId, svg: r.captchaSvg });
        setMaCaptcha('');
      }
    } catch (e: any) {
      toast({ title: 'Không lấy được mã captcha', description: e?.message, variant: 'destructive' });
    }
  }

  async function guiCaptcha() {
    if (!captcha || !maCaptcha.trim()) return;
    setDangGui(true);
    try {
      await hoaDonCongThueService.guiCaptcha(captcha.sessionId, maCaptcha.trim());
      setCaptcha(null);
      await nap();
      toast({ title: `Đã đăng nhập ${captcha.mst}` });
    } catch (e: any) {
      toast({ title: 'Sai mã captcha hoặc mật khẩu', description: e?.message, variant: 'destructive' });
    } finally {
      setDangGui(false);
    }
  }

  async function taiHangLoat() {
    try {
      const l = await hoaDonCongThueService.taiHangLoat({ ...khoang });
      setLuot(l);
    } catch (e: any) {
      toast({ title: 'Không bắt đầu được', description: e?.message, variant: 'destructive' });
    }
  }

  const canCaptcha = (luot?.muc ?? []).filter((m) => m.trangThai === 'can_captcha');

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Hóa đơn cổng Thuế</h1>
          <p className="text-sm text-muted-foreground">
            Đăng nhập cổng Thuế và tải hóa đơn. Khai báo mã số thuế, mật khẩu và lịch tải nằm ở
            Cấu hình.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/cau-hinh/hoa-don-cong-thue')}>
          Cấu hình mã số thuế
        </Button>
      </div>

      {/* ------------------------------------------------ Danh sách MST */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã số thuế</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead>Mật khẩu</TableHead>
              <TableHead>Phiên cổng Thuế</TableHead>
              <TableHead>Lịch tải riêng</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dangTai && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Đang tải…
                </TableCell>
              </TableRow>
            )}

            {!dangTai && congTy.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Chưa khai báo mã số thuế nào. Thêm một mã để bắt đầu.
                </TableCell>
              </TableRow>
            )}

            {congTy.map((c) => (
              <TableRow key={c.mst}>
                <TableCell className="font-mono">{c.mst}</TableCell>
                <TableCell>{c.tenCongTy || '—'}</TableCell>
                <TableCell>
                  {c.coLuuMatKhau ? (
                    <span className="text-emerald-700">Đã lưu</span>
                  ) : (
                    <span className="text-muted-foreground">Không lưu</span>
                  )}
                </TableCell>
                <TableCell>
                  {daDangNhap(c.mst) ? (
                    <span className="text-emerald-700">Đang kết nối</span>
                  ) : (
                    <span className="text-amber-700">Chưa đăng nhập</span>
                  )}
                </TableCell>
                <TableCell>
                  {c.tuDongTai
                    ? `${c.gioChay} hằng ngày, kéo lại ${c.soNgayKeoLai} ngày`
                    : <span className="text-muted-foreground">Tắt</span>}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => moDangNhap(c)}>
                    {daDangNhap(c.mst) ? 'Đăng nhập lại' : 'Đăng nhập'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ------------------------------------------------- Tải hàng loạt */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="tu">Từ ngày</Label>
            <Input
              id="tu"
              type="date"
              value={khoang.tuNgay}
              onChange={(e) => setKhoang({ ...khoang, tuNgay: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="den">Đến ngày</Label>
            <Input
              id="den"
              type="date"
              value={khoang.denNgay}
              onChange={(e) => setKhoang({ ...khoang, denNgay: e.target.value })}
            />
          </div>
          <Button onClick={taiHangLoat} disabled={luot?.trangThai === 'dang_chay'}>
            {luot?.trangThai === 'dang_chay' ? 'Đang tải…' : `Tải ${congTy.length} mã số thuế`}
          </Button>
          {canCaptcha.length > 0 && (
            <Button
              variant="outline"
              onClick={async () => {
                await hoaDonCongThueService.chayTiep(luot!.id);
                const moi = await hoaDonCongThueService.luotChay(luot!.id);
                if (moi) setLuot(moi);
              }}
            >
              Chạy tiếp {canCaptcha.length} mã đã xác thực
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Cổng Thuế bắt nhập captcha cho mỗi phiên, nên mã nào chưa đăng nhập sẽ được xếp vào hàng
          chờ thay vì làm dừng cả lượt chạy. Đăng nhập xong thì bấm chạy tiếp cho đúng phần còn thiếu.
        </p>

        {luot && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã số thuế</TableHead>
                <TableHead>Công ty</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hóa đơn</TableHead>
                <TableHead className="text-right">Thêm mới</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {luot.muc.map((m) => (
                <TableRow key={m.mst}>
                  <TableCell className="font-mono">{m.mst}</TableCell>
                  <TableCell>{m.tenCongTy}</TableCell>
                  <TableCell>{NHAN_TRANG_THAI[m.trangThai]}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.timThay || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.themMoi || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.ghiChu || ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* -------------------------------------------------------- Captcha */}
      <Dialog open={Boolean(captcha)} onOpenChange={(o) => !o && setCaptcha(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhập mã captcha — {captcha?.mst}</DialogTitle>
            <DialogDescription>
              Cổng Thuế yêu cầu mã này cho mỗi phiên đăng nhập. Token sống khoảng một giờ nên mỗi mã
              số thuế chỉ phải gõ một lần mỗi phiên làm việc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* SVG do máy chủ NGOÀI sinh ra: nhúng qua <img> chứ không đưa thẳng
                vào DOM, vì nội dung SVG có thể chứa script. */}
            {captcha && (
              <img
                alt="Mã captcha từ cổng Thuế"
                className="h-20 w-full rounded border bg-white object-contain"
                src={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(captcha.svg)))}`}
              />
            )}
            <Input
              autoFocus
              value={maCaptcha}
              placeholder="Gõ mã trong ảnh"
              onChange={(e) => setMaCaptcha(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && guiCaptcha()}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCaptcha(null)}>
              Hủy
            </Button>
            <Button onClick={guiCaptcha} disabled={!maCaptcha.trim() || dangGui}>
              {dangGui ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HoaDonCongThuePage;
