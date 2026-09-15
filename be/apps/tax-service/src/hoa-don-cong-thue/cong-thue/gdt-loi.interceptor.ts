import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import { GdtError } from './http';

/**
 * Dịch lỗi từ cổng Thuế thành lỗi HTTP có thông báo đọc được.
 *
 * GdtError là Error thuần, không phải HttpException, nên GlobalExceptionFilter
 * gom hết vào `500 An unexpected error occurred`. Kế toán gõ sai captcha cũng
 * nhận đúng câu đó, mà gõ đúng captcha nhưng sai mật khẩu cũng nhận câu đó —
 * không có cách nào tự biết mình phải sửa gì.
 *
 * KHÔNG BAO GIỜ trả 401 ra ngoài. Cổng Thuế dùng 401 cho phiên của NÓ, nhưng
 * với frontend thì 401 nghĩa là phiên đăng nhập Kế toán số hết hạn: service-base
 * sẽ xóa token và đá người dùng ra màn hình đăng nhập. Sai mật khẩu cổng Thuế mà
 * bị văng khỏi cả phần mềm là chuyện vô lý.
 */
@Injectable()
export class GdtLoiInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((err) =>
        throwError(() => (err instanceof GdtError ? doiSangHttp(err) : err)),
      ),
    );
  }
}

function doiSangHttp(err: GdtError): HttpException {
  switch (err.code) {
    // Người dùng sửa được: gõ lại captcha, hoặc sửa mật khẩu trong Cấu hình.
    case 'LOGIN_FAILED':
    case 'CAPTCHA_HET_HAN':
    case 'CAN_MAT_KHAU':
      return new HttpException(err.message, HttpStatus.BAD_REQUEST);

    // Phiên với cổng Thuế đã hết — cần bấm Đăng nhập lại, KHÔNG phải đăng xuất.
    case 'CHUA_DANG_NHAP':
    case 'UNAUTHORIZED':
      return new HttpException(
        err.message === 'Token hết hạn hoặc không hợp lệ'
          ? 'Phiên cổng Thuế đã hết hạn, hãy bấm Đăng nhập lại cho mã số thuế này'
          : err.message,
        HttpStatus.CONFLICT,
      );

    case 'KHONG_TIM_THAY':
      return new HttpException(err.message, HttpStatus.NOT_FOUND);
  }

  // Cổng chặn vì gọi quá dày, hoặc cổng đang sập: đây là lỗi tạm thời, thử lại sau.
  if (err.status === 429 || err.status === 503) {
    return new HttpException(err.message, HttpStatus.SERVICE_UNAVAILABLE);
  }

  // Còn lại là cổng Thuế trả về thứ mình không hiểu. 502 nói đúng bản chất:
  // hỏng ở hệ thống bên ngoài, không phải ở Kế toán số.
  return new HttpException(
    err.message || 'Cổng Thuế trả về lỗi không xác định',
    HttpStatus.BAD_GATEWAY,
  );
}
