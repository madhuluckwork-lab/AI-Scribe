import "dotenv/config";
import bcrypt from "bcryptjs";

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await bcrypt.hash("TestPassword123!", 12);

    const demoUser = await prisma.user.upsert({
      where: { email: "demo@medscribe.ai" },
      update: { hashedPassword },
      create: {
        email: "demo@medscribe.ai",
        name: "Dr. Demo User",
        hashedPassword,
        emailVerified: new Date(),
        role: "CLINICIAN",
        specialty: "Internal Medicine",
        preferences: {
          create: {
            defaultNoteType: "SOAP",
            theme: "system",
          },
        },
      },
    });

    console.log(`Seeded demo user: ${demoUser.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
