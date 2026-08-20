import { describe, it, expect } from "vitest";
import * as configs from "../index";
import type { ImportDanhMucConfig } from "../../types";

/**
 * Danh sách resource mà backend thực sự hỗ trợ — chép tay từ:
 *   - be/apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.ts
 *   - be/apps/config-service/src/import-danh-muc/import-danh-muc.controller.ts ('quy-chuan')
 *
 * Cố ý viết tay (không derive từ configs/index.ts): nếu một config nào đó gõ sai `resource`,
 * danh sách này vẫn đứng yên và test bên dưới sẽ bắt được lỗi. Khi backend thêm/đổi resource,
 * cập nhật danh sách này cho khớp.
 */
const KNOWN_RESOURCES = [
  "tai-khoan",
  "doi-tuong",
  "du-an",
  "san-pham",
  "hop-dong",
  "bo-phan",
  "khoan-muc",
  "kho",
  "hang-hoa-vat-tu",
  "don-vi-tinh",
  "ly-do-khong-hop-le",
  "nhom-vat-tu",
  "nhom-san-pham",
  "chu-dau-tu",
  "nhom-khoan-muc",
  "ngan-hang",
  "dong-tien",
  "nhom-khuyen-mai",
  "nhom-quan-ly",
  "loai-chung-tu",
  "loai-giao-dich",
  "ho-so-chung-tu",
  "quy-chuan",
] as const;

/** resource dùng config-service thay vì master-data-service mặc định. */
const CONFIG_SERVICE_RESOURCES = ["quy-chuan"];

function isImportDanhMucConfig(value: unknown): value is ImportDanhMucConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    "resource" in value &&
    "columns" in value
  );
}

/** Mọi export dạng ImportDanhMucConfig trong configs/index.ts — tự động phủ config mới thêm sau này. */
const allConfigs = Object.entries(configs).filter(
  (entry): entry is [string, ImportDanhMucConfig] => isImportDanhMucConfig(entry[1])
);

describe("import-danh-muc configs", () => {
  it("configs/index.ts phải export ít nhất một config để test này có tác dụng", () => {
    expect(allConfigs.length).toBeGreaterThan(0);
  });

  it.each(allConfigs)(
    "%s: resource phải khớp với registry phía backend",
    (exportName, config) => {
      expect(
        KNOWN_RESOURCES,
        `Config "${exportName}" có resource "${config.resource}" không tồn tại trong registry backend. ` +
          `Kiểm tra lại chính tả hoặc cập nhật KNOWN_RESOURCES nếu backend vừa thêm resource mới.`
      ).toContain(config.resource);
    }
  );

  it.each(allConfigs)(
    "%s: apiPrefix phải nhất quán với resource ('quy-chuan' → /config, còn lại mặc định /master-data)",
    (exportName, config) => {
      const expectedPrefix = CONFIG_SERVICE_RESOURCES.includes(config.resource)
        ? "/config"
        : undefined;

      expect(
        config.apiPrefix,
        `Config "${exportName}" (resource "${config.resource}") có apiPrefix "${config.apiPrefix}" ` +
          `nhưng lẽ ra phải là "${expectedPrefix ?? "(bỏ trống, dùng mặc định /master-data)"}".`
      ).toBe(expectedPrefix);
    }
  );
});
