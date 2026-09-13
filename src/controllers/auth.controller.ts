import { Request, Response } from 'express';
import { authService, AuthService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const meta = {
      userAgent: req.header('user-agent'),
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const result = await this.service.register(req.body, meta);

    // Set HTTP-only cookie for secure browsers, while returning in body for Angular
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendCreated(res, result);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const meta = {
      userAgent: req.header('user-agent'),
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const result = await this.service.login(req.body, meta);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, result);
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    const meta = {
      userAgent: req.header('user-agent'),
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const result = await this.service.refresh(refreshToken, meta);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, result);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    await this.service.logout(refreshToken);

    res.clearCookie('refreshToken');
    return sendSuccess(res, { message: 'Logged out successfully' });
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.getCurrentUser(req.user!.id);
    return sendSuccess(res, { user });
  });
}

export const authController = new AuthController();
