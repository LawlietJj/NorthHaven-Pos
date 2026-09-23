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

    const agg = await prisma.sales.aggregate({
      where,
      _sum: { subtotal: true },
      _count: { _all: true },
    });

    return res.status(200).json({
      shop_id: shop_id ? Number(shop_id) : "all",
      period: { from: from || null, to: to || null },
      total_sales_count: agg._count._all,
      total_revenue: Number(agg._sum.subtotal || 0),
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
    const [shops, salesByShop] = await Promise.all([
      prisma.shops.findMany(),
      prisma.sales.groupBy({
        by: ["shop_id"],
        _sum: { subtotal: true },
        _count: { _all: true },
      }),
    ]);

    const breakdown = shops.map((shop) => {
      const group = salesByShop.find((s) => s.shop_id === shop.shop_id);
      return {
        shop_id: shop.shop_id,
        shop_code: shop.shop_code,
        shop_name: shop.shop_name,
        total_sales_count: group?._count._all || 0,
        total_revenue: Number(group?._sum.subtotal || 0),
      };
    });

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
    const { date, page, limit } = req.query;

    const where = {};
    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.created_at = { gte: startOfDay, lte: endOfDay };
    }

    // Pagination is opt-in — only applies when page/limit is explicitly requested.
    const paginate = page !== undefined || limit !== undefined;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    // total_sales_count / total_revenue always reflect the FULL filtered set,
    // never just the current page — computed separately from the page slice.
    const [totalCount, revenueAgg, transactions] = await Promise.all([
      prisma.transactions.count({ where }),
      prisma.transactions.aggregate({ where, _sum: { total_amount: true } }),
      prisma.transactions.findMany({
        where,
        orderBy: { created_at: "desc" },
        include: {
          users: { select: { name: true } },
          payments: true,
          sales: { include: { shops: { select: { shop_code: true } } } },
        },
        ...(paginate ? { skip: (pageNum - 1) * limitNum, take: limitNum } : {}),
      }),
    ]);

    const totalRevenue = Number(revenueAgg._sum.total_amount || 0);

    const withCashierName = transactions.map((t) => ({
      ...t,
      cashier_name: t.users.name,
      users: undefined,
    }));

    const response = {
      total_sales_count: totalCount,
      total_revenue: totalRevenue,
      transactions: withCashierName,
    };

    if (paginate) {
      response.page = pageNum;
      response.totalPages = Math.max(1, Math.ceil(totalCount / limitNum));
    }

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}


async function paymentBreakdown(req, res, next) {
  try {
    const { from, to } = req.query;
    const createdAt = {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined,
    };

    // payments.transaction_id is @unique (one payment per transaction), so
    // summing each method's transactions.total_amount can't double-count.
    // groupBy can only sum payments' own columns, so the amount comes from
    // a follow-up aggregate per distinct method actually used in the period
    // (bounded by the payment-method enum, not by row count).
    const counts = await prisma.payments.groupBy({
      by: ["method"],
      where: { created_at: createdAt },
      _count: { _all: true },
    });

    const byMethod = await Promise.all(
      counts.map(async (c) => {
        const sumAgg = await prisma.transactions.aggregate({
          where: { payments: { method: c.method, created_at: createdAt } },
          _sum: { total_amount: true },
        });
        return {
          method: c.method,
          count: c._count._all,
          total_amount: Number(sumAgg._sum.total_amount || 0),
        };
      })
    );

    const grandTotal = byMethod.reduce((sum, b) => sum + b.total_amount, 0);

    return res.status(200).json({
      period: { from: from || null, to: to || null },
      by_method: byMethod,
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
/**
 * GET /reports/profit-margins?shop_id=
 * Owner ONLY. Shows margin (selling_price - cost_price) per product,
 * sorted both ways — highest margin AND best sellers are often
 * different products, which is the actual insight here.
 */
async function profitMargins(req, res, next) {
  try {
    const { shop_id } = req.query;

    const products = await prisma.products.findMany({
      where: {
        shop_id: shop_id ? Number(shop_id) : undefined,
        cost_price: { not: null }, // exclude products never restocked yet
      },
    });

    const withMargins = products.map((p) => {
      const margin = Number(p.selling_price) - Number(p.cost_price);
      const marginPercent = (margin / Number(p.selling_price)) * 100;
      return {
        product_id: p.product_id,
        name: p.name,
        shop_id: p.shop_id,
        selling_price: p.selling_price,
        cost_price: p.cost_price,
        margin,
        margin_percent: marginPercent,
      };
    });

    const byMarginDesc = [...withMargins].sort((a, b) => b.margin_percent - a.margin_percent);

    return res.status(200).json({
      highest_margin: byMarginDesc.slice(0, 5),
      lowest_margin: byMarginDesc.slice(-5).reverse(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/net-profit?range=day|week|month|year&shop_id=
 * Owner ONLY — derived from cost_price, which a Manager never sees.
 *
 * Realized profit from actual sales in the period (revenue minus cost of
 * goods sold), NOT a valuation of unsold stock. Uses each product's CURRENT
 * cost_price — no historical cost layers are tracked per sale, same
 * limitation as profit-margins above. Sold units whose product has never
 * been restocked (cost_price is still null) are excluded from both revenue
 * and COGS entirely, rather than being treated as free profit.
 */
function netProfitRangeBounds(range, now) {
  if (range === "day") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }
  if (range === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { start: startOfDay(start), end: endOfDay(now) };
  }
  if (range === "month") {
    const start = new Date(now);
    start.setDate(start.getDate() - 27);
    return { start: startOfDay(start), end: endOfDay(now) };
  }
  // year
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

async function netProfit(req, res, next) {
  try {
    const range = ["day", "week", "month", "year"].includes(req.query.range) ? req.query.range : "week";
    const { shop_id } = req.query;
    const { start, end } = netProfitRangeBounds(range, new Date());

    const saleItems = await prisma.sale_items.findMany({
      where: {
        created_at: { gte: start, lte: end },
        ...(shop_id ? { sales: { shop_id: Number(shop_id) } } : {}),
      },
      select: {
        quantity: true,
        price_at_sale: true,
        products: { select: { cost_price: true } },
      },
    });

    // price_at_sale is the full shelf price; discounts given at the till are
    // recorded per sale and come straight off revenue.
    const discountAgg = await prisma.sales.aggregate({
      where: {
        created_at: { gte: start, lte: end },
        ...(shop_id ? { shop_id: Number(shop_id) } : {}),
      },
      _sum: { discount_amount: true },
    });
    const discounts = Number(discountAgg._sum.discount_amount || 0);

    let revenue = 0;
    let costOfGoodsSold = 0;
    let excludedQuantity = 0;

    for (const item of saleItems) {
      if (item.products.cost_price == null) {
        excludedQuantity += item.quantity;
        continue;
      }
      revenue += Number(item.price_at_sale) * item.quantity;
      costOfGoodsSold += Number(item.products.cost_price) * item.quantity;
    }
    revenue -= discounts;

    return res.status(200).json({
      range,
      period: { from: start, to: end },
      revenue,
      discounts,
      cost_of_goods_sold: costOfGoodsSold,
      net_profit: revenue - costOfGoodsSold,
      excluded_quantity: excludedQuantity,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { salesSummary, lowStock, stockValue, shopComparison, salesLog, paymentBreakdown, revenueTrend, profitMargins, netProfit };


