import { useEffect, useRef } from "react";

/**
 * Ambient starfield.
 *
 * Performance notes (TV boxes have very weak GPUs/CPUs):
 * - the canvas backing store is rendered at a reduced resolution and upscaled by CSS
 * - the ~700 dust stars are rasterised ONCE into an offscreen layer and blitted each frame
 * - only the handful of bright cross stars are redrawn per frame
 * - the wisps are drawn in a single pass and the loop is throttled to ~24 fps
 */
const RENDER_SCALE = 0.4;
const FRAME_INTERVAL = 1000 / 12;

const StarryBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId: number;
    let paused = false;

    // Pause the animation whenever a <video> is actively playing anywhere in
    // the document — the starfield is invisible behind the player and would
    // otherwise compete with the video decoder for CPU/GPU.
    const checkVideoActive = () => {
      const videos = document.querySelectorAll("video");
      for (const v of Array.from(videos)) {
        if (!v.paused && !v.ended && v.readyState > 2) return true;
      }
      return false;
    };

    const updatePauseState = () => {
      paused = checkVideoActive();
    };

    const pollId = window.setInterval(updatePauseState, 1000);
    document.addEventListener("play", updatePauseState, true);
    document.addEventListener("pause", updatePauseState, true);
    document.addEventListener("ended", updatePauseState, true);

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
          // bias part of the field towards the upper half like before
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

    const resize = () => {
      canvas.width = Math.max(1, Math.round(window.innerWidth * RENDER_SCALE));
      canvas.height = Math.max(1, Math.round(window.innerHeight * RENDER_SCALE));
      buildScene();
    };
    resize();

    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 200);
    };
    window.addEventListener("resize", onResize);

    let time = 0;

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
          // smooth the polyline with midpoint quadratics (cheap)
          ctx.quadraticCurveTo(prevX, prevY, (prevX + px) / 2, (prevY + py) / 2);
        }
        prevX = px;
        prevY = py;
      }

      ctx.strokeStyle = `rgba(180, 190, 220, ${wisp.alpha * 2})`;
      ctx.lineWidth = wisp.width;
      ctx.stroke();
    };


    let last = 0;
    const animate = (now: number) => {
      animationId = requestAnimationFrame(animate);
      if (paused) return;
      if (now - last < FRAME_INTERVAL) return;
      last = now;

      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (dustLayer) ctx.drawImage(dustLayer, 0, 0);

      for (const star of brightStars) {
        const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.x) * 0.3 + 0.7;
        const size = star.r * (4 + Math.sin(time * star.twinkleSpeed * 40) * 2);
        drawCrossStar(star.x, star.y, size, star.brightness * twinkle);
      }

      for (const wisp of wisps) drawWisp(wisp);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.clearInterval(pollId);
      document.removeEventListener("play", updatePauseState, true);
      document.removeEventListener("pause", updatePauseState, true);
      document.removeEventListener("ended", updatePauseState, true);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-background" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

export default StarryBackground;
