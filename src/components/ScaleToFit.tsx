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

  // Ako je ekran u portrait orijentaciji (npr. mobitel uspravno),
  // rotiramo TV layout za 90° tako da uvijek ispuni cijeli ekran
  // identično kao na slici (1920x1080 landscape).
  const isPortrait = viewport.height > viewport.width;
  const effW = isPortrait ? viewport.height : viewport.width;
  const effH = isPortrait ? viewport.width : viewport.height;

  const scale = Math.min(effW / DESIGN_WIDTH, effH / DESIGN_HEIGHT);
  const scaledW = DESIGN_WIDTH * scale;
  const scaledH = DESIGN_HEIGHT * scale;

  const rotation = isPortrait ? 90 : 0;
  // Nakon rotacije za 90° oko top-left, sadržaj zauzima [-scaledH, 0] x [0, scaledW].
  // Pomakni ga tako da bude centriran u stvarnom viewportu.
  const offsetX = isPortrait
    ? (viewport.width + scaledH) / 2
    : (viewport.width - scaledW) / 2;
  const offsetY = isPortrait
    ? (viewport.height - scaledW) / 2
    : (viewport.height - scaledH) / 2;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div
        className="scale-fill-canvas"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg) scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaleToFit;
