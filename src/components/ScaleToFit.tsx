import { useEffect, useState, type ReactNode } from "react";

// Exact reference canvas supplied by the user. It is deliberately stretched
// to the available panel so the whole composition is always visible edge to
// edge, regardless of the browser-reported aspect ratio.
const BASE_WIDTH = 1624;
const BASE_HEIGHT = 768;

interface ScaleToFitProps {
  children: ReactNode;
}

const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const [scale, setScale] = useState({ x: 1, y: 1 });

  useEffect(() => {
    const update = () => {
      setScale({
        x: window.innerWidth / BASE_WIDTH,
        y: window.innerHeight / BASE_HEIGHT,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div
        className="scale-to-fit-canvas"
        style={{
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          transform: `scale(${scale.x}, ${scale.y})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaleToFit;
