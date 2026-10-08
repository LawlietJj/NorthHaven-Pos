const express = require("express");
const helmet = require("helmet");
const path = require("path");
const { globalRateLimiter } = require("./middleware/rateLimiter");
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
const qzRoutes = require("./routes/qzRoutes");



const { products } = require("./utils/prismaClient");


const app = express();

// Hostinger (and most hosts) run the app behind their own reverse proxy,
// which sets X-Forwarded-For. Trusting exactly one hop (the proxy directly
// in front of us, not a whole chain) lets express-rate-limit correctly key
// limits per real client IP instead of the proxy's IP for every request.
app.set("trust proxy", 1);

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

// Must be registered before the routes below — Express runs middleware in
// registration order, and a matched route responds without calling next(),
// so a limiter registered after the routes never runs for any real endpoint.
app.use(globalRateLimiter);

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api", stockRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/held-carts", heldCartRoutes);
app.use("/api/qz", qzRoutes);

const frontendBuildPath = path.resolve(__dirname, "../../Frontend/dist");
app.use(express.static(frontendBuildPath));

app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(frontendBuildPath, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: "Something went wrong. Please try again.",
  });
});

module.exports = app;
