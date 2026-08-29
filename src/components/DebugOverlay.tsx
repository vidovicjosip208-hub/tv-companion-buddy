import { useEffect, useState } from "react";
import { subscribeDebugLog } from "@/lib/debugOverlay";

// On-screen debug log for devices without an accessible browser console
// (real TVs). Deliberately rendered OUTSIDE ScaleToFit's scaled canvas, at
// raw viewport size, so it stays readable/full-size no matter what the app
// itself is doing.
const DebugOverlay = () => {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => subscribeDebugLog(setLines), []);

  if (lines.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "50vw",
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
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
};

export default DebugOverlay;
