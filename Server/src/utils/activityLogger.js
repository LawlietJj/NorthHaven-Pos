const prisma = require("./prismaClient");

async function logActivity(userId, action, details = null) {
  try {
    await prisma.activity_log.create({
      data: { user_id: userId, action, details },
    });
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
}

module.exports = { logActivity };