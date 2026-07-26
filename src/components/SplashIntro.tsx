import { useEffect, useState } from "react";
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
      return (data ?? [])
        .filter((r) => !!r.video_url)
        .map((r) => ({ video_url: r.video_url as string, poster_url: r.poster_url ?? null }));
    },
    staleTime: Infinity,
  });

interface SplashIntroProps {
  duration?: number;
}

// Download each distinct clip ONCE and reuse the same object URL for every tile,
// so 20 frames don't trigger 20 parallel network downloads.
const useBlobUrls = (urls: string[]) => {
  const [map, setMap] = useState<Record<string, string>>({});
  const key = urls.join("|");

  useEffect(() => {
    if (!urls.length) return;
    let cancelled = false;
    const created: string[] = [];

    Promise.all(
      urls.map(async (u) => {
        try {
          const res = await fetch(u, { cache: "force-cache" });
          const blob = await res.blob();
          const obj = URL.createObjectURL(blob);
          created.push(obj);
          return [u, obj] as const;
        } catch {
          return [u, u] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) {
        created.forEach((o) => URL.revokeObjectURL(o));
        return;
      }
      setMap(Object.fromEntries(pairs));
    });

    return () => {
      cancelled = true;
      created.forEach((o) => URL.revokeObjectURL(o));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return map;
};

const SplashIntro = ({ duration = 15000 }: SplashIntroProps) => {
  const [visible, setVisible] = useState(true);
  const { data: content } = useSplashContent();
  const videos = content ?? [];
  const uniqueUrls = Array.from(new Set(videos.map((v) => v.video_url)));
  const blobs = useBlobUrls(uniqueUrls);

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
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

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
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "100vw",
              height: "56.25vw",
              minWidth: "177.78vh",
              minHeight: "100vh",
            }}
          >
            {TILES.map((tile, i) => {
              const item = videos.length ? videos[i % videos.length] : undefined;
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
                  {item && (
                    <video
                      src={item.video_url}
                      poster={item.poster_url ?? undefined}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      className="w-full h-full object-cover rounded-sm"
                    />
                  )}
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
