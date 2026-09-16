import { assetService } from '../../src/services/asset.service.js';
import { AssetStatus } from '@prisma/client';

describe('AssetService (Unit)', () => {
  describe('formatAsset', () => {
    it('should normalize specifications and transform images array correctly', () => {
      const rawAsset: any = {
        id: 'mock-asset-id',
        title: 'Excavator Cat 320',
        tagline: 'High power crawler excavator',
        description: 'Heavy machinery',
        pricePerDay: 15000,
        pricePerWeek: 90000,
        securityDeposit: 50000,
        status: AssetStatus.AVAILABLE,
        location: 'Bandra West, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400050',
        specification: {
          brand: 'Caterpillar',
          model: '320D',
          year: 2022,
          operatingWeight: '20 tons',
          enginePower: '150 HP',
        },
        ownerId: 'mock-owner-id',
        categoryId: 'mock-category-id',
        rating: 4.8,
        reviewCount: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [
          { id: 'img-1', url: 'https://img.url/1.jpg', publicId: 'p1', isCover: true, sortOrder: 0 },
          { id: 'img-2', url: 'https://img.url/2.jpg', publicId: 'p2', isCover: false, sortOrder: 1 },
        ],
        owner: {
          id: 'mock-owner-id',
          name: 'Owner Name',
          email: 'owner@example.com',
          avatar: null,
          phone: '9999999999',
          companyName: 'Owner Corp',
          rating: 4.9,
          verified: true,
          location: 'Mumbai',
          createdAt: new Date(),
        },
        category: {
          id: 'mock-category-id',
          name: 'Excavators',
          slug: 'excavators',
        },
      };

      const formatted = assetService.formatAsset(rawAsset);

      expect(formatted.id).toBe('mock-asset-id');
      expect(formatted.title).toBe('Excavator Cat 320');
      expect(formatted.pricePerDay).toBe(15000);
      expect(formatted.images).toHaveLength(2);
      expect(formatted.images[0].isCover).toBe(true);
      expect(formatted.coverImage).toBe('https://img.url/1.jpg');
      expect(formatted.specifications?.brand).toBe('Caterpillar');
      expect(formatted.specifications?.model).toBe('320D');
      expect(formatted.specifications?.year).toBe(2022);
      expect(formatted.category).toBe('Excavators');
      expect(formatted.available).toBe(true);
      expect(formatted.status).toBe(AssetStatus.AVAILABLE);
    });
  });
});
