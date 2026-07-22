import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type {
  ImportDanhMucConfig,
  RefItem,
  RowValidationResult,
} from "./types";
import type { RefData } from "./lib/validate";

export interface ImportDanhMucStates extends BaseStates {
  /** Config của danh mục đang import — modal set vào state khi mở. */
  config: ImportDanhMucConfig | null;
  loadingRefs: boolean;
  refsLoaded: boolean;
  /** Dữ liệu hiện có của chính danh mục, dùng để dò trùng. */
  existing: RefItem[];
  /** Dữ liệu các danh mục tham chiếu, khóa theo ImportColumn.key. */
  refData: RefData;
  parsing: boolean;
  submitting: boolean;
  fileName: string;
  results: RowValidationResult[];
  validItems: Record<string, unknown>[];
  hasErrors: boolean;
  /** Đã có kết quả xem trước chưa. */
  parsed: boolean;
}
