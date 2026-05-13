import { ReactNode, useEffect, useState } from "react";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const getViewportSize = () => ({
  width: typeof window === "undefined" ? DESIGN_WIDTH : window.innerWidth,
  height: typeof window === "undefined" ? DESIGN_HEIGHT : window.innerHeight,
});

/**
 * TV viewport: 1920x1080 layout se skalira prema širini ekrana tako da
 * uvijek popuni cijelu širinu viewporta (identično kao na slici).
 * Visina se centrira — na portrait mobitelu ostaju gornje/donje crne trake.
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

  // Skaliraj tako da TV layout uvijek POPUNI cijeli viewport (cover),
  // bez crnih traka. Na portrait ekranima sadržaj se obreže s lijeva/desna.
  const scale = Math.max(viewport.width / DESIGN_WIDTH, viewport.height / DESIGN_HEIGHT);
  const offsetX = (viewport.width - DESIGN_WIDTH * scale) / 2;
  const offsetY = (viewport.height - DESIGN_HEIGHT * scale) / 2;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div
        className="scale-fill-canvas"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `translate(0px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaleToFit;
