import { AnalyticsService } from '../analytics/analytics.service';
import { ProductService } from '../products/product.service';
import { prisma } from '../../lib/prisma';

export const AI_TOOLS_DECLARATIONS = [
  {
    name: 'getInventorySummary',
    description: 'Get total products count, cost value, retail value, low stock count, and out of stock count for the business.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getLowStockProducts',
    description: 'Get list of products that are below or equal to their minimum stock threshold.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getSalesAnalytics',
    description: 'Get revenue, order count for the last 7 and 30 days, plus top 5 best-selling products.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getStockoutRisks',
    description: 'Get products categorized by stockout risk level (CRITICAL, HIGH, MODERATE, HEALTHY) based on 30-day sales velocity.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getExpiringBatches',
    description: 'Get inventory stock batches expiring within the next 30 days.',
    parameters: {
      type: 'OBJECT',
      properties: {
        withinDays: { type: 'NUMBER', description: 'Days ahead to check for expiration. Default is 30.' },
      },
    },
  },
  {
    name: 'getReorderRecommendations',
    description: 'Get reorder recommendations with suggested order quantities based on supplier lead times and sales velocity.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
];

export class AiToolExecutor {
  static async executeTool(businessId: string, toolName: string, args: any) {
    switch (toolName) {
      case 'getInventorySummary':
        return AnalyticsService.getInventorySummary(businessId);

      case 'getLowStockProducts': {
        const result = await ProductService.getProducts(businessId, { lowStock: 'true', page: 1, limit: 50 });
        return result.items.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: p.currentStock,
          minStockThreshold: p.minStockThreshold,
          purchasePrice: Number(p.purchasePrice),
          sellingPrice: Number(p.sellingPrice),
        }));
      }

      case 'getSalesAnalytics':
        return AnalyticsService.getSalesAnalytics(businessId);

      case 'getStockoutRisks':
        return AnalyticsService.getStockoutRisks(businessId);

      case 'getExpiringBatches': {
        const days = args?.withinDays || 30;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);

        const batches = await prisma.stockBatch.findMany({
          where: {
            product: { businessId },
            quantity: { gt: 0 },
            expirationDate: {
              gte: new Date(),
              lte: targetDate,
            },
          },
          include: { product: { select: { name: true, sku: true } } },
          orderBy: { expirationDate: 'asc' },
        });

        return batches.map((b) => ({
          batchId: b.id,
          productName: b.product.name,
          sku: b.product.sku,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          expirationDate: b.expirationDate?.toISOString(),
        }));
      }

      case 'getReorderRecommendations':
        return AnalyticsService.getReorderRecommendations(businessId);

      default:
        throw new Error(`Unauthorized tool call execution attempt: ${toolName}`);
    }
  }
}