import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import {
  LoginDto,
  RegisterDto,
  VerifyTokenDto,
  UpdateProfileDto,
  ChangePasswordDto,
  SelectTenantDto,
} from './dto';
import { JwtGuard, CurrentUser } from '@app/auth';
import type { UserPayload } from '@app/auth';

@Controller()
export class AuthServiceController {
  constructor(private readonly authService: AuthServiceService) {}

  /**
   * POST /login
   * Authenticate user and return JWT token or tempToken + tenants list
   * - Case 1: User có 1 tenant → accessToken + tenant
   * - Case 2: User có nhiều tenants → tempToken + tenants[]
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /select-tenant
   * Select tenant after login (step 2 of 2-step flow)
   * Returns accessToken with selected tenantId
   */
  @Post('select-tenant')
  @HttpCode(HttpStatus.OK)
  async selectTenant(@Body() selectTenantDto: SelectTenantDto) {
    const result = await this.authService.selectTenant(selectTenantDto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /register
   * Register a new user
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return {
      success: true,
      data: user,
    };
  }

  /**
   * POST /verify
   * Verify a JWT token and return decoded payload
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() verifyDto: VerifyTokenDto) {
    const payload = this.authService.verify(verifyDto);
    return {
      success: true,
      data: payload,
    };
  }

  /**
   * GET /me
   * Get current user profile with tenant info (requires authentication)
   */
  @Get('me')
  @UseGuards(JwtGuard)
  async getMe(@CurrentUser() user: UserPayload) {
    const profile = await this.authService.getMe(user.id, user.tenantId);
    return {
      success: true,
      data: profile,
    };
  }

  /**
   * PUT /me
   * Update current user profile (requires authentication)
   */
  @Put('me')
  @UseGuards(JwtGuard)
  async updateProfile(
    @CurrentUser() user: UserPayload,
    @Body() updateDto: UpdateProfileDto,
  ) {
    const profile = await this.authService.updateProfile(user.id, updateDto);
    return {
      success: true,
      data: profile,
    };
  }

  /**
   * POST /change-password
   * Change current user password (requires authentication)
   */
  @Post('change-password')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: UserPayload,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(
      user.id,
      changePasswordDto,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /logout
   * Logout current user (requires authentication)
   */
  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: UserPayload) {
    const result = this.authService.logout(user.id);
    return {
      success: true,
      data: result,
    };
  }
}
