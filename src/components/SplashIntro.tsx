import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/max-ovizija-logo.png";

interface SplashTileData {
  poster: string;
  stream: string | null;
}

// Non-overlapping grid layout (percent of canvas): 6 x 5 cells of 16:9 tiles
// with the middle block left free for the logo. Tiles never overlap so each
// one can host its own small video player.
const TILES = [
  { left: 8.3, top: 13.0, w: 13.3 },
  { left: 22.8, top: 8.6, w: 18.6 },
  { left: 38.7, top: 8.6, w: 12.8 },
  { left: 53.3, top: 8.8, w: 13.3 },
  { left: 67.7, top: 10.7, w: 13.3 },
  { left: 82.2, top: 15.1, w: 10.1 },
  { left: 4.6, top: 24.9, w: 16.3 },
  { left: 21.9, top: 23.2, w: 10.4 },
  { left: 70.0, top: 24.9, w: 12.4 },
  { left: 82.8, top: 28.8, w: 13.3 },
  { left: 2.9, top: 38.6, w: 16.6 },
  { left: 76.8, top: 42.0, w: 17.9 },
  { left: 5.5, top: 54.2, w: 18.2 },
  { left: 70.3, top: 56.4, w: 23.4 },
  { left: 6.4, top: 68.4, w: 20.5 },
  { left: 13.7, top: 75.7, w: 16.6 },
  { left: 31.1, top: 71.3, w: 11.4 },
  { left: 43.8, top: 74.2, w: 12.0 },
  { left: 57.0, top: 70.3, w: 14.6 },
  { left: 73.2, top: 70.8, w: 17.6 },
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
        aspectRatio: "16 / 9",
      }}
    >
      {data?.poster && <img src={data.poster} alt="" className="w-full h-full object-cover" loading="eager" />}
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
          {TILES.map((tile, i) => (
            <SplashTile
              key={i}
              tile={tile}
              data={content[i % Math.max(content.length, 1)]}
              playing={activeIndices.has(i)}
            />
          ))}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src={logo}
              alt="MAXovizija"
              className="relative w-[38%] max-w-[640px]"
            />

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashIntro;
