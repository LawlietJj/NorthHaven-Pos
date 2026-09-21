const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const qzDirectory = path.resolve(__dirname, "../../qz");
const certificatePath = path.join(qzDirectory, "digital-certificate.txt");
const privateKeyPath = path.join(qzDirectory, "private-key.pem");

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

    const privateKey = fs.readFileSync(privateKeyPath, "utf8");
    const signer = crypto.createSign("SHA512");
    signer.update(request);
    signer.end();

    return res.type("text/plain").send(signer.sign(privateKey, "base64"));
  } catch (error) {
    next(error);
  }
}

module.exports = { getCertificate, signRequest };
