export const DESIGN_VIEWPORT_WIDTH = 1920;
export const DESIGN_VIEWPORT_HEIGHT = 1080;

export const isViewportScaled = () =>
  typeof document !== "undefined" && document.documentElement.dataset.viewportScaler === "active";

export const getLayoutViewportWidth = () => {
  if (isViewportScaled()) return DESIGN_VIEWPORT_WIDTH;
  return typeof window !== "undefined" ? window.innerWidth : DESIGN_VIEWPORT_WIDTH;
};