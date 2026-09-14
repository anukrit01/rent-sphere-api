import { Prisma, Category } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export interface CategoryWithCount extends Category {
  _count: {
    assets: number;
  };
}

export interface CategoryFindAllOptions {
  featured?: boolean;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'assetCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Repository handling database operations for Categories.
 */
export class CategoryRepository extends BaseRepository {
  /**
   * Find all categories matching optional query filters with aggregated asset count.
   */
  async findAll(options: CategoryFindAllOptions = {}): Promise<CategoryWithCount[]> {
    const where: Prisma.CategoryWhereInput = {};

    if (options.featured !== undefined) {
      where.featured = options.featured;
    }

    if (options.search && options.search.trim()) {
      const search = options.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CategoryOrderByWithRelationInput[] = [];
    if (options.sortBy === 'createdAt') {
      orderBy.push({ createdAt: options.sortOrder || 'desc' });
    } else if (options.sortBy === 'name') {
      orderBy.push({ name: options.sortOrder || 'asc' });
    } else {
      // Default stable ordering by name
      orderBy.push({ name: 'asc' });
    }

    return this.db.category.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });
  }

  /**
   * Find category by primary key UUID.
   */
  async findById(id: string): Promise<CategoryWithCount | null> {
    return this.db.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });
  }

  /**
   * Find category by unique URL-friendly slug.
   */
  async findBySlug(slug: string): Promise<CategoryWithCount | null> {
    return this.db.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });
  }

  /**
   * Find category by exact name (case-insensitive).
   */
  async findByName(name: string): Promise<CategoryWithCount | null> {
    return this.db.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });
  }

  /**
   * Create a new category record.
   */
  async create(data: Prisma.CategoryCreateInput): Promise<CategoryWithCount> {
    return this.db.category.create({
      data,
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });
  }

  /**
   * Update an existing category by ID.
   */
  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<CategoryWithCount> {
    return this.db.category.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });
  }

  /**
   * Delete category by ID.
   */
  async delete(id: string): Promise<Category> {
    return this.db.category.delete({
      where: { id },
    });
  }

  /**
   * Count assets associated with a category.
   */
  async countAssets(categoryId: string): Promise<number> {
    return this.db.asset.count({
      where: { categoryId },
    });
  }
}

export const categoryRepository = new CategoryRepository();
