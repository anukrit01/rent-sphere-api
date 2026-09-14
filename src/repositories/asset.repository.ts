import { Prisma, Asset, AssetSpecification, AssetImage, BookingStatus, FuelType } from '@prisma/client';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository.js';
import crypto from 'node:crypto';

export type AssetWithRelations = Asset & {
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
  };
  specification: AssetSpecification | null;
  images: AssetImage[];
  owner: {
    id: string;
    name: string;
    companyName: string | null;
    email: string;
    phone: string | null;
    avatar: string | null;
    verified: boolean;
    rating: number;
    location: string | null;
    createdAt: Date;
  };
};

export interface AssetFindManyOptions extends PaginationOptions {
  where?: Prisma.AssetWhereInput;
  orderBy?: Prisma.AssetOrderByWithRelationInput;
}

export interface CreateAssetRepoInput {
  title: string;
  tagline?: string | null;
  description: string;
  ownerId: string;
  categoryId: string;
  condition: Prisma.AssetCreateInput['condition'];
  pricePerDay: number;
  pricePerWeek?: number | null;
  securityDeposit: number;
  location: string;
  city: string;
  state: string;
  pinCode?: string | null;
  operatorProvided?: boolean;
  deliveryAvailable?: boolean;
  deliveryFee?: number | null;
  minimumRentalDays?: number;
  features?: string[];
  rentalTerms?: string[];
  status?: Prisma.AssetCreateInput['status'];
  specification: {
    brand: string;
    model: string;
    year: number;
    operatingWeight?: string | null;
    enginePower?: string | null;
    fuelType?: Prisma.AssetSpecificationCreateWithoutAssetInput['fuelType'];
    operatingHours?: number | null;
    capacity?: string | null;
    maxReach?: string | null;
    boomLength?: string | null;
  };
  images?: Array<{
    url: string;
    publicId?: string;
    sortOrder?: number;
  }>;
}

export interface UpdateAssetRepoInput {
  title?: string;
  tagline?: string | null;
  description?: string;
  categoryId?: string;
  condition?: Prisma.AssetUpdateInput['condition'];
  pricePerDay?: number;
  pricePerWeek?: number | null;
  securityDeposit?: number;
  location?: string;
  city?: string;
  state?: string;
  pinCode?: string | null;
  operatorProvided?: boolean;
  deliveryAvailable?: boolean;
  deliveryFee?: number | null;
  minimumRentalDays?: number;
  features?: string[];
  rentalTerms?: string[];
  status?: Prisma.AssetUpdateInput['status'];
  specification?: {
    brand?: string;
    model?: string;
    year?: number;
    operatingWeight?: string | null;
    enginePower?: string | null;
    fuelType?: FuelType | null;
    operatingHours?: number | null;
    capacity?: string | null;
    maxReach?: string | null;
    boomLength?: string | null;
  };
  images?: Array<{
    url: string;
    publicId?: string;
    sortOrder?: number;
  }>;
}

const ASSET_INCLUDE_CONFIG = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
    },
  },
  specification: true,
  images: {
    orderBy: {
      sortOrder: 'asc' as const,
    },
  },
  owner: {
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      avatar: true,
      verified: true,
      rating: true,
      location: true,
      createdAt: true,
    },
  },
};

/**
 * Repository handling database operations for Equipment Assets.
 */
export class AssetRepository extends BaseRepository {
  /**
   * Find paginated assets matching query filters with relations.
   */
  async findMany(options: AssetFindManyOptions = {}): Promise<PaginatedResult<AssetWithRelations>> {
    const { page, limit, skip, take } = this.calculatePagination(options);
    const where = options.where || {};
    const orderBy = options.orderBy || { createdAt: 'desc' };

    const [total, data] = await Promise.all([
      this.db.asset.count({ where }),
      this.db.asset.findMany({
        where,
        orderBy,
        skip,
        take,
        include: ASSET_INCLUDE_CONFIG,
      }),
    ]);

    return this.formatPaginatedResult(data as AssetWithRelations[], total, page, limit);
  }

  /**
   * Find single asset by primary key UUID with full relations.
   */
  async findById(id: string): Promise<AssetWithRelations | null> {
    const asset = await this.db.asset.findUnique({
      where: { id },
      include: ASSET_INCLUDE_CONFIG,
    });

    return asset as AssetWithRelations | null;
  }

  /**
   * Create asset with nested specification and images atomically inside a transaction.
   */
  async create(input: CreateAssetRepoInput): Promise<AssetWithRelations> {
    return this.db.$transaction(async (tx) => {
      const created = await tx.asset.create({
        data: {
          title: input.title,
          tagline: input.tagline,
          description: input.description,
          ownerId: input.ownerId,
          categoryId: input.categoryId,
          condition: input.condition,
          pricePerDay: input.pricePerDay,
          pricePerWeek: input.pricePerWeek,
          securityDeposit: input.securityDeposit,
          location: input.location,
          city: input.city,
          state: input.state,
          pinCode: input.pinCode,
          operatorProvided: input.operatorProvided ?? false,
          deliveryAvailable: input.deliveryAvailable ?? false,
          deliveryFee: input.deliveryFee,
          minimumRentalDays: input.minimumRentalDays ?? 1,
          features: input.features || [],
          rentalTerms: input.rentalTerms || [],
          status: input.status,
          specification: {
            create: {
              brand: input.specification.brand,
              model: input.specification.model,
              year: input.specification.year,
              operatingWeight: input.specification.operatingWeight,
              enginePower: input.specification.enginePower,
              fuelType: input.specification.fuelType,
              operatingHours: input.specification.operatingHours,
              capacity: input.specification.capacity,
              maxReach: input.specification.maxReach,
              boomLength: input.specification.boomLength,
            },
          },
          images: input.images && input.images.length > 0
            ? {
                create: input.images.map((img, index) => ({
                  url: img.url,
                  publicId: img.publicId || `rentsphere/asset-${crypto.randomUUID()}`,
                  sortOrder: img.sortOrder ?? index,
                })),
              }
            : undefined,
        },
        include: ASSET_INCLUDE_CONFIG,
      });

      return created as AssetWithRelations;
    });
  }

  /**
   * Update existing asset and nested specification.
   */
  async update(id: string, input: UpdateAssetRepoInput): Promise<AssetWithRelations> {
    return this.db.$transaction(async (tx) => {
      // 1. Update main asset fields
      const data: Prisma.AssetUpdateInput = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.tagline !== undefined) data.tagline = input.tagline;
      if (input.description !== undefined) data.description = input.description;
      if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
      if (input.condition !== undefined) data.condition = input.condition;
      if (input.pricePerDay !== undefined) data.pricePerDay = input.pricePerDay;
      if (input.pricePerWeek !== undefined) data.pricePerWeek = input.pricePerWeek;
      if (input.securityDeposit !== undefined) data.securityDeposit = input.securityDeposit;
      if (input.location !== undefined) data.location = input.location;
      if (input.city !== undefined) data.city = input.city;
      if (input.state !== undefined) data.state = input.state;
      if (input.pinCode !== undefined) data.pinCode = input.pinCode;
      if (input.operatorProvided !== undefined) data.operatorProvided = input.operatorProvided;
      if (input.deliveryAvailable !== undefined) data.deliveryAvailable = input.deliveryAvailable;
      if (input.deliveryFee !== undefined) data.deliveryFee = input.deliveryFee;
      if (input.minimumRentalDays !== undefined) data.minimumRentalDays = input.minimumRentalDays;
      if (input.features !== undefined) data.features = input.features;
      if (input.rentalTerms !== undefined) data.rentalTerms = input.rentalTerms;
      if (input.status !== undefined) data.status = input.status;

      // 2. Update specification if provided
      if (input.specification) {
        data.specification = {
          upsert: {
            create: {
              brand: input.specification.brand || '',
              model: input.specification.model || '',
              year: input.specification.year || new Date().getFullYear(),
              operatingWeight: input.specification.operatingWeight,
              enginePower: input.specification.enginePower,
              fuelType: input.specification.fuelType,
              operatingHours: input.specification.operatingHours,
              capacity: input.specification.capacity,
              maxReach: input.specification.maxReach,
              boomLength: input.specification.boomLength,
            },
            update: {
              ...(input.specification.brand !== undefined && { brand: input.specification.brand }),
              ...(input.specification.model !== undefined && { model: input.specification.model }),
              ...(input.specification.year !== undefined && { year: input.specification.year }),
              ...(input.specification.operatingWeight !== undefined && { operatingWeight: input.specification.operatingWeight }),
              ...(input.specification.enginePower !== undefined && { enginePower: input.specification.enginePower }),
              ...(input.specification.fuelType !== undefined && { fuelType: input.specification.fuelType }),
              ...(input.specification.operatingHours !== undefined && { operatingHours: input.specification.operatingHours }),
              ...(input.specification.capacity !== undefined && { capacity: input.specification.capacity }),
              ...(input.specification.maxReach !== undefined && { maxReach: input.specification.maxReach }),
              ...(input.specification.boomLength !== undefined && { boomLength: input.specification.boomLength }),
            },
          },
        };
      }

      // 3. Update images if supplied
      if (input.images !== undefined) {
        await tx.assetImage.deleteMany({ where: { assetId: id } });
        if (input.images.length > 0) {
          data.images = {
            create: input.images.map((img, index) => ({
              url: img.url,
              publicId: img.publicId || `rentsphere/asset-${crypto.randomUUID()}`,
              sortOrder: img.sortOrder ?? index,
            })),
          };
        }
      }

      const updated = await tx.asset.update({
        where: { id },
        data,
        include: ASSET_INCLUDE_CONFIG,
      });

      return updated as AssetWithRelations;
    });
  }

  /**
   * Delete asset by ID (Prisma cascade removes specifications and images).
   */
  async delete(id: string): Promise<Asset> {
    return this.db.asset.delete({
      where: { id },
    });
  }

  /**
   * Count active or upcoming bookings for an asset to safeguard against deletion.
   */
  async countActiveBookings(assetId: string): Promise<number> {
    return this.db.booking.count({
      where: {
        assetId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.ACTIVE],
        },
      },
    });
  }
}

export const assetRepository = new AssetRepository();
