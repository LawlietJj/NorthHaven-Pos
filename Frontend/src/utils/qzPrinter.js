import qz from "qz-tray/qz-tray.js";
import apiClient from "../api/apiClient";

const BARCODE_PRINTER_NAME = "Xprinter XP-365B";
const RECEIPT_PRINTER_NAME = "Xprinter XP-80TS";
let connectionPromise;
let securityConfigured = false;

function configureQzSecurity() {
  if (securityConfigured) return;

  qz.security.setCertificatePromise((resolve, reject) => {
    apiClient
      .get("/qz/certificate", { responseType: "text" })
      .then((response) => resolve(response.data))
      .catch(reject);
  });

  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise((dataToSign) => (resolve, reject) => {
    apiClient
      .post("/qz/sign", dataToSign, { headers: { "Content-Type": "text/plain" } })
      .then((response) => resolve(response.data))
      .catch(reject);
  });

  securityConfigured = true;
}

// Exact name first, then a case-insensitive partial match (Windows often renames
// printers, e.g. "Xprinter XP-80TS (Copy 1)"). The error lists what QZ sees.
async function findPrinter(expectedName) {
  const printers = await qz.printers.find();
  const available = Array.isArray(printers) ? printers : [printers];
  const model = expectedName.replace(/^xprinter\s+/i, "").toLowerCase();

  const printer =
    available.find((name) => name === expectedName) ||
    available.find((name) => name.toLowerCase().includes(model));

  if (!printer) {
    throw new Error(
      `Printer "${expectedName}" was not found in QZ Tray. Available: ${available.join(", ") || "none"}`
    );
  }
  return printer;
}

async function connectToQz() {
  configureQzSecurity();
  if (qz.websocket.isActive()) return;

  if (!connectionPromise) {
    connectionPromise = qz.websocket.connect().catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  await connectionPromise;
}

export async function printBarcodeLabels(html, copies = 1) {
  await connectToQz();
  const printer = await findPrinter(BARCODE_PRINTER_NAME);

  const config = qz.configs.create(printer, {
    units: "mm",
    size: { width: 50, height: 40 },
    orientation: "portrait",
    margins: 0,
    // Force the rendered HTML to fit the declared label size instead of
    // printing at whatever "native" size the renderer produced — with this
    // off, any mismatch between the CSS mm sizing and the renderer's actual
    // output caused content to overflow onto the next physical label.
    scaleContent: true,
    jobName: "Barcode Labels",
  });

  // Repeat the same single-label document as N separate raster entries in
  // one job, instead of the driver's "copies" field (drifted across the
  // continuous roll) or a multi-page HTML document (QZ's pixel/HTML
  // renderer doesn't paginate CSS page-breaks — it just rasterizes the
  // whole thing as one image and shrinks it onto a single label). Each
  // array entry gets rasterized and fed as its own physical label.
  const jobData = Array.from({ length: copies }, () => ({
    type: "pixel",
    format: "html",
    flavor: "plain",
    data: html,
  }));

  await qz.print(config, jobData);
}

export async function printReceipt(html, height = 200) {
  await connectToQz();
  const printer = await findPrinter(RECEIPT_PRINTER_NAME);

  const config = qz.configs.create(printer, {
    units: "mm",
    size: { width: 74, height },
    orientation: "portrait",
    margins: 0,
    scaleContent: false,
    copies: 1,
    jobName: "Sales Receipt",
  });

  return qz.print(config, [
    {
      type: "pixel",
      format: "html",
      flavor: "plain",
      data: html,
    },
  ]);
}
