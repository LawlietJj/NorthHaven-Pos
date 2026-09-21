function formatMoneyDisplay(raw) {
  if (raw === "" || raw === null || raw === undefined) return "";
  const [intPart, decPart] = String(raw).split(".");
  const formattedInt = intPart === "" ? "0" : Number(intPart).toLocaleString();
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

function sanitizeMoneyInput(value) {
  let raw = value.replace(/[^0-9.]/g, "");
  const firstDot = raw.indexOf(".");
  if (firstDot !== -1) {
    raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, "");
    const [intPart, decPart = ""] = raw.split(".");
    raw = `${intPart}.${decPart.slice(0, 2)}`;
  }
  return raw;
}

function MoneyInput({ value, onChange, inputRef, ...rest }) {
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={formatMoneyDisplay(value)}
      onChange={(e) => onChange(sanitizeMoneyInput(e.target.value))}
      {...rest}
    />
  );
}

export default MoneyInput;
