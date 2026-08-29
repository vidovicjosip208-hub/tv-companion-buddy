type PerfSnapshot = {
  fps: number;
  longTasks: { duration: number; time: number }[];
  jsHeapMB: number | null;
  worstFrameMs: number;
};

type Listener = (snap: PerfSnapshot) => void;

const listeners = new Set<Listener>();

let longTaskLog: { duration: number; time: number }[] = [];

const MAX_LONGTASKS = 20;

// Long Tasks API — flags any main-thread block over 50ms (the threshold the
// spec itself uses). These are the actual freezes a user perceives as
// jank/lag: layout thrashing, big JS computations, GC pauses, etc.
if ("PerformanceObserver" in window) {
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTaskLog = [
          ...longTaskLog,
          { duration: Math.round(entry.duration), time: Math.round(entry.startTime) },
        ].slice(-MAX_LONGTASKS);
      }
    });
    po.observe({ type: "longtask", buffered: true });
  } catch {
    // longtask entry type not supported on this platform
  }
}

let running = false;
let frameCount = 0;
let lastFpsTime = performance.now();
let worstFrameMs = 0;
let lastFrameTime = performance.now();

const tick = (t: number) => {
  const delta = t - lastFrameTime;
  lastFrameTime = t;
  if (delta > worstFrameMs) worstFrameMs = delta;
  frameCount++;

  if (t - lastFpsTime >= 1000) {
    const fps = Math.round((frameCount * 1000) / (t - lastFpsTime));
    frameCount = 0;
    lastFpsTime = t;
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    const jsHeapMB = mem ? Math.round(mem.usedJSHeapSize / 1048576) : null;
    listeners.forEach((l) =>
      l({ fps, longTasks: longTaskLog, jsHeapMB, worstFrameMs: Math.round(worstFrameMs) }),
    );
    worstFrameMs = 0;
  }

  if (running) requestAnimationFrame(tick);
};

export const startPerfMonitor = (listener: Listener) => {
  listeners.add(listener);
  if (!running) {
    running = true;
    lastFpsTime = performance.now();
    lastFrameTime = performance.now();
    requestAnimationFrame(tick);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) running = false;
  };
};
