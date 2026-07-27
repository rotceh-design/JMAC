const { PrismaClient } = require("../src/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const users = [
  { email: "admin@jhon-aire.cl", password: "admin123", name: "Admin User", role: "ADMIN" },
  { email: "ops@jhon-aire.cl", password: "ops123", name: "Operations Manager", role: "OPERATIONS" },
  { email: "support@jhon-aire.cl", password: "support123", name: "Support Agent", role: "SUPPORT" },
  { email: "tech@jhon-aire.cl", password: "tech123", name: "Carlos Technician", role: "TECHNICIAN" },
];

const products = [
  {
    name: "Samsung Wind-Free 9000 BTU",
    slug: "samsung-windfree-9000",
    brand: "Samsung",
    modelNumber: "SAMSUNG-WF-9K",
    type: "INVERTER",
    btu: 9000,
    energyRating: "A+",
    price: 450000,
    description: "Silent cooling with Wind-Free technology. Perfect for bedrooms and small offices.",
  },
  {
    name: "Samsung Wind-Free 12000 BTU",
    slug: "samsung-windfree-12000",
    brand: "Samsung",
    modelNumber: "SAMSUNG-WF-12K",
    type: "INVERTER",
    btu: 12000,
    energyRating: "A+",
    price: 550000,
    description: "Powerful cooling with energy efficiency. Ideal for living rooms.",
  },
  {
    name: "LG Dual Inverter 18000 BTU",
    slug: "lg-dual-inverter-18000",
    brand: "LG",
    modelNumber: "LG-DI-18K",
    type: "INVERTER",
    btu: 18000,
    energyRating: "A+",
    price: 750000,
    description: "Dual inverter compressor for maximum efficiency and quiet operation.",
  },
  {
    name: "Carrier Split 24000 BTU",
    slug: "carrier-split-24000",
    brand: "Carrier",
    modelNumber: "CARRIER-SPL-24K",
    type: "SPLIT",
    btu: 24000,
    energyRating: "A",
    price: 850000,
    description: "Reliable cooling for larger spaces. Commercial-grade performance.",
  },
  {
    name: "Daikin Inverter 36000 BTU",
    slug: "daikin-inverter-36000",
    brand: "Daikin",
    modelNumber: "DAIKIN-INV-36K",
    type: "INVERTER",
    btu: 36000,
    energyRating: "A+",
    price: 1200000,
    description: "High-capacity inverter for open-plan offices and commercial spaces.",
  },
  {
    name: "Mitsubishi Ducted 48000 BTU",
    slug: "mitsubishi-ducted-48000",
    brand: "Mitsubishi",
    modelNumber: "MITSU-DUC-48K",
    type: "DUCTED",
    btu: 48000,
    energyRating: "A",
    price: 1800000,
    description: "Central ducted system for whole-building climate control.",
  },
];

async function main() {
  console.log("Seeding database...");

  // Seed users
  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        passwordHash,
        name: userData.name,
        role: userData.role,
      },
    });
    console.log(`  Created user: ${userData.email} (${userData.role})`);
  }

  // Seed products
  for (const productData of products) {
    await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: productData,
    });
    console.log(`  Created product: ${productData.name}`);
  }

  // Generate time slots for the next 30 days
  const today = new Date();
  for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (let hour = 9; hour < 18; hour++) {
      const startTime = `${String(hour).padStart(2, "0")}:00`;
      const endTime = `${String(hour + 1).padStart(2, "0")}:00`;

      await prisma.timeSlot.upsert({
        where: {
          date_startTime: {
            date,
            startTime,
          },
        },
        update: {},
        create: {
          date,
          startTime,
          endTime,
          isAvailable: true,
        },
      });
    }
  }
  console.log("  Created time slots for 30 days");

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
