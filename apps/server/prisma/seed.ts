import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.aiRecommendation.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.stockBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.businessMember.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  // Create Demo User & Business
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const user = await prisma.user.create({
    data: {
      email: 'demo@stockmind.ai',
      fullName: 'Ahmet Yılmaz',
      passwordHash,
    },
  });

  const business = await prisma.business.create({
    data: {
      name: 'Yılmaz Teknoloji ve Market',
      taxId: 'TR9876543210',
    },
  });

  await prisma.businessMember.create({
    data: {
      userId: user.id,
      businessId: business.id,
      role: 'OWNER',
    },
  });

  // Create Categories & Suppliers
  const electronicsCat = await prisma.category.create({
    data: { name: 'Elektronik & Aksesuar', businessId: business.id },
  });
  const beverageCat = await prisma.category.create({
    data: { name: 'İçecek & Gıda', businessId: business.id },
  });

  const supplierA = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: 'Anadolu Dağıtım Ltd.',
      contactName: 'Mehmet Demir',
      email: 'tedarik@anadoludagitim.com',
      phone: '+90 242 555 0199',
      typicalLeadDays: 2,
    },
  });

  // Create Products
  const espressoBeans = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: beverageCat.id,
      supplierId: supplierA.id,
      name: 'Kahve Çekirdeği 1kg',
      sku: 'KAV-001',
      barcode: '869000000001',
      purchasePrice: 280.00,
      sellingPrice: 450.00,
      currentStock: 4,
      minStockThreshold: 10,
    },
  });

  const wirelessMouse = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: electronicsCat.id,
      supplierId: supplierA.id,
      name: 'Kablosuz Optik Mouse',
      sku: 'ELK-102',
      barcode: '869000000002',
      purchasePrice: 150.00,
      sellingPrice: 299.00,
      currentStock: 25,
      minStockThreshold: 5,
    },
  });

  // Create Batches with Expiration Dates
  const expDateNear = new Date();
  expDateNear.setDate(expDateNear.getDate() + 5);

  await prisma.stockBatch.create({
    data: {
      productId: espressoBeans.id,
      batchNumber: 'BATCH-2026-001',
      quantity: 4,
      expirationDate: expDateNear,
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log('Demo Credentials -> Email: demo@stockmind.ai | Password: Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });