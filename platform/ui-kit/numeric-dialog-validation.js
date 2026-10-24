/** Keep a dialog action disabled while one or more numeric fields are invalid. */
export function bindNumericDialogValidation({ inputs, button, error, min = -Infinity, max = Infinity, integer = false, message, isActive = () => true }) {
  const fields = (Array.isArray(inputs) ? inputs : [inputs]).filter(Boolean);
  if (!fields.length || !button) return () => true;

  const validate = () => {
    const invalid = fields.find(input => {
      if (!isActive(input)) return false;
      const raw = String(input.value ?? "").trim();
      if (!raw) return true;
      const value = Number(raw.replace(",", "."));
      return !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value));
    });
    const valid = !invalid;
    button.disabled = !valid;
    button.setAttribute("aria-disabled", valid ? "false" : "true");
    fields.forEach(input => {
      if (input === invalid) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    });
    if (error) {
      error.textContent = valid ? "" : (typeof message === "function" ? message(invalid) : String(message || ""));
      error.hidden = valid;
    }
    return valid;
  };

  fields.forEach(input => {
    input.addEventListener("input", validate);
    input.addEventListener("change", validate);
  });
  validate();
  return validate;
}
