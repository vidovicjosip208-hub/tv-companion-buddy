import { useEffect, useState, ReactNode } from "react";

// Design baseline — UI je dizajniran za 1920x1080 (laptop/TV).
// Ovaj wrapper renderira djecu na toj fiksnoj rezoluciji i skalira
// cijeli UI proporcionalno na bilo koji viewport (mobitel, tablet, TV, 4K),
// zadržavajući isti omjer i layout.
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

interface FitToScreenProps {
  children: ReactNode;
}

const FitToScreen = ({ children }: FitToScreenProps) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const sx = window.innerWidth / DESIGN_WIDTH;
      const sy = window.innerHeight / DESIGN_HEIGHT;
      setScale(Math.min(sx, sy));
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
        background: "hsl(var(--background))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FitToScreen;
