import { describe, it, expect } from "vitest";
import { AxiosError } from "axios";
import { ServiceBase } from "./service-base";
import { ApiErrorType } from "@/config/api";

/**
 * `handleError` là method private, nhưng TypeScript chỉ chặn truy cập qua dấu chấm —
 * bracket access vẫn hợp lệ về kiểu và không cần `as any`/`as unknown as`, nên test gọi
 * thẳng qua đường này thay vì phải dựng cả một request thật bị reject.
 */
function callHandleError(error: AxiosError) {
  const svc = new ServiceBase({ endpoint: "" });
  return svc["handleError"](error);
}

describe("ServiceBase.handleError", () => {
  it('đọc message từ envelope cũ { message } (không có "success")', () => {
    const error = new AxiosError(
      "Request failed with status code 409",
      undefined,
      undefined,
      undefined,
      {
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: {} as never,
        data: { message: "Người dùng đã là thành viên của công ty này" },
      },
    );

    const apiError = callHandleError(error);

    expect(apiError.message).toBe("Người dùng đã là thành viên của công ty này");
    expect(apiError.statusCode).toBe(409);
  });

  it('đọc message từ envelope GlobalExceptionFilter { success: false, error: { code, message } } khi message là chuỗi (HttpException thường, vd 409 trùng dữ liệu)', () => {
    const error = new AxiosError(
      "Request failed with status code 409",
      undefined,
      undefined,
      undefined,
      {
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: {} as never,
        data: {
          success: false,
          error: {
            code: "CONFLICT",
            message: "Email đã tồn tại trong hệ thống",
          },
        },
      },
    );

    const apiError = callHandleError(error);

    expect(apiError.message).toBe("Email đã tồn tại trong hệ thống");
    expect(apiError.statusCode).toBe(409);
  });

  it('lỗi validate của class-validator (nhiều field): GlobalExceptionFilter luôn đặt error.message cố định là "Validation failed" và chuyển message tiếng Việt thật vào error.details.validation — phải đọc mảng này, không phải error.message', () => {
    // Đúng hình dạng thật GlobalExceptionFilter trả về khi ValidationPipe ném lỗi (vd
    // `@ArrayMaxSize(2000, { message: 'Mỗi lần import tối đa 2000 dòng' })` của ImportItemsDto):
    // class-validator luôn gói message thật vào MẢNG (kể cả khi chỉ có 1 phần tử), nên
    // GlobalExceptionFilter luôn rơi vào nhánh `Array.isArray(resp.message)` và ghi đè
    // `message = 'Validation failed'` (tiếng Anh) + `details.validation = resp.message`.
    const error = new AxiosError(
      "Request failed with status code 400",
      undefined,
      undefined,
      undefined,
      {
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: {} as never,
        data: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: { validation: ["Mỗi lần import tối đa 2000 dòng"] },
          },
        },
      },
    );

    const apiError = callHandleError(error);

    expect(apiError.message).toBe("Mỗi lần import tối đa 2000 dòng");
    expect(apiError.statusCode).toBe(400);
  });

  it("không có message ở cả 2 envelope → rơi về error.message của axios", () => {
    const error = new AxiosError(
      "Request failed with status code 500",
      undefined,
      undefined,
      undefined,
      {
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: {} as never,
        data: {},
      },
    );

    const apiError = callHandleError(error);

    expect(apiError.message).toBe("Request failed with status code 500");
    expect(apiError.type).toBe(ApiErrorType.SERVER_ERROR);
  });
});
