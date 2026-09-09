require("dotenv").config();
const prisma = require("../src/utils/prismaClient");
const { hashPassword } = require("../src/utils/password");

const OWNER_NAME = "Business Owner";
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL;
const OWNER_TEMP_PASSWORD = process.env.SEED_OWNER_PASSWORD;
if (!OWNER_EMAIL || !OWNER_TEMP_PASSWORD) {
  throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD in .env before running the seed script.");
}

async function main() {
  const existingOwner = await prisma.users.findFirst({ where: { role: "owner" } });
  if (existingOwner) {
    console.log("An Owner account already exists — seed script will not create another.");
    return;
  }

  const password_hash = await hashPassword(OWNER_TEMP_PASSWORD);

  await prisma.users.create({
    data: {
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      password_hash,
      role: "owner",
      is_active: true,
    },
  });

  console.log("Owner account created:");
  console.log(`  Email:    ${OWNER_EMAIL}`);
  console.log(`  Password: ${OWNER_TEMP_PASSWORD}  (log in and change this immediately)`);

  const shop1 = await prisma.shops.upsert({
    where: { shop_code: "S1" },
    update: {},
    create: { shop_name: "Exotic Kids Wears and More", shop_code: "S1" },
  });

  const shop2 = await prisma.shops.upsert({
    where: { shop_code: "S2" },
    update: {},
    create: { shop_name: "Exotic Shoes and Bag", shop_code: "S2" },
  });

  console.log(`Shops ready: ${shop1.shop_name} (${shop1.shop_code}), ${shop2.shop_name} (${shop2.shop_code})`);
}

main()
  .catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });