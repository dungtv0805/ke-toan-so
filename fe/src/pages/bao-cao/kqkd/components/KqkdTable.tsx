import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { KqkdChiTieu } from '@/services/kqkdService';

interface KqkdTableProps {
  data: KqkdChiTieu[];
  loading: boolean;
}

const formatNumber = (value: number): string => {
  if (value === 0) return '-';
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('vi-VN').format(abs);
  return value < 0 ? `(${formatted})` : formatted;
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  if (value === 0) return '-';
  const formatted = Math.abs(value).toFixed(1);
  return value < 0 ? `(${formatted}%)` : `${formatted}%`;
};

function numberColorClass(value: number): string {
  return value < 0 ? 'text-red-600' : '';
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function KqkdTable({ data, loading }: KqkdTableProps) {
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead rowSpan={2} className="w-[50px] border-r text-center">
              STT
            </TableHead>
            <TableHead rowSpan={2} className="min-w-[220px] border-r">
              Chỉ tiêu
            </TableHead>
            <TableHead rowSpan={2} className="w-[70px] border-r text-center">
              Mã số
            </TableHead>
            <TableHead colSpan={3} className="border-r text-center">
              Kỳ hiện tại
            </TableHead>
            <TableHead colSpan={3} className="border-r text-center">
              Kỳ trước
            </TableHead>
            <TableHead colSpan={2} className="text-center">
              Biến động
            </TableHead>
          </TableRow>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[120px] border-r text-right">Số tiền</TableHead>
            <TableHead className="w-[90px] border-r text-right">% DT thuần</TableHead>
            <TableHead className="w-[90px] border-r text-right">Tỷ trọng CP</TableHead>
            <TableHead className="w-[120px] border-r text-right">Số tiền</TableHead>
            <TableHead className="w-[90px] border-r text-right">% DT thuần</TableHead>
            <TableHead className="w-[90px] border-r text-right">Tỷ trọng CP</TableHead>
            <TableHead className="w-[120px] border-r text-right">Số tiền</TableHead>
            <TableHead className="w-[80px] text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                Không có dữ liệu
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => {
              const bold = row.isBold || row.isCalculated;

              return (
                <TableRow
                  key={row.ma}
                  className={bold ? 'bg-muted/30 font-semibold' : ''}
                >
                  <TableCell className="border-r text-center">
                    {index + 1}
                  </TableCell>
                  <TableCell
                    className="border-r"
                    style={{ paddingLeft: row.isCalculated ? '16px' : '32px' }}
                  >
                    {row.ten}
                  </TableCell>
                  <TableCell className="border-r text-center">{row.ma}</TableCell>

                  {/* Ky hien tai */}
                  <TableCell className={`border-r text-right ${numberColorClass(row.kyHienTai)}`}>
                    {formatNumber(row.kyHienTai)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatPercent(row.phanTramDTThuan)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatPercent(row.tyTrongChiPhi)}
                  </TableCell>

                  {/* Ky truoc */}
                  <TableCell className={`border-r text-right ${numberColorClass(row.kyTruoc)}`}>
                    {formatNumber(row.kyTruoc)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatPercent(row.phanTramDTThuanKyTruoc)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatPercent(row.tyTrongChiPhiKyTruoc)}
                  </TableCell>

                  {/* Bien dong */}
                  <TableCell className={`border-r text-right ${numberColorClass(row.bienDong)}`}>
                    {formatNumber(row.bienDong)}
                  </TableCell>
                  <TableCell className={`text-right ${row.phanTramBienDong !== null && row.phanTramBienDong < 0 ? 'text-red-600' : ''}`}>
                    {formatPercent(row.phanTramBienDong)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
