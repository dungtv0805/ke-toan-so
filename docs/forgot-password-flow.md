# Luồng xử lý Forgot Password

## 1. Flow Diagram

```
User (Frontend)                        Backend (Auth Service)                  Mail Service
     |                                        |                                    |
     |  1. Click "Quên mật khẩu"              |                                    |
     |  2. Nhập email                         |                                    |
     |  3. POST /api/auth/forgot-password     |                                    |
     |--------------------------------------->|                                    |
     |                                        |  4. Tìm user theo email            |
     |                                        |  5. Nếu không tìm thấy:           |
     |                                        |     → vẫn trả success (chống leak) |
     |                                        |  6. Nếu tìm thấy:                 |
     |                                        |     → Tạo resetToken (crypto)      |
     |                                        |     → Lưu token + expiry vào       |
     |                                        |       UserCredential               |
     |                                        |     → Gửi email                    |
     |                                        |------------------------------------>|
     |                                        |                                    |  7. Gửi mail với link:
     |                                        |                                    |     {FRONTEND_URL}/reset-password?token={token}
     |  8. Hiển thị "Đã gửi email"            |                                    |
     |<---------------------------------------|                                    |
     |                                        |                                    |
     |  9. User mở email, click link          |                                    |
     |  10. Mở trang ResetPasswordPage        |                                    |
     |      (đọc token từ URL query)          |                                    |
     |                                        |                                    |
     |  11. Nhập mật khẩu mới + xác nhận     |                                    |
     |  12. POST /api/auth/reset-password     |                                    |
     |--------------------------------------->|                                    |
     |                                        |  13. Validate token:               |
     |                                        |      - Token tồn tại?              |
     |                                        |      - Token hết hạn?              |
     |                                        |  14. Hash mật khẩu mới             |
     |                                        |  15. Cập nhật password              |
     |                                        |  16. Xóa resetToken (one-time use) |
     |                                        |                                    |
     |  17. Hiển thị "Đổi MK thành công"      |                                    |
     |<---------------------------------------|                                    |
     |  18. Redirect về /login                |                                    |
```

---

## 2. API Endpoints

### 2.1. POST /forgot-password — Yêu cầu reset mật khẩu

**Route đầy đủ qua Gateway:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response — Luôn trả 200 OK** (không leak thông tin user tồn tại hay không):
```json
{
  "success": true,
  "data": {
    "message": "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu."
  }
}
```

**Logic xử lý:**
1. Nhận email từ request
2. Tìm User theo email
3. Nếu không tìm thấy → vẫn trả response success (chống user enumeration)
4. Nếu tìm thấy:
   - Tìm UserCredential theo userId
   - Tạo reset token bằng `crypto.randomBytes(32).toString('hex')` → 64 ký tự hex
   - Set `resetToken` = hash của token (dùng SHA-256, không lưu plaintext)
   - Set `resetTokenExpiry` = `Date.now() + 3600000` (1 giờ)
   - Lưu UserCredential
   - Gửi email chứa link reset: `{FRONTEND_URL}/reset-password?token={plaintext_token}`

**Error Cases:**
| Status | Trường hợp | Response |
|--------|-----------|----------|
| 200 | Email không tồn tại | `{ success: true, data: { message: "Nếu email tồn tại..." } }` |
| 200 | Email tồn tại, gửi mail thành công | `{ success: true, data: { message: "Nếu email tồn tại..." } }` |
| 400 | Email format không hợp lệ | `{ success: false, message: "Email không hợp lệ" }` |
| 500 | Lỗi gửi mail | `{ success: false, message: "Có lỗi xảy ra, vui lòng thử lại sau" }` |

---

### 2.2. POST /reset-password — Đặt lại mật khẩu

**Route đầy đủ qua Gateway:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "token": "abc123...hex64chars",
  "newPassword": "newSecurePassword123"
}
```

**Success Response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới."
  }
}
```

**Logic xử lý:**
1. Nhận token + newPassword từ request
2. Hash token bằng SHA-256 (vì DB lưu hashed token)
3. Tìm UserCredential có `resetToken` = hashed token VÀ `resetTokenExpiry` > Date.now()
4. Nếu không tìm thấy → trả 400 "Token không hợp lệ hoặc đã hết hạn"
5. Nếu tìm thấy:
   - Hash mật khẩu mới bằng bcrypt (10 salt rounds, giống pattern hiện tại)
   - Cập nhật `password` = hashed password mới
   - Xóa `resetToken` = null
   - Xóa `resetTokenExpiry` = null
   - Lưu UserCredential

**Error Cases:**
| Status | Trường hợp | Response |
|--------|-----------|----------|
| 200 | Reset thành công | `{ success: true, data: { message: "Đặt lại mật khẩu thành công..." } }` |
| 400 | Token không hợp lệ / hết hạn | `{ success: false, message: "Token không hợp lệ hoặc đã hết hạn" }` |
| 400 | Password validation fail | `{ success: false, message: "Mật khẩu phải có ít nhất 6 ký tự" }` |

---

## 3. Entity/Schema Changes

### 3.1. Thêm fields vào UserCredential

**File:** `be/libs/entities/src/auth/user-credential.entity.ts`

Thêm 2 columns mới:

```typescript
@Column({ nullable: true })
resetToken?: string;  // SHA-256 hash của reset token

@Column({ nullable: true })
resetTokenExpiry?: Date;  // Thời điểm token hết hạn
```

**Lý do chọn cách này thay vì tạo collection riêng:**
- UserCredential đã chứa thông tin xác thực (password, refreshToken)
- Reset token là thông tin xác thực tạm thời, thuộc cùng domain
- Đơn giản hơn, không cần tạo entity/repository mới
- Mỗi user chỉ có 1 reset token active tại 1 thời điểm (token mới sẽ ghi đè token cũ)

---

## 4. Mail Service

### 4.1. Package sử dụng

Dùng `nodemailer` trực tiếp (không cần @nestjs-modules/mailer vì chỉ gửi 1 loại email đơn giản).

```bash
cd be
yarn add nodemailer
yarn add -D @types/nodemailer
```

### 4.2. Cấu trúc Mail Service

**Tạo file mới:** `be/apps/auth-service/src/mail/mail.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendResetPasswordEmail(to: string, hoTen: string, resetLink: string): Promise<void> {
    // Xem template ở mục 4.4
  }
}
```

### 4.3. Environment Variables cần thêm

**File:** `be/.env-cmdrc` — thêm section `mail`:

```json
{
  "mail": {
    "SMTP_HOST": "smtp.gmail.com",
    "SMTP_PORT": "587",
    "SMTP_SECURE": "false",
    "SMTP_USER": "noreply@company.com",
    "SMTP_PASS": "app-specific-password",
    "SMTP_FROM": "\"Master CEO\" <noreply@company.com>",
    "FRONTEND_URL": "http://localhost:5173"
  }
}
```

**Lưu ý:** Auth service cần load thêm env `mail` trong script start. Cập nhật `package.json`:

```json
"start:auth:dev": "env-cmd -e db,jwt,services,auth,mail nest start auth-service --watch"
```

### 4.4. Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #1890ff; }
    .content { padding: 30px 0; }
    .btn { display: inline-block; padding: 12px 30px; background-color: #1890ff; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .footer { padding: 20px 0; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
    .warning { background-color: #fff3cd; padding: 10px 15px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Master CEO</h2>
    </div>
    <div class="content">
      <p>Xin chào <strong>{{hoTen}}</strong>,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{resetLink}}" class="btn">Đặt lại mật khẩu</a>
      </p>
      <div class="warning">
        ⚠️ Link này sẽ hết hạn sau <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
      </div>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống Master CEO.</p>
      <p>Vui lòng không trả lời email này.</p>
    </div>
  </div>
</body>
</html>
```

### 4.5. Reset Link Format

```
{FRONTEND_URL}/reset-password?token={plaintext_token}
```

Ví dụ: `http://localhost:5173/reset-password?token=a1b2c3d4e5f6...`

---

## 5. Frontend Pages

### 5.1. ForgotPasswordPage

**File:** `fe/src/pages/auth/ForgotPasswordPage.tsx`

**Mô tả:** Form nhập email để yêu cầu reset mật khẩu.

**UI Components (dùng Ant Design giống LoginPage):**
- Card container (giống layout LoginPage)
- Logo + tiêu đề "Quên mật khẩu"
- Text mô tả: "Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu"
- Form field: Email input (với validation email format)
- Button "Gửi yêu cầu" (loading state khi đang gọi API)
- Alert hiển thị success/error message
- Link "Quay lại đăng nhập" → navigate về `/login`

**States:**
- `loading`: boolean — đang gọi API
- `error`: string | null — lỗi từ API
- `submitted`: boolean — đã gửi thành công (hiển thị thông báo check email)

**Khi submitted = true:**
- Hiển thị icon mail + message "Kiểm tra email của bạn"
- Text: "Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư (bao gồm thư mục spam)."
- Button "Quay lại đăng nhập"

### 5.2. ResetPasswordPage

**File:** `fe/src/pages/auth/ResetPasswordPage.tsx`

**Mô tả:** Form nhập mật khẩu mới. Nhận token từ URL query parameter.

**UI Components:**
- Card container (giống layout LoginPage)
- Logo + tiêu đề "Đặt lại mật khẩu"
- Form fields:
  - Mật khẩu mới (Input.Password, min 6 ký tự)
  - Xác nhận mật khẩu (Input.Password, phải khớp với mật khẩu mới)
- Button "Đặt lại mật khẩu" (loading state)
- Alert hiển thị success/error

**States:**
- `loading`: boolean
- `error`: string | null
- `success`: boolean — reset thành công

**Logic:**
1. Đọc `token` từ `useSearchParams()`
2. Nếu không có token → hiển thị error "Link không hợp lệ" + link về login
3. Khi submit → gọi `POST /api/auth/reset-password` với `{ token, newPassword }`
4. Nếu thành công → hiển thị success message + auto redirect về `/login` sau 3 giây
5. Nếu lỗi → hiển thị error message

### 5.3. Routes cần thêm

**File:** `fe/src/App.tsx`

Thêm 2 public routes (cùng cấp với `/login`):

```tsx
{/* Public routes */}
<Route path="/login" element={<LoginPage />} />
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

### 5.4. Link từ LoginPage

**File:** `fe/src/pages/auth/LoginPage.tsx`

Thêm link "Quên mật khẩu?" dưới form login, trước button đăng nhập hoặc dưới button:

```tsx
<div className="text-right mb-4">
  <Link to="/forgot-password" className="text-primary hover:underline text-sm">
    Quên mật khẩu?
  </Link>
</div>
```

### 5.5. Auth Service (Frontend)

**File:** `fe/src/services/authService.ts`

Thêm 2 methods:

```typescript
async forgotPassword(email: string): Promise<{ message: string }> {
  return this.post<{ message: string }>({ email }, { endpoint: '/forgot-password' });
}

async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return this.post<{ message: string }>({ token, newPassword }, { endpoint: '/reset-password' });
}
```

### 5.6. Loadable exports

**File:** `fe/src/pages/loadable.ts` (hoặc `loadable.tsx`)

Thêm lazy imports cho 2 pages mới:

```typescript
export const ForgotPasswordPage = lazy(() => import('./auth/ForgotPasswordPage'));
export const ResetPasswordPage = lazy(() => import('./auth/ResetPasswordPage'));
```

---

## 6. Security Considerations

### 6.1. Token Security
- **Token format:** `crypto.randomBytes(32).toString('hex')` → 64 ký tự hex (256-bit entropy)
- **Lưu trữ:** Lưu SHA-256 hash của token trong DB, KHÔNG lưu plaintext. Khi verify, hash token từ request rồi so sánh
- **One-time use:** Xóa token sau khi sử dụng thành công
- **Token mới ghi đè cũ:** Mỗi lần request forgot-password, token cũ bị ghi đè → chỉ token mới nhất có hiệu lực

### 6.2. Token Expiry
- **Thời hạn:** 1 giờ (3600000ms)
- **Kiểm tra:** So sánh `resetTokenExpiry > new Date()` khi verify

### 6.3. Chống User Enumeration
- Endpoint `/forgot-password` LUÔN trả 200 OK với cùng message, bất kể email có tồn tại hay không
- Không trả thông tin user trong response

### 6.4. Rate Limiting
- Giới hạn 3 requests/email/15 phút cho endpoint `/forgot-password`
- Có thể implement đơn giản bằng cách check `resetTokenExpiry`: nếu token hiện tại chưa hết hạn và được tạo < 2 phút trước → từ chối (tránh spam mail)
- **Implementation đơn giản (giai đoạn 1):** Check nếu `resetTokenExpiry` tồn tại và > `Date.now() - 120000` (2 phút) → trả response success nhưng không gửi mail mới

### 6.5. Password Validation
- Tối thiểu 6 ký tự (giống ChangePasswordDto hiện tại)
- Tối đa 50 ký tự
- Dùng bcrypt hash với 10 salt rounds (giống pattern hiện tại)

### 6.6. Bảo mật Email
- Link reset chỉ gửi qua email đã đăng ký
- Email template không chứa thông tin nhạy cảm ngoài link reset
- Link có thời hạn rõ ràng trong email

---

## 7. Backend DTOs cần tạo

### 7.1. ForgotPasswordDto

**File:** `be/apps/auth-service/src/dto/forgot-password.dto.ts`

```typescript
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập email' })
  email: string;
}
```

### 7.2. ResetPasswordDto

**File:** `be/apps/auth-service/src/dto/reset-password.dto.ts`

```typescript
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(50, { message: 'Mật khẩu tối đa 50 ký tự' })
  newPassword: string;
}
```

### 7.3. Export DTOs

**File:** `be/apps/auth-service/src/dto/index.ts` — thêm:

```typescript
export * from './forgot-password.dto';
export * from './reset-password.dto';
```

---

## 8. Tóm tắt files cần tạo/sửa

### Backend (be/)

| Action | File | Mô tả |
|--------|------|--------|
| **SỬA** | `libs/entities/src/auth/user-credential.entity.ts` | Thêm `resetToken`, `resetTokenExpiry` |
| **TẠO** | `apps/auth-service/src/dto/forgot-password.dto.ts` | DTO cho forgot-password |
| **TẠO** | `apps/auth-service/src/dto/reset-password.dto.ts` | DTO cho reset-password |
| **SỬA** | `apps/auth-service/src/dto/index.ts` | Export 2 DTOs mới |
| **TẠO** | `apps/auth-service/src/mail/mail.service.ts` | Service gửi email |
| **SỬA** | `apps/auth-service/src/auth-service.module.ts` | Register MailService |
| **SỬA** | `apps/auth-service/src/auth-service.controller.ts` | Thêm 2 endpoints |
| **SỬA** | `apps/auth-service/src/auth-service.service.ts` | Thêm logic forgotPassword, resetPassword |
| **SỬA** | `.env-cmdrc` | Thêm section `mail` |
| **SỬA** | `package.json` | Cập nhật script start:auth:dev thêm env mail |

### Frontend (fe/)

| Action | File | Mô tả |
|--------|------|--------|
| **TẠO** | `src/pages/auth/ForgotPasswordPage.tsx` | Trang nhập email |
| **TẠO** | `src/pages/auth/ResetPasswordPage.tsx` | Trang nhập mật khẩu mới |
| **SỬA** | `src/services/authService.ts` | Thêm 2 methods API |
| **SỬA** | `src/pages/loadable.ts` | Thêm lazy imports |
| **SỬA** | `src/App.tsx` | Thêm 2 routes |
| **SỬA** | `src/pages/auth/LoginPage.tsx` | Thêm link "Quên mật khẩu?" |
