import { useState } from "react";
import { Printer, X } from "lucide-react";
import logo from "../assets/logo.jpeg";
import { printReceipt } from "../utils/qzPrinter";
import { useModalKeyboard } from "../utils/useModalKeyboard";

function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

async function imageToDataUrl(source) {
  const response = await fetch(source);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function ReceiptModal({ receipt, onClose }) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useModalKeyboard(onClose);

  async function handlePrint() {
    setError("");
    setPrinting(true);
    try {
      const receiptElement = document.querySelector(".receipt-print");
      if (!receiptElement) throw new Error("The receipt preview is not ready yet.");

      const receiptMarkup = receiptElement.cloneNode(true);
      const logoDataUrl = await imageToDataUrl(logo);
      const itemCount = receipt.sales.reduce((count, sale) => count + sale.sale_items.length, 0);
      const receiptHeight = Math.max(200, 90 + itemCount * 8);
      receiptMarkup.querySelectorAll("img").forEach((image) => {
        image.src = logoDataUrl;
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
              .border-y { border-top: 0.2mm dashed #999; border-bottom: 0.2mm dashed #999; }
              .border-t-2 { border-top: 0.5mm solid #111; }
              .border-border { border-color: #ccc; }
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
              tr { border-bottom: 0.2mm solid #ccc; }
              img { display: block; width: 11mm; height: 11mm; margin: 0 auto; object-fit: cover; }
            </style>
          </head>
          <body>${receiptMarkup.outerHTML}</body>
        </html>`;

      await printReceipt(html, receiptHeight);
    } catch (printError) {
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

        {error && (
          <p className="px-5 pt-3 text-xs text-red-600 print:hidden" role="alert">
            {error}
          </p>
        )}

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