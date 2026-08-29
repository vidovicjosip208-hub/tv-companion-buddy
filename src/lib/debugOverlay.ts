type Listener = (lines: string[]) => void;

const MAX_LINES = 40;

let lines: string[] = [];

const listeners = new Set<Listener>();

export const debugLog = (...args: unknown[]) => {
  const time = new Date().toISOString().slice(11, 23);
  const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  lines = [...lines, `${time} ${msg}`].slice(-MAX_LINES);
  listeners.forEach((l) => l(lines));
};

export const subscribeDebugLog = (listener: Listener) => {
  listeners.add(listener);
  listener(lines);
  return () => listeners.delete(listener);
};
