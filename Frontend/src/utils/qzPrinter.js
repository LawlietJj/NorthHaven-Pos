import qz from "qz-tray/qz-tray.js";
import apiClient from "../api/apiClient";

// Each computer picks its own printers once; the choice is saved in this
// browser, per role, so receipts and labels never go to each other's printer.
export const PRINTER_ROLES = {
  receipt: { storageKey: "printer.receipt", label: "Receipt printer" },
  label: { storageKey: "printer.label", label: "Label printer" },
};

// Fallback for when localStorage is blocked, so a choice lasts for this page load.
const sessionPrinters = {};

export class PrinterNotSelectedError extends Error {
  constructor(role, message) {
    super(message);
    this.name = "PrinterNotSelectedError";
    this.role = role;
  }
}

export function getSavedPrinter(role) {
  try {
    return localStorage.getItem(PRINTER_ROLES[role].storageKey) || "";
  } catch {
    return "";
  }
}

export function savePrinter(role, printerName) {
  try {
    localStorage.setItem(PRINTER_ROLES[role].storageKey, printerName);
  } catch {
    // Storage blocked — the choice just won't persist past this page load.
  }
  sessionPrinters[role] = printerName;
}

// Horizontal nudge (mm) for barcode labels — each printer feeds slightly
// differently, so it's tuned and saved per computer. Positive moves right.
const LABEL_OFFSET_KEY = "printer.label.offsetX";
export const LABEL_OFFSET_LIMIT = 5;

export function getLabelOffset() {
  try {
    const value = Number(localStorage.getItem(LABEL_OFFSET_KEY));
    return Number.isFinite(value) ? Math.max(-LABEL_OFFSET_LIMIT, Math.min(LABEL_OFFSET_LIMIT, value)) : 0;
  } catch {
    return 0;
  }
}

export function saveLabelOffset(offsetMm) {
  try {
    localStorage.setItem(LABEL_OFFSET_KEY, String(offsetMm));
  } catch {
    // Storage blocked — offset applies for this session only.
  }
}

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

export async function listPrinters() {
  await connectToQz();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [printers];
}

// Never guesses or falls back to the default printer — that could send a
// receipt to the label printer. No valid saved choice → caller shows the picker.
async function resolvePrinter(role) {
  const saved = sessionPrinters[role] || getSavedPrinter(role);
  const roleLabel = PRINTER_ROLES[role].label;
  if (!saved) {
    throw new PrinterNotSelectedError(role, `Choose the ${roleLabel.toLowerCase()} for this computer.`);
  }

  const available = await listPrinters();
  if (!available.includes(saved)) {
    throw new PrinterNotSelectedError(
      role,
      `${roleLabel} "${saved}" is not connected. Plug it in, or choose another printer.`
    );
  }
  return saved;
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
  const printer = await resolvePrinter("label");

  const config = qz.configs.create(printer, {
    units: "mm",
    size: { width: 51, height: 25 },
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
  const printer = await resolvePrinter("receipt");

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
