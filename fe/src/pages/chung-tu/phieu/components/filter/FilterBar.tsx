import dayjs from "dayjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePhieuState, usePhieuHandler } from "../../PhieuHandlerContext";
import { Search, Filter, RotateCcw, Plus, Upload } from "lucide-react";

export function FilterBar() {
  const handler = usePhieuHandler();

  const [searchText] = usePhieuState("searchText", "");
  const [dateRange] = usePhieuState("dateRange", null);
  const [filterDoiTuong] = usePhieuState("filterDoiTuong", undefined);
  const [filterDuAn] = usePhieuState("filterDuAn", undefined);
  const [filterBoPhan] = usePhieuState("filterBoPhan", undefined);
  const [filterTaiKhoanNo] = usePhieuState("filterTaiKhoanNo", undefined);
  const [filterTaiKhoanCo] = usePhieuState("filterTaiKhoanCo", undefined);

  const [doiTuongList] = usePhieuState("doiTuongList", []);
  const [duAnList] = usePhieuState("duAnList", []);
  const [boPhanList] = usePhieuState("boPhanList", []);
  const [taiKhoanList] = usePhieuState("taiKhoanList", []);

  const [, setFormModalOpen] = usePhieuState("formModalOpen", false);
  const [, setEditingPhieu] = usePhieuState("editingPhieu", null);
  const [, setImportModalOpen] = usePhieuState("importModalOpen", false);

  const handleSearchChange = (value: string) => {
    handler.executeEvent("setFilter", { key: "searchText", value });
  };

  // Radix <SelectItem> cannot have an empty-string value, so the "Tất cả"
  // (no-filter) option uses this sentinel and is mapped back to undefined.
  const ALL = "__all__";

  const handleSelectFilter = (key: string, value: string | undefined) => {
    handler.executeEvent("setFilter", { key, value });
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Search + dates */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm số phiếu, nội dung..."
            className="pl-9 h-9"
            value={searchText ?? ""}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Từ:</span>
          <Input
            type="date"
            className="w-[140px] h-9"
            value={dateRange?.[0] ? dateRange[0].format("YYYY-MM-DD") : ""}
            onChange={(e) => {
              const start = e.target.value ? dayjs(e.target.value) : null;
              const end = dateRange?.[1] ?? null;
              handler.executeEvent("setFilter", {
                key: "dateRange",
                value: start && end ? [start, end] : start ? [start, start] : null,
              });
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Đến:</span>
          <Input
            type="date"
            className="w-[140px] h-9"
            value={dateRange?.[1] ? dateRange[1].format("YYYY-MM-DD") : ""}
            onChange={(e) => {
              const start = dateRange?.[0] ?? null;
              const end = e.target.value ? dayjs(e.target.value) : null;
              handler.executeEvent("setFilter", {
                key: "dateRange",
                value: start && end ? [start, end] : end ? [end, end] : null,
              });
            }}
          />
        </div>
      </div>

      {/* Row 2: Selects */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterDoiTuong ?? ALL}
          onValueChange={(v) =>
            handleSelectFilter("filterDoiTuong", v === ALL ? undefined : v)
          }
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Đối tượng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả</SelectItem>
            {doiTuongList.map((dt) => (
              <SelectItem key={dt.ma} value={dt.ma}>
                {dt.ten}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterDuAn ?? ALL}
          onValueChange={(v) =>
            handleSelectFilter("filterDuAn", v === ALL ? undefined : v)
          }
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Dự án" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả</SelectItem>
            {duAnList.map((da) => (
              <SelectItem key={da.ma} value={da.ma}>
                {da.ten}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterBoPhan ?? ALL}
          onValueChange={(v) =>
            handleSelectFilter("filterBoPhan", v === ALL ? undefined : v)
          }
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Bộ phận" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả</SelectItem>
            {boPhanList.map((bp) => (
              <SelectItem key={bp.ma} value={bp.ma}>
                {bp.ten}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterTaiKhoanNo ?? ALL}
          onValueChange={(v) =>
            handleSelectFilter("filterTaiKhoanNo", v === ALL ? undefined : v)
          }
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="TK Nợ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả</SelectItem>
            {taiKhoanList.map((tk) => (
              <SelectItem key={tk.ma} value={tk.ma}>
                {tk.ma} - {tk.ten}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterTaiKhoanCo ?? ALL}
          onValueChange={(v) =>
            handleSelectFilter("filterTaiKhoanCo", v === ALL ? undefined : v)
          }
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="TK Có" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả</SelectItem>
            {taiKhoanList.map((tk) => (
              <SelectItem key={tk.ma} value={tk.ma}>
                {tk.ma} - {tk.ten}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 3: Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => handler.executeEvent("applyFilters", {})}
        >
          <Filter className="h-4 w-4 mr-1" />
          Lọc
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handler.executeEvent("resetFilters", {})}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Đặt lại
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setImportModalOpen(true)}
        >
          <Upload className="h-4 w-4 mr-1" />
          Import Excel
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setEditingPhieu(null);
            setFormModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Thêm phiếu
        </Button>
      </div>
    </div>
  );
}
