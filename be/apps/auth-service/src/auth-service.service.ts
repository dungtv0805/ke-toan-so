import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserCredential, UserRole, UserStatus } from '@app/entities';
import {
  LoginDto,
  RegisterDto,
  VerifyTokenDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto';
import { JwtService, UserPayload } from '@app/auth';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthServiceService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserCredential)
    private readonly userCredentialRepository: Repository<UserCredential>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Login with email and password
   * Returns JWT token if credentials are valid
   */
  async login(
    loginDto: LoginDto,
  ): Promise<{ token: string; user: Partial<User> }> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.trangThai !== UserStatus.HOAT_DONG) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Lookup UserCredential by userId
    const credential = await this.userCredentialRepository.findOne({
      where: { userId: user._id.toString(), isActive: true },
    });

    if (!credential) {
      throw new InternalServerErrorException('User credential not found');
    }

    const isPasswordValid = await bcrypt.compare(password, credential.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update lastLoginAt
    credential.lastLoginAt = new Date();
    await this.userCredentialRepository.save(credential);

    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      vaiTro: user.vaiTro,
      permissions: user.permissions,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        _id: user._id,
        email: user.email,
        hoTen: user.hoTen,
        vaiTro: user.vaiTro,
        permissions: user.permissions,
      },
    };
  }

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<Partial<User>> {
    const { email, password, hoTen, vaiTro, permissions } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user without password
    const user = this.userRepository.create({
      email,
      hoTen,
      vaiTro: vaiTro || UserRole.KIEM_SOAT,
      permissions: permissions || [],
      trangThai: UserStatus.HOAT_DONG,
    });

    const savedUser = await this.userRepository.save(user);

    // Create UserCredential with hashed password
    const credential = this.userCredentialRepository.create({
      userId: savedUser._id.toString(),
      password: hashedPassword,
      isActive: true,
    });

    await this.userCredentialRepository.save(credential);

    return {
      _id: savedUser._id,
      email: savedUser.email,
      hoTen: savedUser.hoTen,
      vaiTro: savedUser.vaiTro,
      permissions: savedUser.permissions,
    };
  }

  /**
   * Verify a JWT token and return decoded payload
   */
  verify(verifyDto: VerifyTokenDto): UserPayload {
    try {
      const decoded = this.jwtService.verify(verifyDto.token);
      return {
        id: decoded.sub,
        email: decoded.email,
        vaiTro: decoded.vaiTro,
        permissions: decoded.permissions,
      };
    } catch (error) {
      throw new UnauthorizedException((error as Error).message);
    }
  }

  /**
   * Get current user profile by ID
   */
  async getMe(userId: string): Promise<Partial<User>> {
    const { ObjectId } = await import('mongodb');
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      _id: user._id,
      email: user.email,
      hoTen: user.hoTen,
      vaiTro: user.vaiTro,
      permissions: user.permissions,
      trangThai: user.trangThai,
      createdAt: user.createdAt,
    };
  }

  /**
   * Logout - invalidate token (placeholder for token blacklist)
   */
  logout(userId: string): { message: string } {
    // In a production system, you would add the token to a blacklist
    // For now, we just return success
    return { message: 'Logged out successfully' };
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateDto: UpdateProfileDto,
  ): Promise<Partial<User>> {
    const { ObjectId } = await import('mongodb');
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update fields
    if (updateDto.hoTen) {
      user.hoTen = updateDto.hoTen;
    }

    const savedUser = await this.userRepository.save(user);

    return {
      _id: savedUser._id,
      email: savedUser.email,
      hoTen: savedUser.hoTen,
      vaiTro: savedUser.vaiTro,
      permissions: savedUser.permissions,
      trangThai: savedUser.trangThai,
    };
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { ObjectId } = await import('mongodb');
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Get user credential
    const credential = await this.userCredentialRepository.findOne({
      where: { userId: user._id.toString(), isActive: true },
    });

    if (!credential) {
      throw new InternalServerErrorException('User credential not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      credential.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    // Hash new password and save
    credential.password = await bcrypt.hash(
      changePasswordDto.newPassword,
      SALT_ROUNDS,
    );
    credential.updatedAt = new Date();
    await this.userCredentialRepository.save(credential);

    return { message: 'Đổi mật khẩu thành công' };
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
