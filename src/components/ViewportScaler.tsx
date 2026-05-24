import { useEffect, useState, ReactNode } from "react";

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

interface ViewportScalerProps {
  children: ReactNode;
}

const ViewportScaler = ({ children }: ViewportScalerProps) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const sx = window.innerWidth / BASE_WIDTH;
      const sy = window.innerHeight / BASE_HEIGHT;
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

  const scaledW = BASE_WIDTH * scale;
  const scaledH = BASE_HEIGHT * scale;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "hsl(var(--background))",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: scaledW, height: scaledH, position: "relative" }}>
        <div
          style={{
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default ViewportScaler;
