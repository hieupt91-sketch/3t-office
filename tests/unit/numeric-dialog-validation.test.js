import assert from "node:assert/strict";
import { bindNumericDialogValidation } from "../../platform/ui-kit/numeric-dialog-validation.js";

class MockField {
  constructor(value = "") { this.value = value; this.listeners = new Map(); this.attributes = new Map(); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  dispatch(type) { this.listeners.get(type)?.(); }
}

export function runNumericDialogValidationTests() {
  const field = new MockField("");
  const button = { disabled: false, attributes: new Map(), setAttribute(name, value) { this.attributes.set(name, value); } };
  const error = { textContent: "", hidden: false };
  const validate = bindNumericDialogValidation({
    inputs: field,
    button,
    error,
    min: 10,
    max: 500,
    integer: true,
    message: () => "Nhập số từ 10 đến 500."
  });

  assert.equal(button.disabled, true, "blank value disables the action initially");
  assert.equal(error.textContent, "Nhập số từ 10 đến 500.");
  field.value = "abc";
  field.dispatch("input");
  assert.equal(button.disabled, true, "non-numeric input keeps the action disabled");
  assert.equal(field.attributes.get("aria-invalid"), "true");
  field.value = "501";
  field.dispatch("input");
  assert.equal(button.disabled, true, "out-of-range input keeps the action disabled");
  field.value = "100";
  field.dispatch("input");
  assert.equal(validate(), true);
  assert.equal(button.disabled, false, "valid input enables the action");
  assert.equal(button.attributes.get("aria-disabled"), "false");
  assert.equal(error.textContent, "");
  return [{ name: "Numeric dialog validation disables invalid values and restores valid values", pass: true }];
}
