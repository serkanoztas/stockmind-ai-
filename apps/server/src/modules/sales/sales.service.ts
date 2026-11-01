import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error.middleware';

export class SalesService {
  static async createSale(
    businessId: string,
    items: Array<{ productId: string; quantity: number; unitPrice?: number; batchId?: string }>
  ) {
    return prisma.$transaction(async (tx) => {
      let totalSaleAmount = new Prisma.Decimal(0);
      const preparedSaleItems: Array<{
        productId: string;
        batchId?: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        totalPrice: Prisma.Decimal;
      }> = [];

      for (const item of items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, businessId, isActive: true },
        });

        if (!product) {
          throw new AppError(404, `Product not found or inactive (ID: ${item.productId})`);
        }

        if (product.currentStock < item.quantity) {
          throw new AppError(
            400,
            `Insufficient stock for '${product.name}'. Requested: ${item.quantity}, Available: ${product.currentStock}`
          );
        }

        const unitPrice = item.unitPrice ? new Prisma.Decimal(item.unitPrice) : product.sellingPrice;
        const lineTotal = unitPrice.mul(item.quantity);
        totalSaleAmount = totalSaleAmount.add(lineTotal);

        preparedSaleItems.push({
          productId: product.id,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice,
          totalPrice: lineTotal,
        });

        // Current Stock düşürülmesi
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: product.currentStock - item.quantity },
        });

        // Audit Trail için stok hareketi eklenmesi
        await tx.inventoryMovement.create({
          data: {
            businessId,
            productId: product.id,
            batchId: item.batchId,
            type: 'DEDUCTION',
            quantity: item.quantity,
            reason: 'Direct POS/Mobile Sale',
          },
        });

        // Stok partisi seçildiyse parti stok miktarının düşürülmesi
        if (item.batchId) {
          const batch = await tx.stockBatch.findUnique({
            where: { id: item.batchId },
          });

          if (batch) {
            const updatedBatchQty = Math.max(0, batch.quantity - item.quantity);
            await tx.stockBatch.update({
              where: { id: item.batchId },
              data: { quantity: updatedBatchQty },
            });
          }
        }
      }

      // Satış kaydının oluşturulması
      const sale = await tx.sale.create({
        data: {
          businessId,
          totalAmount: totalSaleAmount,
          items: {
            createMany: {
              data: preparedSaleItems,
            },
          },
        },
        include: {
          items: {
            include: { product: { select: { name: true, sku: true } } },
          },
        },
      });

      return sale;
    });
  }

  static async getSalesHistory(
    businessId: string,
    params: { startDate?: string; endDate?: string; page: number; limit: number }
  ) {
    const { startDate, endDate, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {
      businessId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: { select: { name: true, sku: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sale.count({ where }),
    ]);

    return {
      sales,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}