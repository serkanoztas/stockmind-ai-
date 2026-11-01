import { prisma } from '../../lib/prisma';

export class AnalyticsService {
  /**
   * Toplam envanter maliyeti, perakende değeri ve kritik durum sayıları.
   */
  static async getInventorySummary(businessId: string) {
    const products = await prisma.product.findMany({
      where: { businessId, isActive: true },
    });

    let totalCostValue = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const stock = p.currentStock;
      const costPrice = Number(p.purchasePrice);
      const sellPrice = Number(p.sellingPrice);

      totalCostValue += stock * costPrice;
      totalRetailValue += stock * sellPrice;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= p.minStockThreshold) {
        lowStockCount++;
      }
    }

    return {
      totalProducts: products.length,
      totalCostValue: Number(totalCostValue.toFixed(2)),
      totalRetailValue: Number(totalRetailValue.toFixed(2)),
      potentialProfitMargin: Number((totalRetailValue - totalCostValue).toFixed(2)),
      lowStockCount,
      outOfStockCount,
    };
  }

  /**
   * 30 günlük satış verisine dayalı stok tükenme riski motoru.
   */
  static async getStockoutRisks(businessId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await prisma.product.findMany({
      where: { businessId, isActive: true },
      include: { supplier: true, category: true },
    });

    const salesAgg = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { businessId, createdAt: { gte: thirtyDaysAgo } },
      },
      _sum: { quantity: true },
    });

    const salesMap = new Map<string, number>();
    salesAgg.forEach((s) => {
      salesMap.set(s.productId, s._sum.quantity || 0);
    });

    const riskList = products.map((product) => {
      const totalSold30Days = salesMap.get(product.id) || 0;
      const averageDailySales = Number((totalSold30Days / 30).toFixed(2));
      const currentStock = product.currentStock;

      let estimatedDaysLeft: number | null = null;
      let riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'HEALTHY' = 'HEALTHY';

      if (currentStock === 0) {
        estimatedDaysLeft = 0;
        riskLevel = 'CRITICAL';
      } else if (averageDailySales > 0) {
        estimatedDaysLeft = Number((currentStock / averageDailySales).toFixed(1));
        if (estimatedDaysLeft <= 3) riskLevel = 'CRITICAL';
        else if (estimatedDaysLeft <= 7) riskLevel = 'HIGH';
        else if (estimatedDaysLeft <= 14) riskLevel = 'MODERATE';
      } else {
        estimatedDaysLeft = null; // Yakın zamanda satış yok
        riskLevel = currentStock <= product.minStockThreshold ? 'MODERATE' : 'HEALTHY';
      }

      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category?.name || 'Uncategorized',
        currentStock,
        minStockThreshold: product.minStockThreshold,
        totalSold30Days,
        averageDailySales,
        estimatedDaysLeft,
        riskLevel,
        supplierName: product.supplier?.name || 'No Supplier Assigned',
        leadDays: product.supplier?.typicalLeadDays || 3,
      };
    });

    const priorityMap = { CRITICAL: 0, HIGH: 1, MODERATE: 2, HEALTHY: 3 };
    riskList.sort((a, b) => priorityMap[a.riskLevel] - priorityMap[b.riskLevel]);

    return riskList;
  }

  /**
   * Tedarik süresi ve emniyet stoğuna göre satın alma önerileri.
   */
  static async getReorderRecommendations(businessId: string) {
    const risks = await this.getStockoutRisks(businessId);

    const reorderItems = risks
      .filter((r) => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH' || r.riskLevel === 'MODERATE')
      .map((item) => {
        const targetBufferDays = item.leadDays + 14;
        const targetStock = Math.max(
          item.minStockThreshold,
          Math.ceil((item.averageDailySales || 1) * targetBufferDays)
        );
        const suggestedReorderQty = Math.max(0, targetStock - item.currentStock);

        return {
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          currentStock: item.currentStock,
          averageDailySales: item.averageDailySales,
          riskLevel: item.riskLevel,
          supplierName: item.supplierName,
          suggestedReorderQty,
          rationale: `Stock is at ${item.currentStock} units with ADS of ${item.averageDailySales}. Lead time is ${item.leadDays} days. Recommended target stock level is ${targetStock} units.`,
        };
      })
      .filter((item) => item.suggestedReorderQty > 0);

    return reorderItems;
  }

  /**
   * Satış performans analizi ve en çok satanlar.
   */
  static async getSalesAnalytics(businessId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [sales30, sales7, topProducts] = await Promise.all([
      prisma.sale.aggregate({
        where: { businessId, createdAt: { gte: thirtyDaysAgo } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: { businessId, createdAt: { gte: sevenDaysAgo } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: { businessId, createdAt: { gte: thirtyDaysAgo } } },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const productIds = topProducts.map((p) => p.productId);
    const productMap = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });
    const productLookup = new Map(productMap.map((p) => [p.id, p]));

    const bestSellers = topProducts.map((p) => ({
      productId: p.productId,
      name: productLookup.get(p.productId)?.name || 'Unknown',
      sku: productLookup.get(p.productId)?.sku || '',
      unitsSold: p._sum.quantity || 0,
      totalRevenue: Number(p._sum.totalPrice?.toFixed(2) || 0),
    }));

    return {
      last30Days: {
        totalRevenue: Number(sales30._sum.totalAmount?.toFixed(2) || 0),
        totalOrders: sales30._count.id || 0,
      },
      last7Days: {
        totalRevenue: Number(sales7._sum.totalAmount?.toFixed(2) || 0),
        totalOrders: sales7._count.id || 0,
      },
      bestSellers,
    };
  }
}