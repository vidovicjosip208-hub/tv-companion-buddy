import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/max-ovizija-logo.png";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/canvas";

interface SplashTileData {
  video_url: string;
  poster_url: string | null;
}

const TILE_SIZE = { w: 11, h: 11 };
const TILES = [
  { left: 44.5, top: 7.5, ...TILE_SIZE },    // 12 o'clock
  { left: 56.5, top: 12.4, ...TILE_SIZE },   // 1
  { left: 65.2, top: 25.8, ...TILE_SIZE },   // 2
  { left: 68.5, top: 44.5, ...TILE_SIZE },   // 3
  { left: 65.2, top: 63.2, ...TILE_SIZE },   // 4
  { left: 56.5, top: 76.6, ...TILE_SIZE },   // 5
  { left: 44.5, top: 81.5, ...TILE_SIZE },   // 6
  { left: 32.5, top: 76.6, ...TILE_SIZE },   // 7
  { left: 23.8, top: 63.2, ...TILE_SIZE },   // 8
  { left: 20.5, top: 44.5, ...TILE_SIZE },   // 9
  { left: 23.8, top: 25.8, ...TILE_SIZE },   // 10
  { left: 32.5, top: 12.4, ...TILE_SIZE },   // 11
];

const useSplashContent = () =>
  useQuery<SplashTileData[]>({
    queryKey: ["loading_thumbnails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loading_thumbnails")
        .select("video_url, poster_url, is_active, position_order")
        .eq("is_active", true)
        .order("position_order", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((r) => !!r.video_url)
        .map((r) => ({ video_url: r.video_url as string, poster_url: r.poster_url ?? null }));
    },
    staleTime: Infinity,
  });

interface SplashIntroProps {
  duration?: number;
  /** Called once the intro is fully finished so the parent can unmount it. */
  onFinished?: () => void;
}

const SplashIntro = ({ duration = 11000, onFinished }: SplashIntroProps) => {
  const [visible, setVisible] = useState(true);
  const [revealed, setRevealed] = useState(true);
  const [framesReady, setFramesReady] = useState(false);
  const [loadedSourceCount, setLoadedSourceCount] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState({ x: 1, y: 1, left: 0, top: 0 });
  const loadedSources = useRef(new Set<string>());
  const sourceVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const animationFrame = useRef<number | null>(null);
  // Holds the teardown function created inside the delayed setup below, so the
  // effect's cleanup can call it even though setup itself runs asynchronously.
  const cleanupRef = useRef<(() => void) | null>(null);
  const { data: content } = useSplashContent();
  const videos = content ?? [];

  // Isti fiksni canvas (1624x768) kao i ostatak aplikacije — splash se
  // rasteže na fizički ekran istom metodom kao ScaleToFit, pa je prikaz
  // identičan na TV-u i laptopu i nijedna pločica nije odsječena.
  // Mjeri se stvarni host element (ne window.innerWidth/Height, koje TV
  // browseri često krivo prijave) i canvas se centrira na ekranu.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      const w = rect.width || host.clientWidth || window.innerWidth;
      const h = rect.height || host.clientHeight || window.innerHeight;
      if (w < 1 || h < 1) return;
      const x = w / CANVAS_WIDTH;
      const y = h / CANVAS_HEIGHT;
      setScale({
        x,
        y,
        left: (w - CANVAS_WIDTH * x) / 2,
        top: (h - CANVAS_HEIGHT * y) / 2,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    const timers = [50, 250, 800, 2000].map((ms) => window.setTimeout(measure, ms));
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      timers.forEach(window.clearTimeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  const MAX_SOURCES = 2;
  const uniqueVideos = useMemo(
    () =>
      videos
        .filter(
          (video, index, list) => list.findIndex((candidate) => candidate.video_url === video.video_url) === index,
        )
        .slice(0, MAX_SOURCES),
    [videos],
  );

  useEffect(() => {
    const goFs = () => {
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
      if (document.fullscreenElement) return;
      void (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch(() => undefined);
    };
    goFs();
    window.addEventListener("pointerdown", goFs, { once: true });
    window.addEventListener("keydown", goFs, { once: true });
    return () => {
      window.removeEventListener("pointerdown", goFs);
      window.removeEventListener("keydown", goFs);
    };
  }, []);

  useEffect(() => {
    const readyVideos = uniqueVideos.filter((video) => loadedSources.current.has(video.video_url));
    if (!readyVideos.length) return;

    // Delay the heavy part (buffer/canvas setup + decode-driven redraw loop) by
    // one tick past mount so it doesn't compete with the app's own initial
    // render for CPU time right at startup — this is exactly the window where
    // long main-thread tasks were observed on weak TV hardware.
    const startDelay = window.setTimeout(() => {
      const players = readyVideos
        .map((video) => sourceVideoRefs.current[video.video_url])
        .filter((player): player is HTMLVideoElement => player !== null);

      // Reduced from 128x72 — tiles render small on screen, so the extra
      // resolution bought nothing but more drawImage/scale cost per tick.
      const BUF_W = 96;
      const BUF_H = 54;
      const buffers = new Map
        string,
        { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; t: number }
      >();
      readyVideos.forEach((video) => {
        const c = document.createElement("canvas");
        c.width = BUF_W;
        c.height = BUF_H;
        buffers.set(video.video_url, { canvas: c, ctx: c.getContext("2d", { alpha: false }), t: -1 });
      });

      const tileTargets: Array<{
        buf: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; t: number };
        canvas: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
        lastT: number;
      }> = [];

      const buildTargets = () => {
        tileTargets.length = 0;
        TILES.forEach((_, index) => {
          const item = readyVideos[index % readyVideos.length];
          const buf = item ? buffers.get(item.video_url) : undefined;
          const canvas = canvasRefs.current[index];
          if (!buf || !canvas) return;
          if (canvas.width !== BUF_W || canvas.height !== BUF_H) {
            canvas.width = BUF_W;
            canvas.height = BUF_H;
          }
          const ctx = canvas.getContext("2d", {
            alpha: false,
            desynchronized: true,
          }) as CanvasRenderingContext2D | null;
          if (!ctx) return;
          tileTargets.push({ buf, canvas, ctx, lastT: -1 });
        });
      };

      // Which tile group gets repainted on the current tick — spreads the
      // drawImage cost across ticks instead of repainting all 12 tiles at
      // once, which is what produced single 100-180ms main-thread blocks.
      let rotationIndex = 0;
      const TILES_PER_TICK = 3;

      const drawFrames = () => {
        if (document.hidden) return;
        buffers.forEach((buf, url) => {
          const player = sourceVideoRefs.current[url];
          if (!player || !buf.ctx || player.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
          if (!player.videoWidth || !player.videoHeight) return;
          if (player.currentTime === buf.t) return;
          buf.t = player.currentTime;

          const scale = Math.max(BUF_W / player.videoWidth, BUF_H / player.videoHeight);
          const sw = BUF_W / scale;
          const sh = BUF_H / scale;
          buf.ctx.drawImage(
            player,
            (player.videoWidth - sw) / 2,
            (player.videoHeight - sh) / 2,
            sw,
            sh,
            0,
            0,
            BUF_W,
            BUF_H,
          );
        });

        if (!tileTargets.length) buildTargets();

        let drew = false;
        for (let i = 0; i < TILES_PER_TICK && tileTargets.length; i++) {
          const target = tileTargets[rotationIndex % tileTargets.length];
          rotationIndex++;
          if (target.buf.t < 0 || target.buf.t === target.lastT) continue;
          target.lastT = target.buf.t;
          target.ctx.drawImage(target.buf.canvas, 0, 0);
          drew = true;
        }
        if (drew) setFramesReady(true);
      };

      players.forEach((player) => {
        player.currentTime = 0;
      });
      drawFrames();

      const FRAME_INTERVAL = 1000;
      animationFrame.current = window.setInterval(drawFrames, FRAME_INTERVAL);
      setRevealed(true);
      void Promise.allSettled(players.map((player) => player.play()));

      cleanupRef.current = () => {
        if (animationFrame.current !== null) window.clearInterval(animationFrame.current);
        animationFrame.current = null;
        players.forEach((player) => {
          player.pause();
          player.src = "";
          player.load();
        });
      };
    }, 150);

    return () => {
      window.clearTimeout(startDelay);
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [loadedSourceCount, uniqueVideos]);

  useEffect(() => {
    if (!revealed) return;
    const t = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(t);
  }, [duration, revealed]);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), duration + 2000);
    return () => window.clearTimeout(t);
  }, [duration]);

  // Hard teardown: releases every decoder, canvas buffer and timer when this
  // screen leaves the tree, so playback gets the full CPU/GPU budget.
  useEffect(
    () => () => {
      if (animationFrame.current !== null) window.clearInterval(animationFrame.current);
      animationFrame.current = null;
      Object.values(sourceVideoRefs.current).forEach((player) => {
        if (!player) return;
        player.pause();
        player.removeAttribute("src");
        player.load();
      });
      sourceVideoRefs.current = {};
      canvasRefs.current.forEach((canvas) => {
        if (!canvas) return;
        canvas.width = 0;
        canvas.height = 0;
      });
      canvasRefs.current = [];
      loadedSources.current.clear();
    },
    [],
  );

  const markSourceLoaded = (url: string) => {
    if (loadedSources.current.has(url)) return;
    loadedSources.current.add(url);
    setLoadedSourceCount(loadedSources.current.size);
  };

  // Portal u document.body: splash mora pobjeći iz ScaleToFit kontejnera
  // (njegov transform bi inače skalirao i ovaj fixed overlay dvaput, pa bi
  // se rubne pločice sjekle i prikaz bi se razlikovao na TV-u i laptopu).
  return createPortal(
    <AnimatePresence onExitComplete={() => onFinished?.()}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          ref={hostRef}
          className="fixed inset-0 z-[9999] bg-black overflow-hidden"
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              transform: `translate(${scale.left}px, ${scale.top}px) scale(${scale.x}, ${scale.y})`,
              transformOrigin: "top left",
            }}
          >
            <div className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0" aria-hidden="true">
              {uniqueVideos.map((item) => (
                <video
                  key={item.video_url}
                  ref={(element) => {
                    sourceVideoRefs.current[item.video_url] = element;
                  }}
                  src={item.video_url}
                  crossOrigin="anonymous"
                  muted
                  loop
                  playsInline
                  preload="auto"
                  onLoadedData={() => markSourceLoaded(item.video_url)}
                  onCanPlayThrough={() => markSourceLoaded(item.video_url)}
                />
              ))}
            </div>

            <div className={`transition-opacity duration-1000 ${revealed ? "opacity-100" : "opacity-0"}`}>
              {TILES.map((tile, i) => {
                const poster = videos.length ? videos[i % videos.length].poster_url : null;
                return (
                  <div
                    key={i}
                    className="absolute overflow-hidden rounded-[3px] border border-border/60 bg-muted/30"
                    style={{
                      left: `${tile.left}%`,
                      top: `${tile.top}%`,
                      width: `${tile.w}%`,
                      height: `${tile.h}%`,
                    }}
                  >
                    {poster && (
                      <img
                        src={poster}
                        alt=""
                        aria-hidden="true"
                        loading="eager"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover rounded-sm"
                      />
                    )}
                    <canvas
                      ref={(element) => {
                        canvasRefs.current[i] = element;
                      }}
                      className={`absolute inset-0 h-full w-full rounded-sm transition-opacity duration-500 ${
                        framesReady ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </div>
                );
              })}

            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img src={logo} alt="MAXovizija" className="w-[34%] max-w-[620px]" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default SplashIntro;