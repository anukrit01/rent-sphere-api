import bcrypt from 'bcryptjs';
import { User, UserRole, AuditAction } from '@prisma/client';
import { userRepository, UserRepository } from '../repositories/user.repository.js';
import { refreshTokenRepository, RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
} from '../utils/token.js';
import { excludeFields } from '../utils/response.js';
import { auditLogService, AuditLogService } from './audit-log.service.js';
import {
  DuplicateResourceError,
  InvalidCredentialsError,
  UnauthorizedError,
  NotFoundError,
  TokenExpiredError,
  ForbiddenError,
} from '../errors/app.error.js';

export type SanitizedUser = Omit<User, 'password'>;

export interface AuthResult {
  user: SanitizedUser;
  accessToken: string;
  refreshToken: string;
}

export interface RequestMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    private readonly userRepo: UserRepository = userRepository,
    private readonly tokenRepo: RefreshTokenRepository = refreshTokenRepository,
    private readonly auditService: AuditLogService = auditLogService
  ) {}

  /**
   * Registers a new user account with hashed password and generates initial token pair.
   */
  async register(input: RegisterInput, meta: RequestMetadata = {}): Promise<AuthResult> {
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) {
      throw new DuplicateResourceError('An account with this email address already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, this.saltRounds);

    const user = await this.userRepo.create({
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role: input.role || UserRole.RENTER,
      companyName: input.companyName,
      phone: input.phone,
      location: input.location,
      verified: false,
    });

    const tokenPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await this.tokenRepo.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiryDate(),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    // Audit log user creation (Section 40)
    await this.auditService.log(
      user.id,
      AuditAction.USER_CREATED,
      'User',
      user.id,
      { email: user.email, name: user.name, role: user.role }
    );

    return {
      user: excludeFields(user, ['password']),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticates user credentials via bcrypt and generates session tokens.
   */
  async login(input: LoginInput, meta: RequestMetadata = {}): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new InvalidCredentialsError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.password);
    if (!isMatch) {
      throw new InvalidCredentialsError('Invalid email or password');
    }

    if (user.isActive === false) {
      throw new ForbiddenError('Account has been deactivated. Please contact an administrator.');
    }

    const tokenPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await this.tokenRepo.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiryDate(),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return {
      user: excludeFields(user, ['password']),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotates a refresh token: verifies signature, confirms whitelist in DB,
   * deletes old token, and issues a fresh token pair.
   */
  async refresh(refreshToken: string, meta: RequestMetadata = {}): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    // 1. Verify signature and claims
    const payload = verifyRefreshToken(refreshToken);

    // 2. Check whitelist in database
    const tokenRecord = await this.tokenRepo.findByToken(refreshToken);
    if (!tokenRecord || tokenRecord.userId !== payload.sub) {
      // Possible token reuse / breach attempt: reject immediately
      throw new UnauthorizedError('Refresh token has been revoked or is invalid');
    }

    // 3. Verify expiration
    if (tokenRecord.expiresAt < new Date()) {
      await this.tokenRepo.deleteByToken(refreshToken);
      throw new TokenExpiredError('Refresh token has expired, please log in again');
    }

    const user = tokenRecord.user;

    // 4. Token Rotation: Delete old token from whitelist
    await this.tokenRepo.deleteByToken(refreshToken);

    // 5. Generate fresh token pair
    const tokenPayload = { sub: user.id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // 6. Persist new refresh token
    await this.tokenRepo.create({
      token: newRefreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiryDate(),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return {
      user: excludeFields(user, ['password']),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revokes a refresh token session in the database.
   */
  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.tokenRepo.deleteByToken(refreshToken);
    }
  }

  /**
   * Retrieves profile details for the authenticated user without password.
   */
  async getCurrentUser(userId: string): Promise<SanitizedUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }
    return excludeFields(user, ['password']);
  }
}

export const authService = new AuthService();
