import { CategoryRepository, categoryRepository, CategoryWithCount } from '../repositories/category.repository.js';
import { CreateCategoryInput, UpdateCategoryInput, CategoryQuery } from '../validators/category.validator.js';
import { NotFoundError, DuplicateResourceError, ConflictError } from '../errors/app.error.js';

export interface FormattedCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  image: string | null;
  featured: boolean;
  assetCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Service encapsulating business logic for equipment taxonomy and categories.
 */
export class CategoryService {
  constructor(private readonly repository: CategoryRepository = categoryRepository) {}

  /**
   * Generate a clean, URL-safe slug from a category name.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  /**
   * Map database record with _count to client-ready Category contract with assetCount.
   */
  private formatCategory(category: CategoryWithCount): FormattedCategory {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      description: category.description,
      image: category.image,
      featured: category.featured,
      assetCount: category._count?.assets ?? 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Retrieve all categories matching filters, with assetCount and custom sorting.
   */
  async getAllCategories(query: CategoryQuery): Promise<FormattedCategory[]> {
    const rawCategories = await this.repository.findAll({
      featured: query.featured,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    const formatted = rawCategories.map((cat) => this.formatCategory(cat));

    // Handle in-memory sorting when ordering by computed assetCount
    if (query.sortBy === 'assetCount') {
      const orderMultiplier = query.sortOrder === 'desc' ? -1 : 1;
      formatted.sort((a, b) => (a.assetCount - b.assetCount) * orderMultiplier);
    }

    return formatted;
  }

  /**
   * Retrieve a single category by UUID or URL-safe slug.
   */
  async getCategoryByIdOrSlug(idOrSlug: string): Promise<FormattedCategory> {
    const isUuid = UUID_REGEX.test(idOrSlug);
    let category: CategoryWithCount | null = null;

    if (isUuid) {
      category = await this.repository.findById(idOrSlug);
    }

    // Fallback or primary lookup by slug
    if (!category) {
      category = await this.repository.findBySlug(idOrSlug);
    }

    if (!category) {
      throw new NotFoundError(`Category with identifier '${idOrSlug}' not found`);
    }

    return this.formatCategory(category);
  }

  /**
   * Create a new equipment category (Admin only).
   */
  async createCategory(dto: CreateCategoryInput): Promise<FormattedCategory> {
    const slug = dto.slug?.trim() || this.generateSlug(dto.name);

    // Check for existing name collision
    const existingByName = await this.repository.findByName(dto.name);
    if (existingByName) {
      throw new DuplicateResourceError(`Category with name '${dto.name}' already exists`);
    }

    // Check for existing slug collision
    const existingBySlug = await this.repository.findBySlug(slug);
    if (existingBySlug) {
      throw new DuplicateResourceError(`Category with slug '${slug}' already exists`);
    }

    const created = await this.repository.create({
      name: dto.name,
      slug,
      icon: dto.icon,
      description: dto.description,
      image: dto.image ?? null,
      featured: dto.featured ?? false,
    });

    return this.formatCategory(created);
  }

  /**
   * Update an existing category (Admin only).
   */
  async updateCategory(id: string, dto: UpdateCategoryInput): Promise<FormattedCategory> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Category with ID '${id}' not found`);
    }

    // Check name uniqueness if updated
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const nameConflict = await this.repository.findByName(dto.name);
      if (nameConflict && nameConflict.id !== id) {
        throw new DuplicateResourceError(`Category with name '${dto.name}' already exists`);
      }
    }

    // Check slug uniqueness if updated
    if (dto.slug && dto.slug.toLowerCase() !== existing.slug.toLowerCase()) {
      const slugConflict = await this.repository.findBySlug(dto.slug);
      if (slugConflict && slugConflict.id !== id) {
        throw new DuplicateResourceError(`Category with slug '${dto.slug}' already exists`);
      }
    }

    const updated = await this.repository.update(id, {
      name: dto.name,
      slug: dto.slug,
      icon: dto.icon,
      description: dto.description,
      image: dto.image !== undefined ? dto.image : undefined,
      featured: dto.featured,
    });

    return this.formatCategory(updated);
  }

  /**
   * Delete category with strict referential integrity check (Admin only).
   */
  async deleteCategory(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Category with ID '${id}' not found`);
    }

    const linkedAssetsCount = await this.repository.countAssets(id);
    if (linkedAssetsCount > 0) {
      throw new ConflictError(
        `Cannot delete category '${existing.name}' because ${linkedAssetsCount} equipment listing(s) are currently associated with it. Reassign or delete the listings first.`
      );
    }

    await this.repository.delete(id);
  }
}

export const categoryService = new CategoryService();
