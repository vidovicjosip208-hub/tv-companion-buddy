import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/max-ovizija-logo.png";

interface SplashTileData {
  poster: string;
  stream: string | null;
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
    queryKey: ["splash_content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies_series")
        .select("poster_url, backdrop_url, thumbnail_url, stream_url")
        .limit(40);
      if (error) throw error;
      return (data ?? [])
        .map((r) => ({
          poster: r.backdrop_url || r.thumbnail_url || r.poster_url || "",
          stream: r.stream_url ?? null,
        }))
        .filter((t) => t.poster || t.stream);
    },
    staleTime: Infinity,
  });

const SplashTile = ({
  tile,
  data,
  playing,
}: {
  tile: (typeof TILES)[number];
  data?: SplashTileData;
  playing: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canPlay = playing && !!data?.stream && !data.stream.includes(".m3u8");

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (canPlay) {
      v.currentTime = Math.random() * 60 + 10;
      void v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [canPlay]);

  return (
    <div
      className="absolute overflow-hidden rounded-[3px] shadow-[0_14px_34px_rgba(0,0,0,0.8)]"
      style={{
        left: `${tile.left}%`,
        top: `${tile.top}%`,
        width: `${tile.w}%`,
        height: `${tile.h * (16 / 9)}%`,
      }}
    >
      {data?.poster && <img src={data.poster} alt="" className="w-full h-full object-cover" loading="eager" decoding="sync" fetchPriority="high" />}
      {data?.stream && (
        <video
          ref={videoRef}
          src={data.stream}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: canPlay ? 1 : 0 }}
        />
      )}
    </div>
  );
};

interface SplashIntroProps {
  duration?: number;
}

const SplashIntro = ({ duration = 15000 }: SplashIntroProps) => {
  const [visible, setVisible] = useState(true);
  const [wave, setWave] = useState(0);
  const { data: content = [] } = useSplashContent();

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

  useEffect(() => {
    const i = setInterval(() => setWave((w) => w + 1), 2600);
    return () => clearInterval(i);
  }, []);


  // Only a few clips play at once so TV hardware stays smooth.
  const activeIndices = useMemo(() => {
    const set = new Set<number>();
    for (let k = 0; k < 5; k++) set.add((wave * 5 + k * 3) % TILES.length);
    return set;
  }, [wave]);

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
            {TILES.map((tile, i) => (
              <SplashTile
                key={i}
                tile={tile}
                data={content[i % Math.max(content.length, 1)]}
                playing={activeIndices.has(i)}
              />
            ))}

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
