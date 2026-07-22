import type {
  ImportColumn,
  ImportDanhMucConfig,
  RawImportRow,
  RefItem,
  RefRecord,
  RowValidationResult,
  ValidateOutcome,
} from "../types";

/** Dữ liệu danh mục tham chiếu, khóa là ImportColumn.key. */
export type RefData = Record<string, RefItem[]>;

/** Đọc một trường bất kỳ của bản ghi tham chiếu. RefItem cố ý không có index signature. */
const field = (item: RefItem, key: string): unknown => (item as RefRecord)[key];

const norm = (v: unknown): string => String(v ?? "").trim().toLowerCase();

/**
 * Excel lưu ngày là số ngày kể từ 1899-12-30 (đã tính cả lỗi năm nhuận 1900 của Excel).
 * Quy đổi trực tiếp qua UTC để không lệch múi giờ.
 */
export function excelSerialToISO(serial: number): string {
  const ms = Math.round(serial) * 86400000;
  const base = Date.UTC(1899, 11, 30);
  return new Date(base + ms).toISOString().slice(0, 10);
}

/** Nhận "01/06/2026" hoặc "2026-06-01" → "2026-06-01". Không hợp lệ trả null. */
function parseDate(raw: string | number): string | null {
  if (typeof raw === "number") return excelSerialToISO(raw);

  const text = String(raw).trim();
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const ymd = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  let y: number, m: number, d: number;
  if (dmy) {
    d = Number(dmy[1]);
    m = Number(dmy[2]);
    y = Number(dmy[3]);
  } else if (ymd) {
    y = Number(ymd[1]);
    m = Number(ymd[2]);
    d = Number(ymd[3]);
  } else {
    return null;
  }

  const dt = new Date(Date.UTC(y, m - 1, d));
  // chặn ngày không tồn tại như 31/02
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt.toISOString().slice(0, 10);
}

/** "1.000.000" hoặc "1,000,000" hoặc "1000000" → 1000000. Không hợp lệ trả null. */
function parseNumber(raw: string | number): number | null {
  if (typeof raw === "number") return raw;
  const cleaned = String(raw).replace(/[.,\s]/g, "");
  if (cleaned === "" || !/^-?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Nhận Có/Không, true/false, 1/0, x. Không hợp lệ trả null. */
function parseBoolean(raw: string | number): boolean | null {
  const t = norm(raw);
  if (["có", "co", "true", "1", "x"].includes(t)) return true;
  if (["không", "khong", "false", "0"].includes(t)) return false;
  return null;
}

/** Ô có thể là "CDT01" hoặc "CDT01 - Công ty A" (do dropdown file mẫu). Lấy phần mã. */
function refKeyOf(raw: string): string {
  const idx = raw.indexOf(" - ");
  return (idx === -1 ? raw : raw.slice(0, idx)).trim();
}

function resolveEnum(col: ImportColumn, raw: string): string | null {
  const list = col.enumValues ?? [];
  const hit = list.find(
    (o) => norm(o.value) === norm(raw) || norm(o.label) === norm(raw),
  );
  return hit ? hit.value : null;
}

function enumHint(col: ImportColumn): string {
  const list = (col.enumValues ?? []).map((o) => o.label).join(", ");
  return `${col.header} chỉ nhận: ${list}`;
}

/**
 * Chạy 4 nhóm kiểm tra trên từng dòng và dựng payload gửi BE.
 * - `existing`: dữ liệu hiện có của chính danh mục (kết quả config.service.getAll())
 * - `refData`: dữ liệu các danh mục tham chiếu, khóa theo ImportColumn.key
 */
export function validateAndBuild(
  rows: RawImportRow[],
  config: ImportDanhMucConfig,
  existing: RefItem[],
  refData: RefData,
): ValidateOutcome {
  // khóa trùng của dữ liệu đã có trong hệ thống
  const existingKeys = new Set(
    existing.map((item) =>
      config.uniqueBy.map((k) => norm(field(item, k))).join("|"),
    ),
  );
  // khóa trùng đã gặp trong chính file, ghi lại dòng đầu tiên
  const seenInFile = new Map<string, number>();

  const results: RowValidationResult[] = [];
  const validItems: Record<string, unknown>[] = [];

  for (const row of rows) {
    const errors: string[] = [];
    const payload: Record<string, unknown> = {};

    for (const col of config.columns) {
      const raw = row.values[col.key];
      const isBlank = raw === undefined || raw === null || String(raw).trim() === "";

      if (isBlank) {
        if (col.required) errors.push(`Thiếu ${col.header}`);
        continue;
      }

      if (col.ref) {
        const pool = refData[col.key] ?? [];
        const rawText = String(raw);
        const ref = col.ref;
        const matches = (p: RefItem, k: string) =>
          norm(field(p, ref.matchBy)) === norm(k);

        // So sánh tường minh === true: `if (ref.multi)` không loại được MultiRefSpec
        // ở nhánh else, khiến ref.assign nhận kiểu giao và không gọi được.
        if (ref.multi === true) {
          const keys = rawText.split(",").map((s) => refKeyOf(s)).filter(Boolean);
          const found: RefRecord[] = [];
          for (const k of keys) {
            const hit = pool.find((p) => matches(p, k));
            if (!hit) errors.push(`${ref.label} "${k}" không tồn tại`);
            else found.push(hit as RefRecord);
          }
          if (found.length === keys.length && found.length > 0) {
            Object.assign(payload, ref.assign(found));
          }
        } else {
          const k = refKeyOf(rawText);
          const hit = pool.find((p) => matches(p, k));
          if (!hit) errors.push(`${ref.label} "${k}" không tồn tại`);
          else Object.assign(payload, ref.assign(hit as RefRecord));
        }
        continue;
      }

      switch (col.type) {
        case "number": {
          const n = parseNumber(raw);
          if (n === null) errors.push(`${col.header} phải là số`);
          else payload[col.key] = n;
          break;
        }
        case "date": {
          const d = parseDate(raw);
          if (d === null)
            errors.push(`${col.header} không đúng định dạng ngày/tháng/năm`);
          else payload[col.key] = d;
          break;
        }
        case "boolean": {
          const b = parseBoolean(raw);
          if (b === null) errors.push(`${col.header} chỉ nhận Có hoặc Không`);
          else payload[col.key] = b;
          break;
        }
        case "enum": {
          const v = resolveEnum(col, String(raw));
          if (v === null) errors.push(enumHint(col));
          else payload[col.key] = v;
          break;
        }
        case "enumList": {
          const parts = String(raw).split(",").map((s) => s.trim()).filter(Boolean);
          const mapped: string[] = [];
          let bad = false;
          for (const p of parts) {
            const v = resolveEnum(col, p);
            if (v === null) bad = true;
            else mapped.push(v);
          }
          if (bad || mapped.length === 0) errors.push(enumHint(col));
          else payload[col.key] = mapped;
          break;
        }
        default:
          payload[col.key] = String(raw).trim();
      }
    }

    // kiểm tra trùng chỉ khi đã có đủ giá trị của các cột tạo khóa
    const keyParts = config.uniqueBy.map((k) => norm(row.values[k]));
    if (keyParts.every((p) => p !== "")) {
      const key = keyParts.join("|");
      if (existingKeys.has(key)) {
        errors.push("Mã đã tồn tại trong hệ thống");
      }
      const firstAt = seenInFile.get(key);
      if (firstAt !== undefined) {
        errors.push(`Mã bị trùng với dòng ${firstAt} trong file`);
      } else {
        seenInFile.set(key, row.rowNumber);
      }
    }

    const display = config.columns
      .slice(0, 2)
      .map((c) => String(row.values[c.key] ?? ""))
      .filter(Boolean)
      .join(" — ");

    results.push({
      rowNumber: row.rowNumber,
      display,
      errors,
      payload: errors.length === 0 ? payload : null,
    });
    if (errors.length === 0) validItems.push(payload);
  }

  return {
    results,
    validItems,
    hasErrors: results.some((r) => r.errors.length > 0),
  };
}
