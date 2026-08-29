import { useEffect, useState } from "react";
import { startPerfMonitor } from "@/lib/perfMonitor";

// On-screen performance HUD: FPS, worst frame time in the last second, main
// thread long tasks (>50ms blocks — actual perceived jank), and JS heap size
// where the platform exposes it (Chromium-based WebViews only). Rendered
// outside ScaleToFit so it stays full-size regardless of app state.
const PerfOverlay = () => {
  const [fps, setFps] = useState(0);
  const [worstFrameMs, setWorstFrameMs] = useState(0);
  const [longTasks, setLongTasks] = useState<{ duration: number; time: number }[]>([]);
  const [jsHeapMB, setJsHeapMB] = useState<number | null>(null);

  useEffect(
    () =>
      startPerfMonitor((snap) => {
        setFps(snap.fps);
        setWorstFrameMs(snap.worstFrameMs);
        setLongTasks(snap.longTasks);
        setJsHeapMB(snap.jsHeapMB);
      }),
    [],
  );

  const fpsColor = fps >= 50 ? "#4ade80" : fps >= 30 ? "#facc15" : "#f87171";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: "36vw",
        maxHeight: "50vh",
        overflowY: "auto",
        background: "rgba(0,0,0,0.8)",
        color: "#0f0",
        fontFamily: "monospace",
        fontSize: 14,
        padding: 8,
        zIndex: 99999,
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
        lineHeight: 1.4,
      }}
    >
      <div style={{ color: fpsColor }}>FPS: {fps}</div>
      <div>Worst frame: {worstFrameMs}ms</div>
      <div>JS heap: {jsHeapMB !== null ? `${jsHeapMB} MB` : "n/a"}</div>
      <div>Long tasks ({">"}50ms):</div>
      {longTasks.length === 0 ? (
        <div>none yet</div>
      ) : (
        longTasks
          .slice(-10)
          .reverse()
          .map((t, i) => (
            <div key={i}>
              {t.duration}ms @ {t.time}ms
            </div>
          ))
      )}
    </div>
  );
};

export default PerfOverlay;
