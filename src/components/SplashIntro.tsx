import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/max-ovizija-logo.png";

interface SplashTileData {
  video_url: string;
  poster_url: string | null;
}

// Circular ring of 12 tiles around the centered logo
// (percent of the 16:9 stage). Each tile is 13% of the stage.
const TILE_SIZE = { w: 13, h: 13 };
const TILES = [
  { left: 43.5, top: 7.5, ...TILE_SIZE },   // 12 o'clock
  { left: 64.5, top: 12.3, ...TILE_SIZE },  // 1 o'clock
  { left: 79.9, top: 25.5, ...TILE_SIZE },  // 2 o'clock
  { left: 85.5, top: 43.5, ...TILE_SIZE },  // 3 o'clock
  { left: 79.9, top: 61.5, ...TILE_SIZE },  // 4 o'clock
  { left: 64.5, top: 74.7, ...TILE_SIZE },  // 5 o'clock
  { left: 43.5, top: 79.5, ...TILE_SIZE },  // 6 o'clock
  { left: 22.5, top: 74.7, ...TILE_SIZE },  // 7 o'clock
  { left: 7.1, top: 61.5, ...TILE_SIZE },   // 8 o'clock
  { left: 1.5, top: 43.5, ...TILE_SIZE },   // 9 o'clock
  { left: 7.1, top: 25.5, ...TILE_SIZE },   // 10 o'clock
  { left: 22.5, top: 12.3, ...TILE_SIZE },  // 11 o'clock
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

const SplashIntro = ({ duration = 15000 }: SplashIntroProps) => {
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

    const drawFrames = () => {
      TILES.forEach((_, index) => {
        const item = videos[index % videos.length];
        const player = item ? sourceVideoRefs.current[item.video_url] : null;
        const canvas = canvasRefs.current[index];
        if (!player || !canvas || player.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

        const context = canvas.getContext("2d");
        if (!context || !player.videoWidth || !player.videoHeight) return;

        const targetWidth = Math.min(480, Math.max(160, Math.round(canvas.clientWidth)));
        const targetHeight = Math.min(270, Math.max(90, Math.round(canvas.clientHeight)));
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }

        const scale = Math.max(targetWidth / player.videoWidth, targetHeight / player.videoHeight);
        const sourceWidth = targetWidth / scale;
        const sourceHeight = targetHeight / scale;
        const sourceX = (player.videoWidth - sourceWidth) / 2;
        const sourceY = (player.videoHeight - sourceHeight) / 2;
        context.drawImage(
          player,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          targetWidth,
          targetHeight,
        );
      });
    };

    players.forEach((player) => {
      player.currentTime = 0;
    });
    drawFrames();

    void Promise.allSettled(players.map((player) => player.play())).then(() => {
      const render = () => {
        drawFrames();
        animationFrame.current = window.requestAnimationFrame(render);
      };
      render();
      setRevealed(true);
    });

    return () => {
      if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
    };
  }, [loadedSourceCount, uniqueVideos, videos]);

  useEffect(() => {
    if (!revealed) return;
    const t = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(t);
  }, [duration, revealed]);

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
            id="splash-stage"
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

            {/* Subtle connecting ring between the circular tile frames */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <ellipse
                cx="50"
                cy="50"
                rx="42"
                ry="36"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="0.4"
              />
            </svg>

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
