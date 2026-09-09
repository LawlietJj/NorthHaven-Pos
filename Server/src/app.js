const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const shopRoutes = require("./routes/shopRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const stockRoutes = require("./routes/stockRoutes");
const posRoutes = require("./routes/PosRoutes");
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const heldCartRoutes = require("./routes/heldCartRoutes");



const { products } = require("./utils/prismaClient");


const app = express();

// --- Security middleware (applied globally, before any routes) ---

// Helmet sets a range of protective HTTP headers in one line:
// blocks MIME-sniffing, disables framing (clickjacking protection),
// hides the "X-Powered-By: Express" fingerprint, etc.
app.use(helmet());


const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "").split(",").filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" })); // limit prevents oversized payload abuse

// --- Routes ---
app.use("/auth", authRoutes);
app.use("/shops", shopRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/", stockRoutes);
app.use("/pos", posRoutes);
app.use("/reports", reportRoutes);
app.use("/users", userRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/held-carts", heldCartRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: "Something went wrong. Please try again.",
  });
});

module.exports = app;
