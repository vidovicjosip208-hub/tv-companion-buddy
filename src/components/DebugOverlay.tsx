import { useEffect, useState } from "react";
import { subscribeDebugLog } from "@/lib/debugOverlay";

const DebugOverlay = () => {
  const [lines, setLines] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeDebugLog(setLines), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "0" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 480,
        maxHeight: "60vh",
        overflowY: "auto",
        background: "rgba(0,0,0,0.85)",
        color: "#0f0",
        fontFamily: "monospace",
        fontSize: 12,
        padding: 8,
        zIndex: 99999,
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
        lineHeight: 1.35,
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
};

export default DebugOverlay;
