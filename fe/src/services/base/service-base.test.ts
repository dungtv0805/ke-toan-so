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

  it('đọc message từ envelope GlobalExceptionFilter { success: false, error: { code, message } }', () => {
    const error = new AxiosError(
      "Request failed with status code 413",
      undefined,
      undefined,
      undefined,
      {
        status: 413,
        statusText: "Payload Too Large",
        headers: {},
        config: {} as never,
        data: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Mỗi lần import tối đa 2000 dòng",
          },
        },
      },
    );

    const apiError = callHandleError(error);

    expect(apiError.message).toBe("Mỗi lần import tối đa 2000 dòng");
    expect(apiError.statusCode).toBe(413);
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
