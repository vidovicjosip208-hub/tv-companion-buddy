import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/max-ovizija-logo.png";

interface SplashTileData {
  video_url: string;
  poster_url: string | null;
}

// 12 tiles evenly placed on a true visual circle around the centered logo.
// Stage is 16:9, so the vertical radius (% of height) = horizontal radius * 16/9.
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
      const rows = (data ?? [])
        .filter((r) => !!r.video_url)
        .map((r) => ({ video_url: r.video_url as string, poster_url: r.poster_url ?? null }));

      const checkedRows = await Promise.all(
        rows.map(async (row) => {
          try {
            const response = await fetch(row.video_url, { method: "HEAD", cache: "force-cache" });
            const contentType = response.headers.get("content-type") ?? "";
            return response.ok && contentType.startsWith("video/") ? row : null;
          } catch {
            return null;
          }
        }),
      );

      return checkedRows.filter((row): row is SplashTileData => row !== null);
    },
    staleTime: Infinity,
  });

interface SplashIntroProps {
  duration?: number;
}

const SplashIntro = ({ duration = 6000 }: SplashIntroProps) => {
  const [visible, setVisible] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [loadedSourceCount, setLoadedSourceCount] = useState(0);
  const loadedSources = useRef(new Set<string>());
  const sourceVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const animationFrame = useRef<number | null>(null);
  const { data: content } = useSplashContent();
  const videos = content ?? [];
  const uniqueVideos = useMemo(
    () =>
      videos.filter(
        (video, index, list) => list.findIndex((candidate) => candidate.video_url === video.video_url) === index,
      ),
    [videos],
  );

  // Try to go fullscreen immediately; retry on the first user gesture if blocked.
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
    if (!uniqueVideos.length || loadedSourceCount !== uniqueVideos.length) return;

    const players = uniqueVideos
      .map((video) => sourceVideoRefs.current[video.video_url])
      .filter((player): player is HTMLVideoElement => player !== null);

    // One small offscreen buffer per UNIQUE video source. Decoding/scaling a
    // <video> into a canvas is the expensive part, so we do it once per source
    // per frame and then cheaply blit the buffer into every tile that uses it.
    const BUF_W = 128;
    const BUF_H = 72;
    const buffers = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; t: number }>();
    uniqueVideos.forEach((video) => {
      const c = document.createElement("canvas");
      c.width = BUF_W;
      c.height = BUF_H;
      buffers.set(video.video_url, { canvas: c, ctx: c.getContext("2d"), t: -1 });
    });

    const drawFrames = () => {
      // 1) refresh each unique source buffer (only if its frame advanced)
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

      // 2) blit buffers into the tiles (canvas -> canvas, GPU cheap)
      TILES.forEach((_, index) => {
        const item = videos[index % videos.length];
        const buf = item ? buffers.get(item.video_url) : undefined;
        const canvas = canvasRefs.current[index];
        if (!buf || buf.t < 0 || !canvas) return;
        if (canvas.width !== BUF_W || canvas.height !== BUF_H) {
          canvas.width = BUF_W;
          canvas.height = BUF_H;
        }
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(buf.canvas, 0, 0);
      });
    };

    players.forEach((player) => {
      player.currentTime = 0;
    });
    drawFrames();

    void Promise.allSettled(players.map((player) => player.play())).then(() => {
      // ~10 fps is plenty for tiny thumbnail previews and very cheap on TV CPUs.
      const FRAME_INTERVAL = 200;
      const id = window.setInterval(drawFrames, FRAME_INTERVAL);
      animationFrame.current = id;
      setRevealed(true);
    });



    return () => {
      if (animationFrame.current !== null) window.clearInterval(animationFrame.current);
      animationFrame.current = null;
      players.forEach((player) => player.pause());
    };

  }, [loadedSourceCount, uniqueVideos, videos]);

  useEffect(() => {
    if (!revealed) return;
    const t = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(t);
  }, [duration, revealed]);

  // Hard safety net: if the intro videos never load (slow/offline TV network),
  // the splash must never block the app.
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), duration + 2000);
    return () => window.clearTimeout(t);
  }, [duration]);


  const markSourceLoaded = (url: string) => {
    if (loadedSources.current.has(url)) return;
    loadedSources.current.add(url);
    setLoadedSourceCount(loadedSources.current.size);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          className="fixed inset-0 z-[9999] bg-black overflow-hidden"
        >
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${revealed ? "opacity-100" : "opacity-0"}`}
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

            {TILES.map((tile, i) => {
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
                  <canvas
                    ref={(element) => {
                      canvasRefs.current[i] = element;
                    }}
                    className="h-full w-full rounded-sm"
                  />
                </div>

              );
            })}

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
