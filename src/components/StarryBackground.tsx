import { useEffect, useRef } from "react";

const StarryBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let paused = false;

    // Pause heavy canvas animation whenever a <video> is actively playing
    // anywhere in the document. The starfield is invisible behind the player
    // and would otherwise compete with the video decoder for CPU/GPU.
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

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Stars
    const stars: { x: number; y: number; r: number; brightness: number; twinkleSpeed: number; isBright: boolean }[] =
      [];

    // Dense dust stars across full screen
    for (let i = 0; i < 500; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 0.8 + 0.2,
        brightness: Math.random() * 0.5 + 0.15,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        isBright: false,
      });
    }

    // Extra concentration in upper area and middle
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        r: Math.random() * 0.6 + 0.2,
        brightness: Math.random() * 0.4 + 0.1,
        twinkleSpeed: Math.random() * 0.018 + 0.005,
        isBright: false,
      });
    }

    // Bright cross-shaped stars spread everywhere
    for (let i = 0; i < 18; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 1,
        brightness: Math.random() * 0.5 + 0.5,
        twinkleSpeed: Math.random() * 0.01 + 0.003,
        isBright: true,
      });
    }

    // Wisp/smoke curves
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

    const wisps: Wisp[] = [];

    // Wide flowing wisps covering full screen height
    const wispConfigs = [
      // Top area wisps
      { startXRange: [0.0, 0.3], startYRange: [0.05, 0.25], curveDir: "right-down", count: 4 },
      // Middle area wisps (between cards)
      { startXRange: [0.0, 0.2], startYRange: [0.3, 0.55], curveDir: "right-up", count: 5 },
      // Lower area wisps
      { startXRange: [0.05, 0.35], startYRange: [0.55, 0.85], curveDir: "right-up", count: 4 },
      // Full diagonal wisps spanning entire screen
      { startXRange: [0.0, 0.15], startYRange: [0.7, 0.9], curveDir: "diagonal", count: 3 },
    ];

    for (const cfg of wispConfigs) {
      for (let w = 0; w < cfg.count; w++) {
        const points: WispPoint[] = [];
        const startX = canvas.width * (cfg.startXRange[0] + Math.random() * (cfg.startXRange[1] - cfg.startXRange[0]));
        const startY = canvas.height * (cfg.startYRange[0] + Math.random() * (cfg.startYRange[1] - cfg.startYRange[0]));
        const segments = 80;

        for (let i = 0; i < segments; i++) {
          const t = i / segments;
          let baseX: number, baseY: number;
          if (cfg.curveDir === "right-down") {
            baseX = startX + t * canvas.width * 0.8;
            baseY = startY + t * canvas.height * 0.2 + Math.sin(t * Math.PI * 2) * 50;
          } else if (cfg.curveDir === "right-up") {
            baseX = startX + t * canvas.width * 0.8;
            baseY = startY - t * canvas.height * 0.25 + Math.sin(t * Math.PI * 1.5) * 80;
          } else {
            // diagonal - full sweep bottom-left to top-right
            baseX = startX + t * canvas.width * 0.9;
            baseY = startY - t * canvas.height * 0.7 + Math.sin(t * Math.PI * 2) * 100;
          }
          points.push({ x: baseX, y: baseY });
        }

        wisps.push({
          points,
          alpha: 0.1 + Math.random() * 0.1,
          width: 0.8 + Math.random() * 3,
          speed: 0.15 + Math.random() * 0.35,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    // Extra thin accent wisps everywhere
    for (let w = 0; w < 8; w++) {
      const points: WispPoint[] = [];
      const startX = canvas.width * (Math.random() * 0.4);
      const startY = canvas.height * (0.1 + Math.random() * 0.7);
      const segments = 60;

      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const baseX = startX + t * canvas.width * 0.7;
        const baseY =
          startY + (Math.random() > 0.5 ? -1 : 1) * t * canvas.height * 0.2 + Math.sin(t * Math.PI * 2.5 + w) * 70;
        points.push({ x: baseX, y: baseY });
      }

      wisps.push({
        points,
        alpha: 0.06 + Math.random() * 0.08,
        width: 0.3 + Math.random() * 1,
        speed: 0.25 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const drawCrossStar = (x: number, y: number, size: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad1 = ctx.createLinearGradient(x - size, y, x + size, y);
      grad1.addColorStop(0, "transparent");
      grad1.addColorStop(0.5, "rgba(220, 230, 255, 1)");
      grad1.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.strokeStyle = grad1;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      const grad2 = ctx.createLinearGradient(x, y - size, x, y + size);
      grad2.addColorStop(0, "transparent");
      grad2.addColorStop(0.5, "rgba(220, 230, 255, 1)");
      grad2.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x, y + size);
      ctx.strokeStyle = grad2;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 0.4);
      glow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
      ctx.restore();
    };

    const drawWisp = (
      wisp: Wisp,
      phaseMultiplier: number,
      offsetX: number,
      offsetY: number,
      alphaMultiplier: number,
      widthOverride?: number,
    ) => {
      const phaseOffset = time * wisp.speed * phaseMultiplier + wisp.phase;
      ctx.beginPath();
      ctx.globalAlpha = wisp.alpha * alphaMultiplier;

      for (let i = 0; i < wisp.points.length; i++) {
        const p = wisp.points[i];
        const t = i / wisp.points.length;
        const ox = Math.sin(phaseOffset + t * 4) * 30 + Math.sin(phaseOffset * 0.7 + t * 2) * 20;
        const oy = Math.cos(phaseOffset * 0.8 + t * 3) * 15 + Math.sin(phaseOffset * 0.5 + t * 5) * 10;
        const px = p.x + ox + offsetX;
        const py = p.y + oy + offsetY;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          const prev = wisp.points[i - 1];
          const prevT = (i - 1) / wisp.points.length;
          const prevOx = Math.sin(phaseOffset + prevT * 4) * 30 + Math.sin(phaseOffset * 0.7 + prevT * 2) * 20;
          const prevOy = Math.cos(phaseOffset * 0.8 + prevT * 3) * 15 + Math.sin(phaseOffset * 0.5 + prevT * 5) * 10;
          const cpx = (prev.x + prevOx + offsetX + px) / 2;
          const cpy = (prev.y + prevOy + offsetY + py) / 2;
          ctx.quadraticCurveTo(prev.x + prevOx + offsetX, prev.y + prevOy + offsetY, cpx, cpy);
        }
      }

      ctx.strokeStyle = `rgba(180, 190, 220, ${wisp.alpha * alphaMultiplier * 3.5})`;
      ctx.lineWidth = widthOverride ?? wisp.width;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Stars
      for (const star of stars) {
        const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.x) * 0.3 + 0.7;
        const a = star.brightness * twinkle;

        if (star.isBright) {
          const size = star.r * (4 + Math.sin(time * star.twinkleSpeed * 40) * 2);
          drawCrossStar(star.x, star.y, size, a);
        } else {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 210, 230, ${a})`;
          ctx.fill();
        }
      }

      // Primary wisps
      for (const wisp of wisps) {
        drawWisp(wisp, 1, 0, 0, 1);
      }

      // Secondary offset wisps for more volume
      for (const wisp of wisps) {
        drawWisp(wisp, 1.2, 15, -20, 0.5, 0.5);
      }

      // Tertiary thin accent wisps
      for (const wisp of wisps) {
        drawWisp(wisp, 0.8, -10, 10, 0.3, 0.3);
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
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
