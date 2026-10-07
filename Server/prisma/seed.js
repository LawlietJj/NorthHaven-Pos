require("dotenv").config();
const prisma = require("../src/utils/prismaClient");
const { hashPassword } = require("../src/utils/password");

const OWNER_NAME = "Business Owner";
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL;
const OWNER_TEMP_PASSWORD = process.env.SEED_OWNER_PASSWORD;

const demoCatalog = [
  {
    shopCode: "S1",
    categories: ["Kids Clothing", "Footwear", "Accessories"],
    products: [
      { category: "Kids Clothing", barcode: "S1-DEMO-001", name: "Kids Ankara Set", brand: "NorthHaven", cost: 11000, price: 18500, quantity: 18, lowStock: 5 },
      { category: "Kids Clothing", barcode: "S1-DEMO-002", name: "Classic Denim Jacket", brand: "NorthHaven", cost: 15000, price: 24000, quantity: 11, lowStock: 4 },
      { category: "Footwear", barcode: "S1-DEMO-003", name: "Canvas Sneakers", brand: "StepUp", cost: 19000, price: 28500, quantity: 14, lowStock: 4 },
      { category: "Accessories", barcode: "S1-DEMO-004", name: "School Backpack", brand: "Little Trek", cost: 14000, price: 22000, quantity: 8, lowStock: 3 },
      { category: "Accessories", barcode: "S1-DEMO-005", name: "Colourful Hair Bow Set", brand: "NorthHaven", cost: 2000, price: 4500, quantity: 24, lowStock: 6 },
    ],
  },
  {
    shopCode: "S2",
    categories: ["Handbags", "Footwear", "Travel Accessories"],
    products: [
      { category: "Handbags", barcode: "S2-DEMO-001", name: "Everyday Tote Bag", brand: "Urban Carry", cost: 28000, price: 45000, quantity: 9, lowStock: 3 },
      { category: "Handbags", barcode: "S2-DEMO-002", name: "Mini Crossbody Bag", brand: "Urban Carry", cost: 22000, price: 36000, quantity: 12, lowStock: 4 },
      { category: "Footwear", barcode: "S2-DEMO-003", name: "Ladies Comfort Sandals", brand: "StepUp", cost: 16000, price: 27000, quantity: 15, lowStock: 5 },
      { category: "Footwear", barcode: "S2-DEMO-004", name: "Unisex Classic Slides", brand: "StepUp", cost: 9000, price: 15500, quantity: 3, lowStock: 5 },
      { category: "Travel Accessories", barcode: "S2-DEMO-005", name: "Compact Travel Wallet", brand: "NorthHaven", cost: 6500, price: 12000, quantity: 17, lowStock: 5 },
    ],
  },
];

async function main() {
  let owner = await prisma.users.findFirst({ where: { role: "owner" } });
  if (!owner) {
    if (!OWNER_EMAIL || !OWNER_TEMP_PASSWORD) {
      throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD in .env before creating the owner account.");
    }

    owner = await prisma.users.create({
      data: {
        name: OWNER_NAME,
        email: OWNER_EMAIL,
        password_hash: await hashPassword(OWNER_TEMP_PASSWORD),
        role: "owner",
        is_active: true,
      },
    });
    console.log(`Owner account created for ${OWNER_EMAIL}.`);
  } else {
    console.log(`Using existing owner account: ${owner.email}.`);
  }

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

  const shopByCode = { S1: shop1, S2: shop2 };
  const demoProducts = [];

  for (const shopSeed of demoCatalog) {
    const shop = shopByCode[shopSeed.shopCode];
    const categoryByName = {};

    for (const name of shopSeed.categories) {
      categoryByName[name] = await prisma.categories.upsert({
        where: { shop_id_name: { shop_id: shop.shop_id, name } },
        update: {},
        create: { shop_id: shop.shop_id, name, created_by: owner.user_id },
      });
    }

    for (const item of shopSeed.products) {
      const existingProduct = await prisma.products.findUnique({
        where: { shop_id_barcode: { shop_id: shop.shop_id, barcode: item.barcode } },
      });
      const product = await prisma.products.upsert({
        where: { shop_id_barcode: { shop_id: shop.shop_id, barcode: item.barcode } },
        update: {},
        create: {
          shop_id: shop.shop_id,
          category_id: categoryByName[item.category].category_id,
          barcode: item.barcode,
          barcode_source: "manufacturer",
          name: item.name,
          brand: item.brand,
          cost_price: item.cost,
          selling_price: item.price,
          quantity: item.quantity,
          low_stock_level: item.lowStock,
          created_by: owner.user_id,
        },
      });

      demoProducts.push(product);
      if (!existingProduct) {
        await prisma.purchase_batches.create({
          data: {
            shop_id: shop.shop_id,
            product_id: product.product_id,
            quantity: item.quantity,
            total_cost: item.cost * item.quantity,
            unit_cost: item.cost,
            recorded_by: owner.user_id,
          },
        });
        await prisma.stock_movements.create({
          data: {
            shop_id: shop.shop_id,
            product_id: product.product_id,
            user_id: owner.user_id,
            quantity: item.quantity,
            movement_type: "STOCK_IN",
            reference: "DEMO-SEED",
          },
        });
      }
    }
  }

  const existingDemoSale = await prisma.sale_items.findFirst({
    where: { product_id: { in: demoProducts.map((product) => product.product_id) } },
  });

  if (!existingDemoSale) {
    const saleSamples = [
      { product: demoProducts[0], quantity: 2, daysAgo: 6, method: "cash" },
      { product: demoProducts[5], quantity: 1, daysAgo: 5, method: "transfer" },
      { product: demoProducts[2], quantity: 1, daysAgo: 4, method: "card" },
      { product: demoProducts[8], quantity: 2, daysAgo: 3, method: "cash" },
      { product: demoProducts[3], quantity: 1, daysAgo: 2, method: "transfer" },
      { product: demoProducts[6], quantity: 1, daysAgo: 1, method: "card" },
      { product: demoProducts[1], quantity: 2, daysAgo: 0, method: "cash" },
    ];

    for (const sample of saleSamples) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - sample.daysAgo);
      createdAt.setHours(12, 0, 0, 0);
      const total = Number(sample.product.selling_price) * sample.quantity;
      const change = sample.method === "cash" ? 5000 : 0;

      await prisma.transactions.create({
        data: {
          cashier_id: owner.user_id,
          total_amount: total,
          created_at: createdAt,
          sales: {
            create: {
              shop_id: sample.product.shop_id,
              subtotal: total,
              created_at: createdAt,
              sale_items: {
                create: {
                  product_id: sample.product.product_id,
                  quantity: sample.quantity,
                  price_at_sale: sample.product.selling_price,
                  created_at: createdAt,
                },
              },
            },
          },
          payments: {
            create: {
              method: sample.method,
              amount_tendered: total + change,
              change_given: change,
              created_at: createdAt,
            },
          },
        },
      });
    }
    console.log("Sample sales created for the last seven days.");
  } else {
    console.log("Sample sales already exist; leaving sales history unchanged.");
  }

  console.log(`Demo catalog ready: ${demoProducts.length} products across ${Object.keys(shopByCode).length} shops.`);
}

main()
  .catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });