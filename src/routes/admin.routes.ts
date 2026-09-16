import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { adminController } from '../controllers/admin.controller.js';
import { auditLogController } from '../controllers/audit-log.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { uuidParamSchema, paginationQuerySchema } from '../validators/common.validator.js';
import {
  auditLogQuerySchema,
} from '../validators/audit-log.validator.js';
import {
  adminUsersQuerySchema,
  updateUserStatusSchema,
  adminAssetActionSchema,
  adminBookingsQuerySchema,
} from '../validators/admin.validator.js';

const router = Router();

// Strict RBAC: All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

/**
 * GET /api/v1/admin/dashboard - Platform-wide aggregates
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * GET /api/v1/admin/users - List users with filters
 */
router.get('/users', validateRequest({ query: adminUsersQuerySchema }), adminController.getUsers);

/**
 * PATCH /api/v1/admin/users/:id/status - Update user status
 */
router.patch(
  '/users/:id/status',
  validateRequest({ params: uuidParamSchema, body: updateUserStatusSchema }),
  adminController.updateUserStatus
);

/**
 * GET /api/v1/admin/assets/pending - List pending assets awaiting approval
 */
router.get(
  '/assets/pending',
  validateRequest({ query: paginationQuerySchema }),
  adminController.getPendingAssets
);

/**
 * PATCH /api/v1/admin/assets/:id/approve - Approve pending asset
 */
router.patch(
  '/assets/:id/approve',
  validateRequest({ params: uuidParamSchema }),
  adminController.approveAsset
);

/**
 * PATCH /api/v1/admin/assets/:id/reject - Reject pending asset
 */
router.patch(
  '/assets/:id/reject',
  validateRequest({ params: uuidParamSchema, body: adminAssetActionSchema }),
  adminController.rejectAsset
);

/**
 * GET /api/v1/admin/bookings - Global platform bookings audit
 */
router.get(
  '/bookings',
  validateRequest({ query: adminBookingsQuerySchema }),
  adminController.getAllBookings
);

/**
 * GET /api/v1/admin/audit-logs - Administrative audit trail
 */
router.get(
  '/audit-logs',
  validateRequest({ query: auditLogQuerySchema }),
  auditLogController.getAuditLogs
);

export { router as adminRoutes };
