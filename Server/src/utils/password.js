const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

const Min_PASSWORD_LENGHT = 8;


function validatePasswordStrength(password) {
    if(typeof password !== "string" || password.length < Min_PASSWORD_LENGHT) {
         return `Password must be at least ${Min_PASSWORD_LENGHT} characters long.`;
    }
    return null;
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = { hashPassword, verifyPassword, validatePasswordStrength };