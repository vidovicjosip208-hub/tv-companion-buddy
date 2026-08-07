import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/max-ovizija-logo.png";

interface SplashTileData {
  video_url: string;
  poster_url: string | null;
}

const TILE_SIZE = { w: 11, h: 11 };
const TILES = [
  { left: 44.5, top: 1.83, ...TILE_SIZE },   // 12 o'clock
  { left: 57.75, top: 7.55, ...TILE_SIZE },  // 1
  { left: 67.45, top: 23.17, ...TILE_SIZE }, // 2
  { left: 71, top: 44.5, ...TILE_SIZE },     // 3
  { left: 67.45, top: 65.83, ...TILE_SIZE }, // 4
  { left: 57.75, top: 81.45, ...TILE_SIZE }, // 5
  { left: 44.5, top: 87.17, ...TILE_SIZE },  // 6
  { left: 31.25, top: 81.45, ...TILE_SIZE }, // 7
  { left: 21.55, top: 65.83, ...TILE_SIZE }, // 8
  { left: 18, top: 44.5, ...TILE_SIZE },     // 9
  { left: 21.55, top: 23.17, ...TILE_SIZE }, // 10
  { left: 31.25, top: 7.55, ...TILE_SIZE },  // 11
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
  const loadedSources = useRef(new Set<string>());
  const sourceVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const animationFrame = useRef<number | null>(null);
  const { data: content } = useSplashContent();
  const videos = content ?? [];

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

    const players = readyVideos
      .map((video) => sourceVideoRefs.current[video.video_url])
      .filter((player): player is HTMLVideoElement => player !== null);

    const BUF_W = 128;
    const BUF_H = 72;
    const buffers = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; t: number }>();
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
        const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true }) as CanvasRenderingContext2D | null;
        if (!ctx) return;
        tileTargets.push({ buf, canvas, ctx, lastT: -1 });
      });
    };

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
      for (const target of tileTargets) {
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

    return () => {
      if (animationFrame.current !== null) window.clearInterval(animationFrame.current);
      animationFrame.current = null;
      players.forEach((player) => { player.pause(); player.src = ""; player.load(); });
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

  return (
    <AnimatePresence onExitComplete={() => onFinished?.()}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          className="fixed inset-0 z-[9999] bg-black overflow-hidden"
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "100vw",
              height: "56.25vw",
              minWidth: "177.78vh",
              minHeight: "100vh",
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
    </AnimatePresence>
  );
};

export default SplashIntro;
