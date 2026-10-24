import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error.middleware';

export class ProductService {
  static async getProducts(
    businessId: string,
    params: { search?: string; categoryId?: string; lowStock?: string; page: number; limit: number }
  ) {
    const { search, categoryId, lowStock, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      businessId,
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (lowStock === 'true') {
      where.currentStock = { lte: prisma.product.fields.minStockThreshold as any };
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: { category: true, supplier: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getProductById(businessId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, businessId },
      include: {
        category: true,
        supplier: true,
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expirationDate: 'asc' },
        },
        inventoryMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    return product;
  }

  static async createProduct(businessId: string, data: any) {
    const existingSku = await prisma.product.findUnique({
      where: { businessId_sku: { businessId, sku: data.sku } },
    });

    if (existingSku) {
      throw new AppError(400, 'A product with this SKU already exists');
    }

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          businessId,
          name: data.name,
          sku: data.sku,
          barcode: data.barcode,
          description: data.description,
          categoryId: data.categoryId,
          supplierId: data.supplierId,
          purchasePrice: new Prisma.Decimal(data.purchasePrice),
          sellingPrice: new Prisma.Decimal(data.sellingPrice),
          currentStock: data.initialStock || 0,
          minStockThreshold: data.minStockThreshold,
        },
      });

      if (data.initialStock && data.initialStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            businessId,
            productId: product.id,
            type: 'RECEIVING',
            quantity: data.initialStock,
            reason: 'Initial stock entry',
          },
        });
      }

      return product;
    });
  }

  static async updateProduct(businessId: string, id: string, data: any) {
    await this.getProductById(businessId, id);

    return prisma.product.update({
      where: { id },
      data: {
        ...data,
        purchasePrice: data.purchasePrice ? new Prisma.Decimal(data.purchasePrice) : undefined,
        sellingPrice: data.sellingPrice ? new Prisma.Decimal(data.sellingPrice) : undefined,
      },
    });
  }
}