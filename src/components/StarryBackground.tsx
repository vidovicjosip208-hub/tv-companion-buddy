import { memo, useEffect, useRef } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/canvas";

/**
 * Ambient starfield.
 *
 * Performance notes (TV boxes have very weak GPUs/CPUs):
 * - the canvas backing store is rendered at a reduced resolution and upscaled by CSS
 * - the dust, bright stars and wisps are rasterised once into a static frame
 * - no continuous animation loop competes with navigation or video decoding
 */
const RENDER_SCALE = 0.4;

/**
 * Rasterised starfield, cached across mounts/pages so navigating never pays the
 * cost of regenerating dust, stars and wisps again.
 */
let sceneCache: { w: number; h: number; canvas: HTMLCanvasElement } | null = null;

const StarryBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    interface BrightStar {
      x: number;
      y: number;
      r: number;
      brightness: number;
      twinkleSpeed: number;
    }
    interface WispPoint {
      x: number;
      y: number;
    }
    interface Wisp {
      points: WispPoint[];
      alpha: number;
      width: number;
      speed: number;
      phase: number;
    }

    let brightStars: BrightStar[] = [];
    let wisps: Wisp[] = [];
    let dustLayer: HTMLCanvasElement | null = null;

    const buildScene = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) return;

      // --- static dust layer (drawn once) ---
      const layer = document.createElement("canvas");
      layer.width = w;
      layer.height = h;
      const lctx = layer.getContext("2d");
      if (lctx) {
        const dustCount = Math.round((w * h) / 2200);
        for (let i = 0; i < dustCount; i++) {
          const y = i % 3 === 0 ? Math.random() * h * 0.5 : Math.random() * h;
          const r = Math.random() * 0.8 + 0.2;
          const a = Math.random() * 0.5 + 0.15;
          lctx.beginPath();
          lctx.arc(Math.random() * w, y, r, 0, Math.PI * 2);
          lctx.fillStyle = `rgba(200, 210, 230, ${a})`;
          lctx.fill();
        }
      }
      dustLayer = layer;

      // --- animated bright stars ---
      brightStars = [];
      for (let i = 0; i < 14; i++) {
        brightStars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.8 + 1,
          brightness: Math.random() * 0.5 + 0.5,
          twinkleSpeed: Math.random() * 0.01 + 0.003,
        });
      }

      // --- wisps ---
      wisps = [];
      const wispConfigs = [
        { startXRange: [0.0, 0.3], startYRange: [0.05, 0.25], curveDir: "right-down", count: 3 },
        { startXRange: [0.0, 0.2], startYRange: [0.3, 0.55], curveDir: "right-up", count: 3 },
        { startXRange: [0.05, 0.35], startYRange: [0.55, 0.85], curveDir: "right-up", count: 3 },
        { startXRange: [0.0, 0.15], startYRange: [0.7, 0.9], curveDir: "diagonal", count: 2 },
      ];

      for (const cfg of wispConfigs) {
        for (let k = 0; k < cfg.count; k++) {
          const points: WispPoint[] = [];
          const startX = w * (cfg.startXRange[0] + Math.random() * (cfg.startXRange[1] - cfg.startXRange[0]));
          const startY = h * (cfg.startYRange[0] + Math.random() * (cfg.startYRange[1] - cfg.startYRange[0]));
          const segments = 28;

          for (let i = 0; i < segments; i++) {
            const t = i / segments;
            let baseX: number;
            let baseY: number;
            if (cfg.curveDir === "right-down") {
              baseX = startX + t * w * 0.8;
              baseY = startY + t * h * 0.2 + Math.sin(t * Math.PI * 2) * 50;
            } else if (cfg.curveDir === "right-up") {
              baseX = startX + t * w * 0.8;
              baseY = startY - t * h * 0.25 + Math.sin(t * Math.PI * 1.5) * 80;
            } else {
              baseX = startX + t * w * 0.9;
              baseY = startY - t * h * 0.7 + Math.sin(t * Math.PI * 2) * 100;
            }
            points.push({ x: baseX, y: baseY });
          }

          wisps.push({
            points,
            alpha: 0.05 + Math.random() * 0.05,
            width: 0.8 + Math.random() * 3,
            speed: 0.15 + Math.random() * 0.35,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const time = 0;

    const drawCrossStar = (x: number, y: number, size: number, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(220, 230, 255, 0.9)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.moveTo(x, y - size);
      ctx.lineTo(x, y + size);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, size * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const drawWisp = (wisp: Wisp) => {
      const phaseOffset = time * wisp.speed + wisp.phase;
      const pts = wisp.points;
      ctx.beginPath();

      let prevX = 0;
      let prevY = 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const t = i / pts.length;
        const px = p.x + Math.sin(phaseOffset + t * 4) * 30;
        const py = p.y + Math.cos(phaseOffset * 0.8 + t * 3) * 15;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.quadraticCurveTo(prevX, prevY, (prevX + px) / 2, (prevY + py) / 2);
        }
        prevX = px;
        prevY = py;
      }

      ctx.strokeStyle = `rgba(180, 190, 220, ${wisp.alpha * 2})`;
      ctx.lineWidth = wisp.width;
      ctx.stroke();
    };

    const renderScene = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (dustLayer) ctx.drawImage(dustLayer, 0, 0);

      for (const star of brightStars) {
        const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.x) * 0.3 + 0.7;
        const size = star.r * (4 + Math.sin(time * star.twinkleSpeed * 40) * 2);
        drawCrossStar(star.x, star.y, size, star.brightness * twinkle);
      }

      for (const wisp of wisps) drawWisp(wisp);
    };

    const resize = () => {
      // The canvas lives inside the fixed reference canvas, so it must be
      // sized against that — not the device viewport.
      const host = canvas.parentElement;
      const w = host?.clientWidth || CANVAS_WIDTH;
      const h = host?.clientHeight || CANVAS_HEIGHT;
      const cw = Math.max(1, Math.round(w * RENDER_SCALE));
      const ch = Math.max(1, Math.round(h * RENDER_SCALE));

      // Re-rasterising the whole starfield is one of the most expensive things
      // this app does on a weak TV SoC. The scene is deterministic per size, so
      // it is cached at module scope: remounting a page (or a stray
      // resize/fullscreenchange event that reports the same size) only blits
      // the cached bitmap instead of drawing thousands of paths again.
      if (canvas.width === cw && canvas.height === ch && sceneCache && sceneCache.w === cw && sceneCache.h === ch) {
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(sceneCache.canvas, 0, 0);
        return;
      }

      canvas.width = cw;
      canvas.height = ch;

      if (sceneCache && sceneCache.w === cw && sceneCache.h === ch) {
        ctx.drawImage(sceneCache.canvas, 0, 0);
        return;
      }

      buildScene();
      renderScene();

      const snapshot = document.createElement("canvas");
      snapshot.width = cw;
      snapshot.height = ch;
      snapshot.getContext("2d")?.drawImage(canvas, 0, 0);
      sceneCache = { w: cw, h: ch, canvas: snapshot };

      // The generated geometry is no longer needed once it is rasterised.
      dustLayer = null;
      brightStars = [];
      wisps = [];
    };
    resize();

    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
      // Own compositing layer + paint containment: overlays (exit popup, player
      // teardown) then composite on the GPU instead of forcing the whole
      // upscaled 4K layer — starfield included — to repaint.
      style={{ transform: "translateZ(0)", contain: "strict" }}
    >
      <div className="absolute inset-0 bg-background" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};


export default memo(StarryBackground);
