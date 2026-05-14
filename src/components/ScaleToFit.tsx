import { ReactNode, useEffect, useState } from "react";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const getViewportSize = () => ({
  width: typeof window === "undefined" ? DESIGN_WIDTH : window.innerWidth,
  height: typeof window === "undefined" ? DESIGN_HEIGHT : window.innerHeight,
});

/**
 * TV viewport: isti 1920x1080 raspored se rastegne na cijeli dostupni ekran,
 * bez letterbox crnih traka i bez rezanja sadržaja na mobitelu.
 */
const ScaleToFit = ({ children }: { children: ReactNode }) => {
  const [viewport, setViewport] = useState(getViewportSize);

  useEffect(() => {
    const update = () => setViewport(getViewportSize());
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  const scale = Math.min(viewport.width / DESIGN_WIDTH, viewport.height / DESIGN_HEIGHT);
  const offsetX = (viewport.width - DESIGN_WIDTH * scale) / 2;
  const offsetY = (viewport.height - DESIGN_HEIGHT * scale) / 2;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div
        className="scale-fill-canvas"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaleToFit;
