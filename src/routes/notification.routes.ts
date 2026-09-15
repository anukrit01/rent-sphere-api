import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { notificationQuerySchema } from '../validators/notification.validator.js';
import { uuidParamSchema } from '../validators/common.validator.js';

const router = Router();

// All notification endpoints require authentication
router.use(authenticate);

/**
 * GET /api/v1/notifications - List caller's notifications
 */
router.get('/', validateRequest({ query: notificationQuerySchema }), notificationController.getUserNotifications);

/**
 * PATCH /api/v1/notifications/read-all - Mark all caller's notifications as read
 * NOTE: Must be registered before /:id/read to prevent treating 'read-all' as an :id parameter
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * PATCH /api/v1/notifications/:id/read - Mark single notification as read
 */
router.patch('/:id/read', validateRequest({ params: uuidParamSchema }), notificationController.markAsRead);

export { router as notificationRoutes };
