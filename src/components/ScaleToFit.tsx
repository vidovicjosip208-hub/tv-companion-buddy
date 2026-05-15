import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

const DESIGN_WIDTH = 1366;

type FitState = {
  enabled: boolean;
  scale: number;
  stageHeight: number;
};

const getViewportSize = () => {
  const visualViewport = window.visualViewport;

  return {
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight,
  };
};

const getFitState = (): FitState => {
  if (typeof window === "undefined") {
    return { enabled: false, scale: 1, stageHeight: 0 };
  }

  const { width, height } = getViewportSize();
  const isTouchViewport = window.matchMedia("(hover: none), (pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const enabled = isTouchViewport && width < DESIGN_WIDTH;
  const scale = enabled ? width / DESIGN_WIDTH : 1;

  return {
    enabled,
    scale,
    stageHeight: enabled ? height / scale : height,
  };
};

type ScaleToFitProps = {
  children: ReactNode;
};

const ScaleToFit = ({ children }: ScaleToFitProps) => {
  const [fitState, setFitState] = useState<FitState>(() => getFitState());

  useEffect(() => {
    const updateFitState = () => setFitState(getFitState());

    updateFitState();
    window.addEventListener("resize", updateFitState);
    window.addEventListener("orientationchange", updateFitState);
    window.visualViewport?.addEventListener("resize", updateFitState);
    window.visualViewport?.addEventListener("scroll", updateFitState);

    return () => {
      window.removeEventListener("resize", updateFitState);
      window.removeEventListener("orientationchange", updateFitState);
      window.visualViewport?.removeEventListener("resize", updateFitState);
      window.visualViewport?.removeEventListener("scroll", updateFitState);
    };
  }, []);

  if (!fitState.enabled) {
    return <>{children}</>;
  }

  return (
    <div className="tv-scale-viewport">
      <div
        className="tv-scale-stage"
        style={
          {
            "--tv-stage-width": `${DESIGN_WIDTH}px`,
            "--tv-stage-height": `${fitState.stageHeight}px`,
            transform: `scale(${fitState.scale})`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
};

export default ScaleToFit;