import { useEffect, useRef, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { DESIGN_VIEWPORT_HEIGHT, DESIGN_VIEWPORT_WIDTH } from "@/lib/viewport";

// Above this viewport width we render the app at its native size (laptop/desktop/TV).
// Below it (tablets/phones), we scale the whole 1920x1080 canvas to fit so nothing is cut off.
const NATIVE_BREAKPOINT = 1280;

interface Props {
  children: ReactNode;
}

const ViewportScaler = ({ children }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeBody, setIframeBody] = useState<HTMLElement | null>(null);
  const [dims, setDims] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : DESIGN_VIEWPORT_WIDTH,
    h: typeof window !== "undefined" ? window.innerHeight : DESIGN_VIEWPORT_HEIGHT,
  }));

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const syncIframeDocument = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    doc.documentElement.className = document.documentElement.className;
    doc.documentElement.dataset.viewportScaler = "active";
    doc.documentElement.style.colorScheme = "dark";
    doc.body.className = document.body.className;
    Object.assign(doc.body.style, {
      margin: "0",
      width: `${DESIGN_VIEWPORT_WIDTH}px`,
      height: `${DESIGN_VIEWPORT_HEIGHT}px`,
      overflow: "hidden",
      background: "hsl(var(--background))",
    });

    doc.head.innerHTML = document.head.innerHTML;
    setIframeBody(doc.body);
  };

  useEffect(() => {
    if (dims.w >= NATIVE_BREAKPOINT) return;

    syncIframeDocument();
    const observer = new MutationObserver(syncIframeDocument);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });

    const iframeWindow = iframeRef.current?.contentWindow;
    const bridgeKeyEvent = (event: KeyboardEvent) => {
      const bridgedEvent = new KeyboardEvent(event.type, {
        key: event.key,
        code: event.code,
        location: event.location,
        repeat: event.repeat,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        bubbles: true,
        cancelable: true,
      });
      if (!window.dispatchEvent(bridgedEvent)) event.preventDefault();
    };

    iframeWindow?.addEventListener("keydown", bridgeKeyEvent);
    iframeWindow?.addEventListener("keyup", bridgeKeyEvent);

    return () => {
      observer.disconnect();
      iframeWindow?.removeEventListener("keydown", bridgeKeyEvent);
      iframeWindow?.removeEventListener("keyup", bridgeKeyEvent);
    };
  }, [dims.w]);

  // Laptop / desktop / TV: render natively, no changes.
  if (dims.w >= NATIVE_BREAKPOINT) {
    return <>{children}</>;
  }

  // Smaller screens: scale the full 1920x1080 design uniformly to fit, centered (letterboxed).
  const scale = Math.min(dims.w / DESIGN_VIEWPORT_WIDTH, dims.h / DESIGN_VIEWPORT_HEIGHT);
  const scaledW = DESIGN_VIEWPORT_WIDTH * scale;
  const scaledH = DESIGN_VIEWPORT_HEIGHT * scale;
  const offsetX = (dims.w - scaledW) / 2;
  const offsetY = (dims.h - scaledH) / 2;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "hsl(var(--background))",
        overflow: "hidden",
      }}
    >
      <iframe
        ref={iframeRef}
        title="App preview"
        onLoad={syncIframeDocument}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: DESIGN_VIEWPORT_WIDTH,
          height: DESIGN_VIEWPORT_HEIGHT,
          border: 0,
          transformOrigin: "top left",
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
        }}
      />
      {iframeBody ? createPortal(children, iframeBody) : null}
    </div>
  );
};

export default ViewportScaler;
