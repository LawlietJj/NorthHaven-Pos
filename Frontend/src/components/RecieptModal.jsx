import { useState } from "react";
import { Printer, X } from "lucide-react";
import logo from "../assets/logo.jpeg";
import { PrinterNotSelectedError, getSavedPrinter, printReceipt } from "../utils/qzPrinter";
import { useModalKeyboard } from "../utils/useModalKeyboard";
import PrinterPicker from "./PrinterPicker";

// Both shops share one location, so one address for every receipt.
const SHOP_ADDRESS = "SHOP 02, Global Hub, Gyadi Gyadi Court Rd, Kano";

function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

// Thermal printers only print black or nothing, so the colour logo (light
// orange, black corners) comes out blank or muddy. Redraw it as pure black on
// white, masked to the circle, as a PNG sized for the receipt.
const LOGO_PRINT_PX = 200;

async function logoToPrintableDataUrl(source) {
  const image = new Image();
  image.src = source;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = LOGO_PRINT_PX;
  canvas.height = LOGO_PRINT_PX;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, LOGO_PRINT_PX, LOGO_PRINT_PX);

  const pixels = ctx.getImageData(0, 0, LOGO_PRINT_PX, LOGO_PRINT_PX);
  const data = pixels.data;
  const radius = LOGO_PRINT_PX / 2;
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % LOGO_PRINT_PX;
    const y = Math.floor(i / 4 / LOGO_PRINT_PX);
    const outsideCircle = Math.hypot(x + 0.5 - radius, y + 0.5 - radius) > radius;
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Anything not near-white (the blue and the orange) becomes solid black.
    const value = outsideCircle || luminance > 215 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}

function ReceiptModal({ receipt, onClose }) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const [printerName, setPrinterName] = useState(getSavedPrinter("receipt"));
  const [showPicker, setShowPicker] = useState(false);
  const modalRef = useModalKeyboard(onClose);
  // total_amount is what was collected; the pre-discount subtotal is total + discount.
  const discountAmount = Number(receipt.discount_amount) || 0;

  async function handlePrint() {
    setError("");
    setPrinting(true);
    try {
      const receiptElement = document.querySelector(".receipt-print");
      if (!receiptElement) throw new Error("The receipt preview is not ready yet.");

      const receiptMarkup = receiptElement.cloneNode(true);
      const logoDataUrl = await logoToPrintableDataUrl(logo);
      const itemCount = receipt.sales.reduce((count, sale) => count + sale.sale_items.length, 0);
      const receiptHeight = Math.max(200, 90 + itemCount * 8);
      // Explicit pixel size too: the print renderer can't lay out an image
      // whose size only comes from Tailwind classes that aren't in this HTML.
      receiptMarkup.querySelectorAll("img").forEach((image) => {
        image.src = logoDataUrl;
        image.removeAttribute("class");
        image.setAttribute("width", "42");
        image.setAttribute("height", "42");
      });

      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              @page { size: 74mm auto; margin: 0; }
              html, body { margin: 0; padding: 0; width: 74mm; }
              body { font: 8.5pt Arial, sans-serif; line-height: 1.25; }
              .receipt-print { width: 74mm; box-sizing: border-box; padding: 2mm; overflow: hidden; }
              .text-center { text-align: center; }
              /* ~47 chars at 7pt fits the 70mm printable width on one line */
              .receipt-address { font-size: 7pt; white-space: nowrap; overflow: hidden; margin-top: 0.5mm; }
              .text-right { text-align: right; }
              .text-xs { font-size: 9pt; }
              .text-sm { font-size: 8.5pt; }
              .font-semibold { font-weight: 600; }
              .font-medium { font-weight: 500; }
              .flex { display: flex; width: 100%; box-sizing: border-box; }
              .justify-between { justify-content: space-between; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: 1fr 1fr; }
              .gap-y-1 > * { margin-top: 1mm; }
              /* Thermal print is black-or-nothing: thin grey lines vanish, so all rules are black */
              .border-y { border-top: 0.4mm dashed #000; border-bottom: 0.4mm dashed #000; }
              .border-t-2 { border-top: 0.6mm solid #000; }
              .border-border { border-color: #000; }
              .py-2 { padding-top: 2mm; padding-bottom: 2mm; }
              .py-3 { padding-top: 3mm; padding-bottom: 3mm; }
              .pt-3 { padding-top: 3mm; }
              .mt-1 { margin-top: 1mm; }
              .mt-2 { margin-top: 2mm; }
              .mt-3 { margin-top: 3mm; }
              .mt-4 { margin-top: 4mm; }
              .mt-5 { margin-top: 5mm; }
              .mb-5 { margin-bottom: 5mm; }
              table { width: 70mm; max-width: 70mm; table-layout: fixed; border-collapse: collapse; }
              th, td { box-sizing: border-box; padding: 1mm 0.2mm; text-align: left; overflow: hidden; word-break: break-word; }
              th:nth-child(1), td:nth-child(1) { width: 8%; }
              th:nth-child(2), td:nth-child(2) { width: 10%; }
              th:nth-child(3), td:nth-child(3) { width: 32%; }
              th:nth-child(4), td:nth-child(4) { width: 25%; }
              th:nth-child(5), td:nth-child(5) { width: 25%; }
              th:nth-child(2), td:nth-child(2), th:nth-child(4), td:nth-child(4), th:nth-child(5), td:nth-child(5) { text-align: right; }
              tr { border-bottom: 0.3mm dashed #000; }
              tbody tr:last-child { border-bottom: 0; }
              img { display: block; width: 11mm; height: 11mm; margin: 0 auto; }
            </style>
          </head>
          <body>${receiptMarkup.outerHTML}</body>
        </html>`;

      await printReceipt(html, receiptHeight);
    } catch (printError) {
      if (printError instanceof PrinterNotSelectedError) setShowPicker(true);
      setError(printError.message || "Could not print receipt.");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 print:bg-white print:static">
      <div ref={modalRef} className="bg-surface rounded-xl shadow-lg w-full max-w-sm print:shadow-none print:max-w-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border print:hidden">
          <p className="text-sm font-medium text-slate-900">Receipt</p>
          <button onClick={onClose} className="text-text-secondary hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        {/* Printable area */}
        <div className="receipt-print max-h-[70vh] overflow-y-auto px-6 py-5 text-sm" role="document">
          <div className="text-center mb-5">
            <img src={logo} alt="Exotic Collections logo" className="mx-auto h-16 w-16 rounded-full object-cover" />
            <p className="mt-3 font-semibold tracking-wide text-slate-900">EXOTIC COLLECTIONS</p>
            <p className="receipt-address mt-1 text-[10px] whitespace-nowrap text-text-secondary">{SHOP_ADDRESS}</p>
            <p className="text-xs text-text-secondary mt-1">Sales Receipt</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-y border-dashed border-border py-3 text-xs text-text-secondary">
            {receipt.transaction_id && (
              <>
                <span>Order No.</span>
                <span className="text-right text-slate-900">#{receipt.transaction_id}</span>
              </>
            )}
            <span>Date</span>
            <span className="text-right text-slate-900">{new Date(receipt.created_at).toLocaleDateString()}</span>
            <span>Time</span>
            <span className="text-right text-slate-900">{new Date(receipt.created_at).toLocaleTimeString()}</span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-2 pr-2 font-medium">No.</th>
                  <th className="py-2 px-2 text-right font-medium">Qty</th>
                  <th className="py-2 px-2 font-medium">Description</th>
                  <th className="py-2 px-2 text-right font-medium">Price</th>
                  <th className="py-2 pl-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {receipt.sales.flatMap((sale) => sale.sale_items).map((item, index) => (
                  <tr key={item.sale_item_id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-2 text-text-secondary">{index + 1}</td>
                    <td className="py-2 px-2 text-right text-slate-900">{item.quantity}</td>
                    <td className="py-2 px-2 text-slate-700">{item.products.name}</td>
                    <td className="py-2 px-2 text-right text-slate-700">{formatCurrency(item.price_at_sale)}</td>
                    <td className="py-2 pl-2 text-right text-slate-900">
                      {formatCurrency(item.price_at_sale * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {discountAmount > 0 && (
            <div className="border-t-2 border-slate-900 mt-4 pt-3 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span>{formatCurrency(Number(receipt.total_amount) + discountAmount)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>DISCOUNT</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between border-t-2 border-slate-900 mt-4 pt-3 font-semibold text-slate-900">
            <span>OVERALL TOTAL</span>
            <span>{formatCurrency(receipt.total_amount)}</span>
          </div>

          <div className="flex justify-between text-xs text-text-secondary mt-3">
            <span>Paid ({(Array.isArray(receipt.payments) ? receipt.payments[0] : receipt.payments)?.method})</span>
            <span>
              {formatCurrency(
                (Array.isArray(receipt.payments) ? receipt.payments[0] : receipt.payments)?.amount_tendered
              )}
            </span>
          </div>
          <div className="flex justify-between text-xs text-text-secondary">
            <span>Change</span>
            <span>
              {formatCurrency(
                (Array.isArray(receipt.payments) ? receipt.payments[0] : receipt.payments)?.change_given
              )}
            </span>
          </div>

          <p className="text-center text-xs text-text-muted mt-5">Thank you!</p>
        </div>

        <div className="px-5 pt-3 space-y-2 print:hidden">
          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
          {showPicker ? (
            <PrinterPicker
              role="receipt"
              onCancel={() => setShowPicker(false)}
              onSaved={(name) => {
                setPrinterName(name);
                setShowPicker(false);
                setError("");
              }}
            />
          ) : (
            <p className="text-xs text-text-secondary">
              Printer: <span className="text-slate-900">{printerName || "not set"}</span>{" "}
              <button type="button" onClick={() => setShowPicker(true)} className="text-accent underline">
                Change
              </button>
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-3 print:hidden">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm">
            Close
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="flex-1 py-2 rounded-lg bg-accent text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Printer size={16} /> {printing ? "Printing..." : "Print"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptModal;