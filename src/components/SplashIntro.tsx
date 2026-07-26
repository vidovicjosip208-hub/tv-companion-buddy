import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/max-ovizija-logo.png";

interface SplashTileData {
  video_url: string;
  poster_url: string | null;
}

// Scattered, non-overlapping frame of tiles around the centered logo,
// traced from the reference layout (percent of the 16:9 stage).
const TILES = [
  { left: 8.1, top: 12.5, w: 13.5, h: 11.2 },
  { left: 22.8, top: 8.6, w: 13.8, h: 12.2 },
  { left: 38.0, top: 8.6, w: 13.6, h: 9.8 },
  { left: 53.1, top: 8.3, w: 13.2, h: 12.0 },
  { left: 67.9, top: 11.0, w: 13.5, h: 10.9 },
  { left: 82.2, top: 15.4, w: 10.0, h: 11.0 },
  { left: 4.6, top: 25.2, w: 15.3, h: 10.7 },
  { left: 20.7, top: 22.9, w: 9.6, h: 10.5 },
  { left: 69.9, top: 24.4, w: 11.5, h: 10.1 },
  { left: 82.6, top: 28.6, w: 14.0, h: 11.2 },
  { left: 2.8, top: 38.2, w: 16.1, h: 14.1 },
  { left: 77.0, top: 41.5, w: 17.6, h: 12.5 },
  { left: 5.3, top: 54.3, w: 16.9, h: 12.0 },
  { left: 71.9, top: 56.2, w: 20.6, h: 11.2 },
  { left: 6.4, top: 68.4, w: 10.4, h: 8.8 },
  { left: 17.4, top: 68.2, w: 12.8, h: 13.9 },
  { left: 31.3, top: 71.3, w: 11.3, h: 12.5 },
  { left: 43.8, top: 74.0, w: 12.0, h: 12.4 },
  { left: 57.0, top: 70.6, w: 14.9, h: 13.2 },
  { left: 73.6, top: 69.8, w: 17.0, h: 10.4 },
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
  const animationFrame = useRef<number>();
  const { data: content } = useSplashContent();
  const videos = content ?? [];
  const uniqueVideos = videos.filter(
    (video, index, list) => list.findIndex((candidate) => candidate.video_url === video.video_url) === index,
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
    if (!uniqueVideos.length || loadedSourceCount !== uniqueVideos.length || revealed) return;

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
      if (animationFrame.current !== undefined) window.cancelAnimationFrame(animationFrame.current);
    };
  }, [loadedSourceCount, revealed, uniqueVideos, videos]);

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
