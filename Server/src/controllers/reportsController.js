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

/**
 * GET /reports/sales-summary?shop_id=&from=&to=
 * Owner or Manager. Pulls straight from `sales.subtotal` — no cost
 * data touched at all, so this is identical for both roles.
 */
async function salesSummary(req, res, next) {
  try {
    const { shop_id, from, to } = req.query;

    const where = {
      shop_id: shop_id ? Number(shop_id) : undefined,
      created_at: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    };

    const sales = await prisma.sales.findMany({ where });

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.subtotal), 0);

    return res.status(200).json({
      shop_id: shop_id ? Number(shop_id) : "all",
      period: { from: from || null, to: to || null },
      total_sales_count: sales.length,
      total_revenue: totalRevenue,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/low-stock?
 */
async function lowStock(req, res, next) {
  try {
    const { shop_id } = req.query;

    const products = shop_id
      ? await prisma.$queryRaw`
          SELECT product_id, shop_id, name, quantity, low_stock_level
          FROM products
          WHERE shop_id = ${Number(shop_id)} AND quantity <= low_stock_level
          ORDER BY quantity ASC
        `
      : await prisma.$queryRaw`
          SELECT product_id, shop_id, name, quantity, low_stock_level
          FROM products
          WHERE quantity <= low_stock_level
          ORDER BY quantity ASC
        `;

    return res.status(200).json(products);
  } catch (err) {
    next(err);
  }
}


//  ONLY Owner sees cost_value and potential_profit, 

async function stockValue(req, res, next) {
  try {
    const { shop_id } = req.query;

    const products = await prisma.products.findMany({
      where: shop_id ? { shop_id: Number(shop_id) } : undefined,
    });

    const retailValue = products.reduce((sum, p) => sum + Number(p.selling_price) * p.quantity, 0);

    const response = {
      shop_id: shop_id ? Number(shop_id) : "all",
      total_units: products.reduce((sum, p) => sum + p.quantity, 0),
      retail_value: retailValue,
    };

    if (req.user.role === "owner") {
      const costValue = products.reduce(
        (sum, p) => sum + Number(p.cost_price || 0) * p.quantity,
        0
      );
      response.cost_value = costValue;
      response.potential_profit = retailValue - costValue;
      response.note =
        "cost_value and potential_profit use CURRENT cost_price per product, not historical cost at time of each purchase.";
    }

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}


async function shopComparison(req, res, next) {
  try {
    const shops = await prisma.shops.findMany();

    const breakdown = await Promise.all(
      shops.map(async (shop) => {
        const sales = await prisma.sales.findMany({ where: { shop_id: shop.shop_id } });
        const revenue = sales.reduce((sum, s) => sum + Number(s.subtotal), 0);
        return {
          shop_id: shop.shop_id,
          shop_code: shop.shop_code,
          shop_name: shop.shop_name,
          total_sales_count: sales.length,
          total_revenue: revenue,
        };
      })
    );

    const combined = {
      total_sales_count: breakdown.reduce((sum, s) => sum + s.total_sales_count, 0),
      total_revenue: breakdown.reduce((sum, s) => sum + s.total_revenue, 0),
    };

    return res.status(200).json({ shops: breakdown, combined });
  } catch (err) {
    next(err);
  }
}

async function salesLog(req, res, next) {
  try {
    const { date } = req.query;

    const where = {};
    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.created_at = { gte: startOfDay, lte: endOfDay };
    }

    const transactions = await prisma.transactions.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        users: { select: { name: true } },
        payments: true,
        sales: { include: { shops: { select: { shop_code: true } } } },
      },
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0);

    const withCashierName = transactions.map((t) => ({
      ...t,
      cashier_name: t.users.name,
      users: undefined,
    }));

    return res.status(200).json({
      total_sales_count: transactions.length,
      total_revenue: totalRevenue,
      transactions: withCashierName,
    });
  } catch (err) {
    next(err);
  }
}


async function paymentBreakdown(req, res, next) {
  try {
    const { from, to } = req.query;

    const payments = await prisma.payments.findMany({
      where: {
        created_at: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { transactions: { select: { total_amount: true } } },
    });

    const breakdown = {};
    for (const p of payments) {
      const amount = Number(p.transactions.total_amount);
      if (!breakdown[p.method]) {
        breakdown[p.method] = { method: p.method, count: 0, total_amount: 0 };
      }
      breakdown[p.method].count += 1;
      breakdown[p.method].total_amount += amount;
    }

    const grandTotal = Object.values(breakdown).reduce((sum, b) => sum + b.total_amount, 0);

    return res.status(200).json({
      period: { from: from || null, to: to || null },
      by_method: Object.values(breakdown),
      grand_total: grandTotal,
    });
  } catch (err) {
    next(err);
  }
}
async function revenueTrend(req, res, next) {
  try {
    const range = ["day", "week", "month", "year"].includes(req.query.range) ? req.query.range : "week";
    const now = new Date();
    const buckets = [];

    if (range === "day") {
      for (let h = 0; h < 24; h++) {
        const hourStart = new Date(now);
        hourStart.setHours(h, 0, 0, 0);
        const hourEnd = new Date(now);
        hourEnd.setHours(h, 59, 59, 999);
        buckets.push({
          label: hourStart.toLocaleTimeString("en-US", { hour: "numeric" }),
          start: hourStart,
          end: hourEnd,
        });
       }
      } else if (range === "week") {
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        buckets.push({
          label: day.toLocaleDateString("en-US", { weekday: "short" }),
          start: startOfDay(day),
          end: endOfDay(day),
        });
      }
    } else if (range === "month") {
      for (let i = 3; i >= 0; i--) {
        const end = new Date(now);
        end.setDate(end.getDate() - i * 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        buckets.push({
          label: `${start.getDate()}/${start.getMonth() + 1}`,
          start: startOfDay(start),
          end: endOfDay(end),
        });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
        buckets.push({
          label: monthDate.toLocaleDateString("en-US", { month: "short" }),
          start,
          end,
        });
      }
    }

    const overallStart = buckets[0].start;
    const overallEnd = buckets[buckets.length - 1].end;
    const sales = await prisma.sales.findMany({
      where: { created_at: { gte: overallStart, lte: overallEnd } },
    });

    const result = buckets.map((b) => {
      const bucketSales = sales.filter(
        (s) => new Date(s.created_at) >= b.start && new Date(s.created_at) <= b.end
      );
      return {
        label: b.label,
        revenue: bucketSales.reduce((sum, s) => sum + Number(s.subtotal), 0),
        sales_count: bucketSales.length,
      };
    });

    return res.status(200).json({ range, buckets: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { salesSummary, lowStock, stockValue, shopComparison, salesLog, paymentBreakdown, revenueTrend };

