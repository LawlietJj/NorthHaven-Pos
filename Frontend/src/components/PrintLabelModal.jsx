import { useState } from "react";
import Barcode from "react-barcode";
import { Printer, X } from "lucide-react";
import { printBarcodeLabels } from "../utils/qzPrinter";
import { useModalKeyboard } from "../utils/useModalKeyboard";

function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

function PrintLabelModal({ product, onClose, onPrinted }) {
  const [copies, setCopies] = useState(product.quantity || 1);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useModalKeyboard(onClose);

  async function handlePrint() {
    setError("");
    setPrinting(true);
    try {
      const labelArea = document.querySelector(".label-print-area");
      const label = labelArea?.querySelector(".label-page");
      if (!labelArea || !label) {
        throw new Error("The barcode label preview is not ready yet.");
      }
      // QZ's "pixel"/HTML renderer doesn't paginate CSS page-breaks — it
      // rasterizes the whole document as one image and fits it to a single
      // declared page, so a multi-page document here just shrinks every
      // label into one. One label per document; repetition happens in
      // qzPrinter as separate raster entries in the same print job instead.
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              @page { size: 50mm 40mm; margin: 0; }
              html, body { margin: 0; padding: 0; width: 50mm; height: 40mm; overflow: hidden; }
              /* table/table-cell instead of flexbox for vertical centering — the
                 print renderer wasn't honoring flex's justify-content/align-items,
                 leaving content pinned to the top. table-cell + vertical-align is
                 the old, near-universally-supported way to center vertically. */
              body { display: table; width: 50mm; height: 40mm; }
              .label-page {
                display: table-cell;
                vertical-align: middle;
                width: 50mm;
                height: 40mm;
                box-sizing: border-box;
                padding: 2mm;
                text-align: center;
                overflow: hidden;
              }
              .label-name {
                width: 100%;
                font: 8pt Arial, sans-serif;
                margin: 0 0 1mm;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .label-price { font: 600 9pt Arial, sans-serif; margin: 1mm 0 0; }
              .label-page svg { display: block; width: 36mm; max-width: 36mm; max-height: 14mm; height: auto; margin: 0 auto; }
            </style>
          </head>
          <body>${label.outerHTML}</body>
        </html>`;

      await printBarcodeLabels(html, copies);
      onPrinted?.();
    } catch (printError) {
      setError(printError.message || "Could not print barcode labels.");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 print:bg-white print:static">
      <div ref={modalRef} className="bg-surface rounded-xl shadow-lg w-full max-w-sm print:hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-sm font-medium text-slate-900">Print Barcode Label</p>
          <button onClick={onClose} className="text-text-secondary hover:text-slate-900">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          <div className="flex justify-center py-4 bg-bg rounded-lg">
            <div className="text-center">
              <p className="text-xs font-medium text-slate-900 mb-1">{product.name}</p>
              <Barcode value={product.barcode} height={40} width={1.4} fontSize={12} />
              <p className="text-xs text-slate-900 mt-1">{formatCurrency(product.selling_price)}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Number of labels to print</label>
            <input
              type="number"
              min={1}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
              className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm">
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="flex-1 py-2 rounded-lg bg-accent text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Printer size={16} /> {printing ? "Printing…" : `Print ${copies > 1 ? `${copies} Labels` : "Label"}`}
          </button>
        </div>
      </div>

      {/* Print-only area — one label per physical sticker, repeated `copies` times */}
      <div className="label-print-area">
        {Array.from({ length: copies }).map((_, i) => (
          <div key={i} className="label-page">
            <p className="label-name">{product.name}</p>
            <Barcode value={product.barcode} height={35} width={1.2} fontSize={10} margin={0} />
            <p className="label-price">{formatCurrency(product.selling_price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PrintLabelModal;