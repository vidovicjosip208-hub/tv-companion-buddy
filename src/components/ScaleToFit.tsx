import { useEffect, useState, ReactNode } from "react";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

/**
 * Skalira fiksni 1920x1080 "canvas" da stane u bilo koju veličinu ekrana,
 * čuvajući aspect ratio i relativne pozicije svih elemenata (TV/kiosk pristup).
 */
const ScaleToFit = ({ children }: { children: ReactNode }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
      setScale(s);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="scale-canvas"
        style={{
          width: `${DESIGN_W}px`,
          height: `${DESIGN_H}px`,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaleToFit;
