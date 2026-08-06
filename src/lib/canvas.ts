// The app is a 10-foot TV interface composed on ONE fixed reference canvas.
// Every layout calculation must be done against these numbers — never against
// window.innerWidth/innerHeight, because ScaleToFit maps this canvas onto the
// physical screen afterwards. Mixing the two makes the composition look
// too small on some TVs and too large on others.
export const CANVAS_WIDTH = 1624;
export const CANVAS_HEIGHT = 768;
