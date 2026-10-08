const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("../../generated/prisma");

const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;

const adapter = new PrismaMariaDb({
  host: databaseUrl?.hostname || process.env.DB_HOST || "127.0.0.1",
  port: Number(databaseUrl?.port || process.env.DB_PORT || 3306),
  user: databaseUrl ? decodeURIComponent(databaseUrl.username) : process.env.DB_USER || "",
  password: databaseUrl ? decodeURIComponent(databaseUrl.password) : process.env.DB_PASSWORD || "",
  database: databaseUrl
    ? decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, ""))
    : process.env.DB_NAME || "",
  connectionLimit: 5,
  // Match the tables' collation so string params (e.g. search LIKE) don't clash
  // with the host's default connection collation (error 1267 on production).
  collation: process.env.DB_COLLATION || "UTF8MB4_GENERAL_CI",
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;