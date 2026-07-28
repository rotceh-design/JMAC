import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const USERS = [
  { email: "admin@jhon-aire.cl", password: "admin123", name: "Admin User", role: "ADMIN" },
  { email: "tech@jhon-aire.cl", password: "tech123", name: "Tech User", role: "TECHNICIAN" },
  { email: "ops@jhon-aire.cl", password: "ops123", name: "Ops User", role: "OPERATIONS" },
  { email: "support@jhon-aire.cl", password: "support123", name: "Support User", role: "SUPPORT" },
] as const;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, name: u.name, role: u.role as any },
      create: {
        email: u.email,
        passwordHash: hash,
        name: u.name,
        role: u.role as any,
      },
    });
    console.log(`OK: ${user.email} (${user.role})`);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
