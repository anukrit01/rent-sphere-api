import multer from 'multer';
import { Request, RequestHandler } from 'express';
import { BadRequestError } from '../errors/app.error.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestError(
        `Invalid file format '${file.mimetype}'. Only JPEG, PNG, and WebP images are permitted.`
      )
    );
  }
};

const multerInstance = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter,
});

/**
 * Middleware for handling single image file uploads.
 */
export const uploadSingleImage: RequestHandler = (req, res, next) => {
  multerInstance.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new BadRequestError('Uploaded image exceeds the 5MB size limit'));
      }
      return next(new BadRequestError(`File upload error: ${err.message}`));
    }
    if (err) {
      return next(err);
    }
    next();
  });
};

/**
 * Middleware for handling multiple image files uploads (up to 10 files).
 */
export const uploadAssetImages: RequestHandler = (req, res, next) => {
  multerInstance.array('images', 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new BadRequestError('One or more uploaded images exceed the 5MB size limit'));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        return next(new BadRequestError('Maximum 10 images can be uploaded in a single batch'));
      }
      return next(new BadRequestError(`File upload error: ${err.message}`));
    }
    if (err) {
      return next(err);
    }
    next();
  });
};
