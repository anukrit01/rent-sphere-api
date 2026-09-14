import { z } from 'zod';

export const reorderImagesSchema = z.object({
  images: z
    .array(
      z.object({
        id: z.string().uuid({ message: 'Image ID must be a valid UUID' }),
        sortOrder: z.number().int().min(0, 'sortOrder must be non-negative'),
      })
    )
    .min(1, 'At least one image ordering specification is required'),
});

export const assetImageParamsSchema = z.object({
  id: z.string().uuid({ message: 'Asset ID must be a valid UUID' }),
  imageId: z.string().uuid({ message: 'Image ID must be a valid UUID' }),
});

export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>;
export type AssetImageParams = z.infer<typeof assetImageParamsSchema>;
