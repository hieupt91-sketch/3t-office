/** Load an optional app feature without hiding the editor and announce first-use delay. */
export async function withLazyFeatureProgress(appName, featureName, load) {
  const dispatch = (eventName, detail = {}) => {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent(eventName, { detail: { appName, featureName, ...detail } }));
  };
  dispatch("vno:lazy-feature-start");
  try {
    return await load();
  } catch (error) {
    dispatch("vno:lazy-feature-error", { message: String(error?.message || error) });
    throw error;
  } finally {
    dispatch("vno:lazy-feature-complete");
  }
}
