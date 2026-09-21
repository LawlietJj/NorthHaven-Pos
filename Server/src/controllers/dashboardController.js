const prisma = require("../utils/prismaClient");

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function ownerOverview(req, res, next) {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const shops = await prisma.shops.findMany();
    const todaysSalesByShop = await Promise.all(
      shops.map(async (shop) => {
        const sales = await prisma.sales.findMany({
          where: { shop_id: shop.shop_id, created_at: { gte: todayStart, lte: todayEnd } },
        });
        return {
          shop_id: shop.shop_id,
          shop_code: shop.shop_code,
          sales_count: sales.length,
          revenue: sales.reduce((sum, s) => sum + Number(s.subtotal), 0),
        };
      })
    );
    const todayCombined = {
      sales_count: todaysSalesByShop.reduce((sum, s) => sum + s.sales_count, 0),
      revenue: todaysSalesByShop.reduce((sum, s) => sum + s.revenue, 0),
    };

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekSales = await prisma.sales.findMany({ where: { created_at: { gte: weekAgo, lte: now } } });
    const lastWeekSales = await prisma.sales.findMany({
      where: { created_at: { gte: twoWeeksAgo, lt: weekAgo } },
    });

    const thisWeekRevenue = thisWeekSales.reduce((sum, s) => sum + Number(s.subtotal), 0);
    const lastWeekRevenue = lastWeekSales.reduce((sum, s) => sum + Number(s.subtotal), 0);
    const percentChange =
      lastWeekRevenue === 0 ? null : ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;

    const lowStockProducts = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM products WHERE quantity <= low_stock_level
    `;
    const lowStockCount = Number(lowStockProducts[0].count);

    //  Total product count, across both shops ---
    const totalProducts = await prisma.products.count();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // includes today = 7 days total
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const lastSevenDaysSales = await prisma.sales.findMany({
      where: { created_at: { gte: sevenDaysAgo, lte: todayEnd } },
    });

    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const revenue = lastSevenDaysSales
        .filter((s) => new Date(s.created_at) >= dayStart && new Date(s.created_at) <= dayEnd)
        .reduce((sum, s) => sum + Number(s.subtotal), 0);

      dailyRevenue.push({
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        date: dayStart.toISOString().slice(0, 10),
        revenue,
        is_today: i === 0,
      });
    }

    // Same weekday offsets, shifted back 7 more days, so index i lines up
    // with the matching weekday in dailyRevenue for a week-over-week overlay.
    const dailyRevenueLastWeek = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i - 7);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const revenue = lastWeekSales
        .filter((s) => new Date(s.created_at) >= dayStart && new Date(s.created_at) <= dayEnd)
        .reduce((sum, s) => sum + Number(s.subtotal), 0);

      dailyRevenueLastWeek.push({
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        date: dayStart.toISOString().slice(0, 10),
        revenue,
      });
    }

    const products = await prisma.products.findMany();
    const retailValue = products.reduce((sum, p) => sum + Number(p.selling_price) * p.quantity, 0);
    const stockValue = { retail_value: retailValue };
    if (req.user.role === "owner") {
      const costValue = products.reduce((sum, p) => sum + Number(p.cost_price || 0) * p.quantity, 0);
      stockValue.cost_value = costValue;
      stockValue.potential_profit = retailValue - costValue;
    }

    const recentTransactions = await prisma.transactions.findMany({
      orderBy: { created_at: "desc" },
      take: 10,
      include: { users: { select: { name: true } } },
    });
    const recentActivity = recentTransactions.map((t) => ({
      transaction_id: t.transaction_id,
      total_amount: t.total_amount,
      processed_by: t.users.name,
      created_at: t.created_at,
    }));

    const topSellingRaw = await prisma.sale_items.groupBy({
      by: ["product_id"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });
    const topSellingProductIds = topSellingRaw.map((r) => r.product_id);
    const topSellingProductDetails = await prisma.products.findMany({
      where: { product_id: { in: topSellingProductIds } },
      select: { product_id: true, name: true, shop_id: true },
    });
    const topSelling = topSellingRaw.map((r) => {
      const details = topSellingProductDetails.find((p) => p.product_id === r.product_id);
      return {
        product_id: r.product_id,
        name: details?.name || "Unknown product",
        shop_id: details?.shop_id,
        total_quantity_sold: r._sum.quantity,
      };
    });

    return res.status(200).json({
      today: { by_shop: todaysSalesByShop, combined: todayCombined },
      week_trend: {
        this_week_revenue: thisWeekRevenue,
        last_week_revenue: lastWeekRevenue,
        percent_change: percentChange,
        daily_this_week: dailyRevenue,
        daily_last_week: dailyRevenueLastWeek,
      },
      low_stock_count: lowStockCount,
      total_products: totalProducts,
      daily_revenue_last_7_days: dailyRevenue,
      stock_value: stockValue,
      recent_activity: recentActivity,
      top_selling_products: topSelling,
    });
  } catch (err) {
    next(err);
  }
}

async function getActivityLog(req, res, next) {
  try {
    const logs = await prisma.activity_log.findMany({
      orderBy: { created_at: "desc" },
      take: 50,
      include: { users: { select: { name: true, role: true } } },
    });

    return res.status(200).json(logs.map((log) => ({
      log_id: log.log_id,
      user_name: log.users.name,
      user_role: log.users.role,
      action: log.action,
      details: log.details,
      created_at: log.created_at,
    })));
  } catch (err) {
    next(err);
  }
}

module.exports = { ownerOverview, managerOverview: ownerOverview, getActivityLog };