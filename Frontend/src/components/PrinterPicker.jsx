import { useEffect, useState } from "react";
import { PRINTER_ROLES, getSavedPrinter, listPrinters, savePrinter } from "../utils/qzPrinter";

// Inline picker shown inside the print modals. The printer already assigned to
// the other role is disabled, so a receipt can't be saved onto the label printer.
function PrinterPicker({ role, onSaved, onCancel }) {
  const otherRole = role === "receipt" ? "label" : "receipt";
  const otherPrinter = getSavedPrinter(otherRole);

  const [printers, setPrinters] = useState([]);
  const [selected, setSelected] = useState(getSavedPrinter(role));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    listPrinters()
      .then((available) => {
        if (!active) return;
        setPrinters(available);
        setSelected((current) => (available.includes(current) ? current : ""));
      })
      .catch((err) => {
        if (active) setError(err?.message || "Could not reach QZ Tray. Make sure it is running on this computer.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  function refreshPrinters() {
    setLoading(true);
    setError("");
    setRefreshKey((key) => key + 1);
  }

  function handleSave() {
    if (!selected) return;
    savePrinter(role, selected);
    onSaved?.(selected);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg p-3">
      <label className="block text-xs text-text-secondary">
        {PRINTER_ROLES[role].label} for this computer
      </label>

      {error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : (
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={loading}
          className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-accent"
        >
          <option value="">{loading ? "Looking for printers…" : "Select a printer"}</option>
          {printers.map((name) => {
            const usedByOther = name === otherPrinter;
            return (
              <option key={name} value={name} disabled={usedByOther}>
                {name}
                {usedByOther ? ` (used for ${PRINTER_ROLES[otherRole].label.toLowerCase()})` : ""}
              </option>
            );
          })}
        </select>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={refreshPrinters} className="px-3 py-1.5 rounded-lg border border-border text-xs">
          Refresh
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-border text-xs">
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!selected}
          className="ml-auto px-3 py-1.5 rounded-lg bg-accent text-white text-xs disabled:opacity-60"
        >
          Save printer
        </button>
      </div>
    </div>
  );
}

export default PrinterPicker;
