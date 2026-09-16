import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { categoryRoutes } from './category.routes.js';
import { assetRoutes } from './asset.routes.js';
import { bookingRoutes } from './booking.routes.js';
import { userRoutes } from './user.routes.js';
import { notificationRoutes } from './notification.routes.js';
import { adminRoutes } from './admin.routes.js';

const apiRouter = Router();

// Health routes mounted inside versioned API (/api/v1/health)
apiRouter.use('/health', healthRoutes);

// Authentication routes (/api/v1/auth)
apiRouter.use('/auth', authRoutes);

// Equipment Category taxonomy routes (/api/v1/categories)
apiRouter.use('/categories', categoryRoutes);

// Equipment Asset routes (/api/v1/assets)
apiRouter.use('/assets', assetRoutes);

// Rental Booking routes (/api/v1/bookings)
apiRouter.use('/bookings', bookingRoutes);

// User-specific resource routes (/api/v1/users)
apiRouter.use('/users', userRoutes);

// Notification routes (/api/v1/notifications)
apiRouter.use('/notifications', notificationRoutes);

// Administration routes (/api/v1/admin)
apiRouter.use('/admin', adminRoutes);

export { apiRouter };
