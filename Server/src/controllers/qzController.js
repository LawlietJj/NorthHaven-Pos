const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const qzDirectory = path.resolve(__dirname, "../../qz");
const certificatePath = path.join(qzDirectory, "digital-certificate.txt");
const privateKeyPath = path.join(qzDirectory, "private-key.pem");

// Prefer QZ_PRIVATE_KEY from the environment (production); fall back to the local file (development).
function getPrivateKey() {
  const envKey = process.env.QZ_PRIVATE_KEY;
  if (envKey && envKey.trim()) return envKey.replace(/\\n/g, "\n");
  if (fs.existsSync(privateKeyPath)) return fs.readFileSync(privateKeyPath, "utf8");
  return null;
}

// Startup self-check: if the signing key doesn't belong to the served
// certificate, QZ Tray rejects every signature and keeps showing trust
// prompts even with override.crt installed. Logs only public facts.
function logQzKeyCheck() {
  try {
    const cert = new crypto.X509Certificate(fs.readFileSync(certificatePath));
    const key = getPrivateKey();
    const source = process.env.QZ_PRIVATE_KEY?.trim() ? "QZ_PRIVATE_KEY env" : "qz/private-key.pem";
    if (!key) {
      console.error("[qz] No signing key configured (set QZ_PRIVATE_KEY). Printing will be untrusted.");
      return;
    }
    const matches = cert.checkPrivateKey(crypto.createPrivateKey(key));
    const log = matches ? console.log : console.error;
    log(`[qz] key source=${source} matchesCertificate=${matches} certFingerprint=${cert.fingerprint256}`);
  } catch (error) {
    console.error(`[qz] Key check failed: ${error.message}`);
  }
}
logQzKeyCheck();

function getSigningRequest(req) {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body.request === "string") return req.body.request;
  return "";
}

function getCertificate(req, res, next) {
  try {
    const certificate = fs.readFileSync(certificatePath, "utf8");
    res.type("text/plain").send(certificate);
  } catch (error) {
    next(error);
  }
}

function signRequest(req, res, next) {
  try {
    const request = getSigningRequest(req);
    if (!request) {
      return res.status(400).json({ error: "A QZ signing request is required." });
    }

    const privateKey = getPrivateKey();
    if (!privateKey) {
      console.error("QZ signing failed: set QZ_PRIVATE_KEY or provide qz/private-key.pem");
      return res.status(500).json({ error: "QZ signing key is not configured on the server." });
    }
    const signer = crypto.createSign("SHA512");
    signer.update(request);
    signer.end();

    return res.type("text/plain").send(signer.sign(privateKey, "base64"));
  } catch (error) {
    next(error);
  }
}

module.exports = { getCertificate, signRequest };
