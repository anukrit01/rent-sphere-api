import { AssetStatus, AssetCondition, Prisma, UserRole } from '@prisma/client';
import { assetRepository, AssetRepository, AssetWithRelations } from '../repositories/asset.repository.js';
import { categoryRepository, CategoryRepository } from '../repositories/category.repository.js';
import { CreateAssetInput, UpdateAssetInput, AssetQuery } from '../validators/asset.validator.js';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../errors/app.error.js';
import { PaginatedResult } from '../repositories/base.repository.js';
import { AuthUser } from '../middleware/auth.middleware.js';

export interface FormattedAsset {
  id: string;
  title: string;
  name: string;
  tagline: string | null;
  description: string;
  category: string;
  categorySlug: string;
  categoryId: string;
  coverImage: string | null;
  images: Array<{
    id: string;
    url: string;
    publicId: string;
    sortOrder: number;
    isCover: boolean;
  }>;
  pricePerDay: number;
  pricePerWeek: number | null;
  securityDeposit: number;
  location: string;
  city: string;
  state: string;
  pinCode: string | null;
  rating: number;
  reviewCount: number;
  available: boolean;
  status: AssetStatus;
  condition: string;
  featured: boolean;
  popular: boolean;
  operatorProvided: boolean;
  deliveryAvailable: boolean;
  deliveryFee: number | null;
  minimumRentalDays: number;
  features: string[];
  rentalTerms: string[];
  specifications: {
    brand: string;
    model: string;
    year: number;
    operatingWeight: string | null;
    enginePower: string | null;
    fuelType: string | null;
    operatingHours: number | null;
    capacity: string | null;
    maxReach: string | null;
    boomLength: string | null;
  } | null;
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
    memberSince: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service encapsulating business logic for heavy machinery equipment assets.
 */
export class AssetService {
  constructor(
    private readonly repository: AssetRepository = assetRepository,
    private readonly catRepo: CategoryRepository = categoryRepository
  ) {}

  /**
   * Normalizes human-readable condition labels or raw strings to Prisma AssetCondition enum.
   */
  private normalizeCondition(condStr?: string): AssetCondition | undefined {
    if (!condStr || condStr === 'All') return undefined;

    const upper = condStr.toUpperCase();
    if (upper.includes('EXCELLENT')) return AssetCondition.EXCELLENT;
    if (upper.includes('GOOD') || upper.includes('SERVICED')) return AssetCondition.GOOD;
    if (upper.includes('REBUILT')) return AssetCondition.REBUILT;
    if (upper.includes('WORKING')) return AssetCondition.WORKING;

    if (Object.values(AssetCondition).includes(condStr as AssetCondition)) {
      return condStr as AssetCondition;
    }

    return undefined;
  }

  /**
   * Format asset entity with related records into the standard RentSphere response contract.
   */
  public formatAsset(asset: AssetWithRelations): FormattedAsset {
    const sortedImages = [...(asset.images || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const coverImageObj = sortedImages.find((img) => img.isCover);
    const coverImage = coverImageObj?.url ?? sortedImages[0]?.url ?? null;

    return {
      id: asset.id,
      title: asset.title,
      name: asset.title, // alias for frontend compatibility
      tagline: asset.tagline,
      description: asset.description,
      category: asset.category.name,
      categorySlug: asset.category.slug,
      categoryId: asset.categoryId,
      coverImage,
      images: sortedImages.map((img) => ({
        id: img.id,
        url: img.url,
        publicId: img.publicId,
        sortOrder: img.sortOrder,
        isCover: img.isCover,
      })),
      pricePerDay: asset.pricePerDay,
      pricePerWeek: asset.pricePerWeek,
      securityDeposit: asset.securityDeposit,
      location: asset.location,
      city: asset.city,
      state: asset.state,
      pinCode: asset.pinCode,
      rating: asset.rating,
      reviewCount: asset.reviewCount,
      available: asset.status === AssetStatus.AVAILABLE,
      status: asset.status,
      condition: asset.condition,
      featured: asset.featured,
      popular: asset.popular,
      operatorProvided: asset.operatorProvided,
      deliveryAvailable: asset.deliveryAvailable,
      deliveryFee: asset.deliveryFee,
      minimumRentalDays: asset.minimumRentalDays,
      features: asset.features,
      rentalTerms: asset.rentalTerms,
      specifications: asset.specification
        ? {
            brand: asset.specification.brand,
            model: asset.specification.model,
            year: asset.specification.year,
            operatingWeight: asset.specification.operatingWeight,
            enginePower: asset.specification.enginePower,
            fuelType: asset.specification.fuelType,
            operatingHours: asset.specification.operatingHours,
            capacity: asset.specification.capacity,
            maxReach: asset.specification.maxReach,
            boomLength: asset.specification.boomLength,
          }
        : null,
      owner: {
        id: asset.owner.id,
        name: asset.owner.name,
        companyName: asset.owner.companyName,
        email: asset.owner.email,
        phone: asset.owner.phone,
        avatar: asset.owner.avatar,
        verified: asset.owner.verified,
        rating: asset.owner.rating,
        location: asset.owner.location,
        memberSince: asset.owner.createdAt.toISOString().slice(0, 10),
      },
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  /**
   * Public marketplace query: Executes native PostgreSQL search, multi-faceted filtering, and pagination.
   */
  async getPublicAssets(query: AssetQuery): Promise<PaginatedResult<FormattedAsset>> {
    const where: Prisma.AssetWhereInput = {};

    // 1. Mandatory visibility constraint: only AVAILABLE or APPROVED assets in public marketplace
    if (query.availableOnly === true) {
      where.status = AssetStatus.AVAILABLE;
    } else if (query.status) {
      where.status = query.status;
    } else {
      where.status = { in: [AssetStatus.AVAILABLE, AssetStatus.APPROVED] };
    }

    // 2. Full-Text Search across 8 dimensions (Section 24)
    if (query.q && query.q.trim()) {
      const searchTerm = query.q.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { tagline: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { city: { contains: searchTerm, mode: 'insensitive' } },
            { state: { contains: searchTerm, mode: 'insensitive' } },
            { location: { contains: searchTerm, mode: 'insensitive' } },
            {
              specification: {
                is: {
                  OR: [
                    { brand: { contains: searchTerm, mode: 'insensitive' } },
                    { model: { contains: searchTerm, mode: 'insensitive' } },
                  ],
                },
              },
            },
            {
              category: {
                is: {
                  OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { slug: { contains: searchTerm, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        },
      ];
    }

    // 3. Category Filter: supports UUID, slug, or name
    const categoryParam = (query.category || query.categoryId)?.trim();
    if (categoryParam && categoryParam !== 'All') {
      const category =
        (await this.catRepo.findById(categoryParam)) ||
        (await this.catRepo.findBySlug(categoryParam)) ||
        (await this.catRepo.findByName(categoryParam));

      if (category) {
        where.categoryId = category.id;
      } else {
        where.categoryId = categoryParam;
      }
    }

    // 4. Location Filter (City / State / General Hub)
    if (query.city && query.city.trim() && query.city !== 'All Locations') {
      where.city = { contains: query.city.trim(), mode: 'insensitive' };
    }

    if (query.state && query.state.trim()) {
      where.state = { contains: query.state.trim(), mode: 'insensitive' };
    }

    if (query.location && query.location.trim() && query.location !== 'All Locations' && !query.city) {
      const loc = query.location.trim();
      where.OR = [
        { city: { contains: loc, mode: 'insensitive' } },
        { state: { contains: loc, mode: 'insensitive' } },
        { location: { contains: loc, mode: 'insensitive' } },
      ];
    }

    // 5. Price Range Filter (minPrice / maxPrice)
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.pricePerDay = {};
      if (query.minPrice !== undefined) {
        where.pricePerDay.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.pricePerDay.lte = query.maxPrice;
      }
    }

    // 6. Rating Filter (minRating)
    if (query.minRating !== undefined && query.minRating > 0) {
      where.rating = { gte: query.minRating };
    }

    // 7. Equipment Condition Filter
    const normalizedCond = this.normalizeCondition(query.condition);
    if (normalizedCond) {
      where.condition = normalizedCond;
    }

    // 8. Technical Specification Filters (Fuel Type)
    if (query.fuelType) {
      where.specification = {
        is: {
          fuelType: query.fuelType,
        },
      };
    }

    // 9. Equipment Feature Flags
    const operatorReq = query.operatorProvided ?? query.operatorRequired;
    if (operatorReq !== undefined) {
      where.operatorProvided = operatorReq;
    }

    if (query.deliveryAvailable !== undefined) {
      where.deliveryAvailable = query.deliveryAvailable;
    }

    if (query.featured !== undefined) {
      where.featured = query.featured;
    }

    // 10. Dynamic Sort Order Compilation
    let orderBy: Prisma.AssetOrderByWithRelationInput | Prisma.AssetOrderByWithRelationInput[];
    const sortBy = query.sortBy || 'createdAt';

    if (sortBy === 'recommended') {
      orderBy = [{ featured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }];
    } else if (sortBy === 'price_asc' || (sortBy === 'pricePerDay' && query.sortOrder === 'asc')) {
      orderBy = { pricePerDay: 'asc' };
    } else if (sortBy === 'price_desc' || (sortBy === 'pricePerDay' && query.sortOrder === 'desc')) {
      orderBy = { pricePerDay: 'desc' };
    } else if (sortBy === 'rating') {
      orderBy = { rating: query.sortOrder || 'desc' };
    } else if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sortBy === 'title') {
      orderBy = { title: query.sortOrder || 'asc' };
    } else if (sortBy === 'pricePerDay') {
      orderBy = { pricePerDay: query.sortOrder || 'asc' };
    } else {
      orderBy = { createdAt: query.sortOrder || 'desc' };
    }

    const paginated = await this.repository.findMany({
      page: query.page,
      limit: query.limit,
      where,
      orderBy,
    });

    return {
      ...paginated,
      data: paginated.data.map((a) => this.formatAsset(a)),
    };
  }

  /**
   * Leaser Portal query: returns all assets owned by the leaser across all lifecycle statuses.
   */
  async getMyAssets(ownerId: string, query: AssetQuery): Promise<PaginatedResult<FormattedAsset>> {
    const where: Prisma.AssetWhereInput = {
      ownerId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const orderBy: Prisma.AssetOrderByWithRelationInput = {
      createdAt: query.sortOrder || 'desc',
    };

    const paginated = await this.repository.findMany({
      page: query.page,
      limit: query.limit,
      where,
      orderBy,
    });

    return {
      ...paginated,
      data: paginated.data.map((a) => this.formatAsset(a)),
    };
  }

  /**
   * Retrieve asset by ID with privacy guard for non-public listings.
   */
  async getAssetById(id: string, currentUser?: AuthUser): Promise<FormattedAsset> {
    const asset = await this.repository.findById(id);
    if (!asset) {
      throw new NotFoundError(`Equipment listing with ID '${id}' not found`);
    }

    // Public visibility check: unapproved assets can only be viewed by the owner or an Admin
    const isPublicStatus = asset.status === AssetStatus.AVAILABLE || asset.status === AssetStatus.APPROVED;
    if (!isPublicStatus) {
      const isOwner = currentUser && currentUser.id === asset.ownerId;
      const isAdmin = currentUser && currentUser.role === UserRole.ADMIN;
      if (!isOwner && !isAdmin) {
        throw new NotFoundError(`Equipment listing with ID '${id}' not found`);
      }
    }

    return this.formatAsset(asset);
  }

  /**
   * Create a new machinery listing (Leaser only).
   */
  async createAsset(ownerId: string, dto: CreateAssetInput): Promise<FormattedAsset> {
    const category =
      (await this.catRepo.findById(dto.categoryId)) ||
      (await this.catRepo.findBySlug(dto.categoryId));

    if (!category) {
      throw new BadRequestError(`Category '${dto.categoryId}' does not exist`);
    }

    const normalizedImages = (dto.images || []).map((img, idx) => {
      if (typeof img === 'string') {
        return { url: img, sortOrder: idx };
      }
      return { url: img.url, publicId: img.publicId, sortOrder: img.sortOrder ?? idx };
    });

    const created = await this.repository.create({
      title: dto.title,
      tagline: dto.tagline,
      description: dto.description,
      ownerId,
      categoryId: category.id,
      condition: dto.condition,
      pricePerDay: dto.pricePerDay,
      pricePerWeek: dto.pricePerWeek,
      securityDeposit: dto.securityDeposit,
      location: dto.location,
      city: dto.city,
      state: dto.state,
      pinCode: dto.pinCode,
      operatorProvided: dto.operatorProvided,
      deliveryAvailable: dto.deliveryAvailable,
      deliveryFee: dto.deliveryFee,
      minimumRentalDays: dto.minimumRentalDays,
      features: dto.features,
      rentalTerms: dto.rentalTerms,
      status: dto.status || AssetStatus.PENDING_REVIEW,
      specification: {
        brand: dto.specification.brand,
        model: dto.specification.model,
        year: dto.specification.year,
        operatingWeight: dto.specification.operatingWeight,
        enginePower: dto.specification.enginePower,
        fuelType: dto.specification.fuelType,
        operatingHours: dto.specification.operatingHours,
        capacity: dto.specification.capacity,
        maxReach: dto.specification.maxReach,
        boomLength: dto.specification.boomLength,
      },
      images: normalizedImages,
    });

    return this.formatAsset(created);
  }

  /**
   * Update an existing asset (Owner or Admin).
   */
  async updateAsset(
    id: string,
    userId: string,
    userRole: UserRole,
    dto: UpdateAssetInput
  ): Promise<FormattedAsset> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Equipment listing with ID '${id}' not found`);
    }

    if (userRole !== UserRole.ADMIN && existing.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to modify this equipment listing');
    }

    let categoryId = dto.categoryId;
    if (categoryId) {
      const category =
        (await this.catRepo.findById(categoryId)) ||
        (await this.catRepo.findBySlug(categoryId));
      if (!category) {
        throw new BadRequestError(`Category '${categoryId}' does not exist`);
      }
      categoryId = category.id;
    }

    let normalizedImages: Array<{ url: string; publicId?: string; sortOrder?: number }> | undefined;
    if (dto.images !== undefined) {
      normalizedImages = dto.images.map((img, idx) => {
        if (typeof img === 'string') {
          return { url: img, sortOrder: idx };
        }
        return { url: img.url, publicId: img.publicId, sortOrder: img.sortOrder ?? idx };
      });
    }

    const updated = await this.repository.update(id, {
      title: dto.title,
      tagline: dto.tagline,
      description: dto.description,
      categoryId,
      condition: dto.condition,
      pricePerDay: dto.pricePerDay,
      pricePerWeek: dto.pricePerWeek,
      securityDeposit: dto.securityDeposit,
      location: dto.location,
      city: dto.city,
      state: dto.state,
      pinCode: dto.pinCode,
      operatorProvided: dto.operatorProvided,
      deliveryAvailable: dto.deliveryAvailable,
      deliveryFee: dto.deliveryFee,
      minimumRentalDays: dto.minimumRentalDays,
      features: dto.features,
      rentalTerms: dto.rentalTerms,
      status: dto.status,
      specification: dto.specification,
      images: normalizedImages,
    });

    return this.formatAsset(updated);
  }

  /**
   * Delete an equipment listing (Owner or Admin).
   */
  async deleteAsset(id: string, userId: string, userRole: UserRole): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Equipment listing with ID '${id}' not found`);
    }

    if (userRole !== UserRole.ADMIN && existing.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this equipment listing');
    }

    const activeBookingsCount = await this.repository.countActiveBookings(id);
    if (activeBookingsCount > 0) {
      throw new ConflictError(
        `Cannot delete equipment listing '${existing.title}' because ${activeBookingsCount} active or pending booking(s) exist. Please fulfill or cancel the reservations first.`
      );
    }

    await this.repository.delete(id);
  }
}

export const assetService = new AssetService();
