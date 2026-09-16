import { Request, Response } from 'express';
import { categoryService, CategoryService } from '../services/category.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { CategoryQuery, CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator.js';

export class CategoryController {
  constructor(private readonly service: CategoryService = categoryService) {}

  /**
   * GET /api/v1/categories
   * Retrieve all categories with active equipment counts.
   */
  getCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as CategoryQuery;
    const categories = await this.service.getAllCategories(query);
    sendSuccess(res, categories);
  });

  /**
   * GET /api/v1/categories/:idOrSlug
   * Retrieve category details by UUID or slug.
   */
  getCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const idOrSlug = req.params.idOrSlug as string;
    const category = await this.service.getCategoryByIdOrSlug(idOrSlug);
    sendSuccess(res, category);
  });

  /**
   * POST /api/v1/categories
   * Create a new category (Admin only).
   */
  createCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateCategoryInput;
    const category = await this.service.createCategory(dto);
    sendCreated(res, category);
  });

  /**
   * PUT /api/v1/categories/:id
   * Update an existing category (Admin only).
   */
  updateCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const dto = req.body as UpdateCategoryInput;
    const category = await this.service.updateCategory(id, dto);
    sendSuccess(res, category);
  });

  /**
   * DELETE /api/v1/categories/:id
   * Delete an existing category with 0 linked equipment listings (Admin only).
   */
  deleteCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await this.service.deleteCategory(id);
    sendSuccess(res, null);
  });
}

export const categoryController = new CategoryController();
