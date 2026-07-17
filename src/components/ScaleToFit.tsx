import { useEffect, useState, type ReactNode } from "react";

const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;

interface ScaleToFitProps {
  children: ReactNode;
}

const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const sx = window.innerWidth / BASE_WIDTH;
      const sy = window.innerHeight / BASE_HEIGHT;
      // Uniformno skaliranje bez rezanja; za 16:9 viewport jednako je oboje.
      setScale(Math.min(sx, sy));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black flex items-center justify-center">
      <div
        style={{
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaleToFit;
