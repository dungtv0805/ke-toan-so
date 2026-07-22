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

/**
 * Nhận số theo quy ước Việt Nam: dấu "." ngăn cách nhóm nghìn, dấu "," là phần thập phân.
 * Vẫn chấp nhận số thập phân dạng máy tính (chỉ có dấu "."), ví dụ ô number gốc từ Excel.
 * "1.000.000" → 1000000; "1.500,5" hoặc "1500,5" → 1500.5; "1500.5" → 1500.5.
 * Không hợp lệ (rỗng, không phải số, hai dấu chấm liền...) trả null.
 */
function parseNumber(raw: string | number): number | null {
  if (typeof raw === "number") return raw;

  // \s trong JS đã bao gồm cả NBSP (U+00A0), Excel hay chèn ký tự này khi dán số.
  let text = String(raw).replace(/\s/g, "");

  if (text.includes(",")) {
    // Có dấu phẩy ⇒ đó là phần thập phân, mọi dấu chấm còn lại là ngăn cách nghìn.
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    // Không có dấu phẩy nhưng đúng hình dạng nhóm nghìn (vd "1.000.000") ⇒ bỏ dấu chấm.
    text = text.replace(/\./g, "");
  }
  // Còn lại (vd "1500.5", "1.5") giữ nguyên, coi dấu chấm là thập phân kiểu máy tính.

  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

/** Nhận Có/Không, true/false, 1/0, x. Không hợp lệ trả null. */
function parseBoolean(raw: string | number): boolean | null {
  const t = norm(raw);
  if (["có", "co", "true", "1", "x"].includes(t)) return true;
  if (["không", "khong", "false", "0"].includes(t)) return false;
  return null;
}

/**
 * Ô có thể là "CDT01" hoặc "CDT01 - Công ty A" (do dropdown file mẫu). Lấy phần mã.
 * Giới hạn đã biết: tách theo lần xuất hiện ĐẦU TIÊN của " - ", nên một mã hoặc tên
 * có chứa đúng chuỗi " - " sẽ bị cắt cụt. Cố ý không xử lý (hiếm gặp trong dữ liệu thật).
 */
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
    // Giá trị đã quy đổi của từng cột, khóa theo ImportColumn.key — dùng để dò trùng
    // và hiển thị preview, KHÔNG dùng để dựng payload (payload đến từ nhánh switch/ref
    // ở trên, có thể ghi vào tên trường DTO khác với col.key, ví dụ "chuDauTuId").
    const converted: Record<string, unknown> = {};

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
            // Khóa canonical để dò trùng: mã (matchBy) của từng bản ghi dò được,
            // không phải chuỗi người dùng gõ trong ô.
            converted[col.key] = found
              .map((f) => field(f, ref.matchBy))
              .join(",");
          }
        } else {
          const k = refKeyOf(rawText);
          const hit = pool.find((p) => matches(p, k));
          if (!hit) errors.push(`${ref.label} "${k}" không tồn tại`);
          else {
            Object.assign(payload, ref.assign(hit as RefRecord));
            converted[col.key] = field(hit as RefRecord, ref.matchBy);
          }
        }
        continue;
      }

      switch (col.type) {
        case "number": {
          const n = parseNumber(raw);
          if (n === null) errors.push(`${col.header} phải là số`);
          else {
            payload[col.key] = n;
            converted[col.key] = n;
          }
          break;
        }
        case "date": {
          const d = parseDate(raw);
          if (d === null)
            errors.push(`${col.header} không đúng định dạng ngày/tháng/năm`);
          else {
            payload[col.key] = d;
            converted[col.key] = d;
          }
          break;
        }
        case "boolean": {
          const b = parseBoolean(raw);
          if (b === null) errors.push(`${col.header} chỉ nhận Có hoặc Không`);
          else {
            payload[col.key] = b;
            converted[col.key] = b;
          }
          break;
        }
        case "enum": {
          const v = resolveEnum(col, String(raw));
          if (v === null) errors.push(enumHint(col));
          else {
            payload[col.key] = v;
            converted[col.key] = v;
          }
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
          else {
            payload[col.key] = mapped;
            converted[col.key] = mapped;
          }
          break;
        }
        default: {
          const s = String(raw).trim();
          payload[col.key] = s;
          converted[col.key] = s;
        }
      }
    }

    // kiểm tra trùng chỉ khi đã có đủ giá trị của các cột tạo khóa. Ưu tiên giá trị
    // đã quy đổi (converted) — ô chưa quy đổi được (lỗi, hoặc cột không thuộc dòng
    // này) thì lấy tạm giá trị thô để không làm gãy luồng, dù khi đó dòng đã có lỗi rồi.
    const keyParts = config.uniqueBy.map((k) =>
      norm(k in converted ? converted[k] : row.values[k]),
    );
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

    // Preview cũng ưu tiên giá trị đã quy đổi, để cột ngày không hiện số serial thô.
    const display = config.columns
      .slice(0, 2)
      .map((c) => String((c.key in converted ? converted[c.key] : row.values[c.key]) ?? ""))
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
