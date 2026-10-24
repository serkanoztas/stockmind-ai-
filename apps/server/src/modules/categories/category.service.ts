import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error.middleware';

export class CategoryService {
  static async getCategories(businessId: string) {
    return prisma.category.findMany({
      where: { businessId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createCategory(businessId: string, name: string) {
    const existing = await prisma.category.findUnique({
      where: { businessId_name: { businessId, name } },
    });

    if (existing) {
      throw new AppError(400, 'A category with this name already exists');
    }

    return prisma.category.create({
      data: { businessId, name },
    });
  }
}