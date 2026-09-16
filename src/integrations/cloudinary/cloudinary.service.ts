import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from './cloudinary.provider.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { InternalServerError } from '../../errors/app.error.js';

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

export class CloudinaryService {
  /**
   * Uploads an in-memory file buffer directly to Cloudinary using streaming.
   */
  async uploadStream(buffer: Buffer, folder = 'rentsphere/assets'): Promise<CloudinaryUploadResult> {
    // Development fallback when demo/placeholder credentials are used
    if (
      env.CLOUDINARY_CLOUD_NAME === 'demo' ||
      env.CLOUDINARY_API_KEY.includes('0000') ||
      env.NODE_ENV === 'test'
    ) {
      const mockId = `${folder}/dev-${crypto.randomUUID()}`;
      return {
        url: `http://res.cloudinary.com/rentsphere/image/upload/${mockId}.jpg`,
        secureUrl: `https://res.cloudinary.com/rentsphere/image/upload/${mockId}.jpg`,
        publicId: mockId,
        format: 'jpg',
        bytes: buffer.length,
        width: 1200,
        height: 800,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1920, height: 1080, crop: 'limit' },
          ],
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            logger.error({ err: error }, 'Cloudinary upload stream failed');
            return reject(new InternalServerError('Failed to upload image to media storage'));
          }

          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          });
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  /**
   * Deletes a remote asset from Cloudinary storage.
   */
  async deleteMedia(publicId: string): Promise<boolean> {
    if (
      env.CLOUDINARY_CLOUD_NAME === 'demo' ||
      env.CLOUDINARY_API_KEY.includes('0000') ||
      publicId.includes('dev-') ||
      env.NODE_ENV === 'test'
    ) {
      return true;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
      return result.result === 'ok';
    } catch (err) {
      logger.warn({ err, publicId }, 'Cloudinary destroy operation warning');
      return false;
    }
  }
}

export const cloudinaryService = new CloudinaryService();
