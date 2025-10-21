import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Administrador',
        password: bcrypt.hashSync(adminPassword, 10),
        role: 'ADMIN',
        active: true,
      },
    });
  }

  // Mesas 1..5
  for (let number = 1; number <= 5; number++) {
    const existingTable = await prisma.table.findUnique({ where: { number } });
    if (!existingTable) {
      await prisma.table.create({
        data: {
          number,
          capacity: number <= 4 ? 4 : 6,
          status: 'AVAILABLE',
        },
      });
    }
  }

  // Categorías
  const categorias = [
    { name: 'Entradas', description: 'Platos de entrada' },
    { name: 'Platos principales', description: 'Platos fuertes' },
    { name: 'Bebidas', description: 'Bebidas y jugos' },
  ];

  const categoryIds: Record<string, string> = {};
  for (const c of categorias) {
    const existing = await prisma.category.findFirst({ where: { name: c.name } });
    if (!existing) {
      const created = await prisma.category.create({ data: { name: c.name, description: c.description, active: true } });
      categoryIds[c.name] = created.id;
    } else {
      categoryIds[c.name] = existing.id;
    }
  }

  // Productos
  const productsData = [
    { name: 'Empanadas', price: 2500, categoryName: 'Entradas', description: 'Empanadas de pino' },
    { name: 'Ceviche', price: 4500, categoryName: 'Entradas' },
    { name: 'Lomo a lo pobre', price: 8900, categoryName: 'Platos principales' },
    { name: 'Pastel de choclo', price: 7500, categoryName: 'Platos principales' },
    { name: 'Jugo natural', price: 2000, categoryName: 'Bebidas' },
    { name: 'Cerveza', price: 3000, categoryName: 'Bebidas' },
  ];

  for (const p of productsData) {
    const categoryId = categoryIds[p.categoryName];
    if (!categoryId) continue;
    const existing = await prisma.product.findFirst({ where: { name: p.name, categoryId } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          categoryId,
          active: true,
        },
      });
    }
  }

  const totals = {
    users: await prisma.user.count(),
    tables: await prisma.table.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
  };

  console.log(`✅ Seed completado: users=${totals.users}, mesas=${totals.tables}, categorías=${totals.categories}, productos=${totals.products}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });