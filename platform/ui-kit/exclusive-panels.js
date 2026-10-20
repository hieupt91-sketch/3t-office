let activePanel = null;

export function activateExclusivePanel(id, close) {
  if (typeof id !== "string" || !id || typeof close !== "function") return false;
  if (activePanel?.id === id) {
    activePanel.close = close;
    return true;
  }
  const previous = activePanel;
  activePanel = { id, close };
  previous?.close?.();
  return true;
}

export function deactivateExclusivePanel(id) {
  if (activePanel?.id !== id) return false;
  activePanel = null;
  return true;
}
