const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("../../generated/prisma");

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
  // Match the tables' collation so string params (e.g. search LIKE) don't clash
  // with the host's default connection collation (error 1267 on production).
  collation: process.env.DB_COLLATION || "UTF8MB4_GENERAL_CI",
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;