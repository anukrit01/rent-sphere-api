import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new contractor (RENTER) or asset owner (LEASER)
 * @access  Public
 */
router.post('/register', validateRequest({ body: registerSchema }), authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate credentials and obtain access & refresh tokens
 * @access  Public
 */
router.post('/login', validateRequest({ body: loginSchema }), authController.login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Rotate and issue a new token pair using a valid refresh token
 * @access  Public
 */
router.post('/refresh', validateRequest({ body: refreshTokenSchema }), authController.refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke the active refresh token session
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (Authenticated)
 */
router.get('/me', authenticate, authController.getMe);

export const authRoutes = router;
