const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "12h";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET is missing or too short. Set a strong secret (32+ chars) in .env before starting the server."
  );
}

function signToken(user) {
  const payload = {
    user_id: user.user_id,
    role: user.role,
    name: user.name,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256", // explicit — never trust an algorithm from the token itself
  });

}

function verifyToken(token) {
  // Throws if invalid/expired — caller (auth middleware) handles the error.
  return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
}

module.exports = { signToken, verifyToken };