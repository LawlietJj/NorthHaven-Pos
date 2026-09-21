const prisma = require('../utils/prismaClient');
const { verifyPassword, hashPassword, validatePasswordStrength  } = require('../utils/password');
const { signToken } = require("../utils/jwt");
const { logActivity } = require("../utils/activityLogger");

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

async function login(req, res, next) {
   
    try{
       const { email, password } = req.body;
       if (!email || !password) {
           return res.status(400).json({ error: "Email and password are required." });
       }
       
       const GenericErrorMessage = "Invalid email or password.";
       const user = await prisma.users.findUnique({ where: { email } });

       if(!user || !user.is_active) {
           return res.status(401).json({ error: GenericErrorMessage });
       }
       if(user.locked_until && new Date() < new Date(user.locked_until)) {
           const remainingLockoutTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
           return res.status(403).json({ error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingLockoutTime} minutes.` });
       }

       const passwordMatch = await verifyPassword(password, user.password_hash);

       if(!passwordMatch) {
           const failedAttempts = user.failed_login_attempts + 1;
           const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
            await prisma.users.update({
                where: { user_id: user.user_id },
                data: {
                    failed_login_attempts: shouldLock ? 0 : failedAttempts,
                    locked_until: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
                },
            });
            return res.status(401).json({ error: GenericErrorMessage });
        }

         await prisma.users.update({
            where: { user_id: user.user_id },
            data: {
                failed_login_attempts: 0,
                locked_until: null,
            },
        });
        
        const token = signToken(user);
        await logActivity(user.user_id, "LOGIN");
        res.json({ token, user: { user_id: user.user_id, name: user.name, role: user.role } });  

    }
    catch (err) {
        next(err);
    }

}

async function changePassword(req, res, next) {
    try {
        const { user_id, new_password } = req.body;
        const strengthError = validatePasswordStrength(new_password);
        if (strengthError) {
            return res.status(400).json({ error: strengthError });
        }

        const targetUser = await prisma.users.findUnique({ where: { user_id: Number(user_id) } });
        if (!targetUser) {
            return res.status(404).json({ error: "User not found." });
        }

        const newPasswordHash = await hashPassword(new_password);

        await prisma.users.update({
            where: {user_id: targetUser.user_id},
            data: { password_hash: newPasswordHash, password_changed_at: new Date(), failed_login_attempts: 0, locked_until: null },
        });
      return res.status(200).json({ message: `Password reset for ${targetUser.name}.` });
    }
    catch (err) {
        next(err);
    }
}

module.exports = { login, changePassword };