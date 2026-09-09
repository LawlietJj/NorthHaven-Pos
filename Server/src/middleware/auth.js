const { verifyToken } = require("../utils/jwt");
const prisma = require("../utils/prismaClient");


async function requireAuth(req, res, next) {

    try{
        const authHeader = req.headers.authorization || "";
        const [scheme, token] = authHeader.split(" ");

        if(scheme !== "Bearer" || !token){
           return res.status(401).json({ error: "Authentication required." });
        }

        let decoded;

        try {
        decoded = verifyToken(token);
        } catch (err) {
            return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
        }

        const user = await prisma.users.findUnique({
            where: { user_id: decoded.user_id },
            select: { user_id: true, name: true, role: true, is_active: true, password_changed_at: true },
        });

        if (!user || !user.is_active) {
            return res.status(401).json({ error: "Account not found or disabled." });
        }

        const tokenIssuedAt = decoded.iat * 1000;
        if (tokenIssuedAt < new Date(user.password_changed_at).getTime()) {
            return res.status(401).json({ error: "Your password was changed. Please log in again." });
        }

         req.user = { user_id: user.user_id, name: user.name, role: user.role };
         next();

  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };