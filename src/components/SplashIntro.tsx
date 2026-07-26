import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/max-ovizija-logo.png";

interface SplashTileData {
  poster: string;
  stream: string | null;
}

// Scatter layout (percent of canvas) mirroring the intro collage composition.
const TILES = [
  { left: 8, top: 12, w: 13 },
  { left: 22, top: 8, w: 15 },
  { left: 38, top: 8, w: 13 },
  { left: 53, top: 8, w: 13 },
  { left: 67, top: 10, w: 14 },
  { left: 82, top: 14, w: 11 },
  { left: 4, top: 25, w: 16 },
  { left: 21, top: 22, w: 11 },
  { left: 69, top: 24, w: 13 },
  { left: 82, top: 28, w: 14 },
  { left: 2, top: 38, w: 17 },
  { left: 76, top: 41, w: 19 },
  { left: 5, top: 53, w: 19 },
  { left: 70, top: 55, w: 22 },
  { left: 6, top: 68, w: 16 },
  { left: 13, top: 74, w: 17 },
  { left: 31, top: 70, w: 12 },
  { left: 44, top: 73, w: 12 },
  { left: 57, top: 68, w: 15 },
  { left: 73, top: 70, w: 18 },
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
  delay,
}: {
  tile: (typeof TILES)[number];
  data?: SplashTileData;
  playing: boolean;
  delay: number;
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
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay }}
      className="absolute overflow-hidden rounded-md shadow-[0_18px_40px_rgba(0,0,0,0.75)] ring-1 ring-white/5"
      style={{
        left: `${tile.left}%`,
        top: `${tile.top}%`,
        width: `${tile.w}%`,
        aspectRatio: "16 / 9",
      }}
    >
      {data?.poster && <img src={data.poster} alt="" className="w-full h-full object-cover" loading="lazy" />}
      {data?.stream && (
        <video
          ref={videoRef}
          src={data.stream}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: canPlay ? 1 : 0 }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
    </motion.div>
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
              delay={Math.min(i * 0.05, 0.8)}
            />
          ))}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-[55%] h-[45%] rounded-full bg-black blur-3xl" />
            <motion.img
              src={logo}
              alt="MAXovizija"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="relative w-[42%] max-w-[720px] drop-shadow-[0_0_60px_rgba(0,0,0,0.9)]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashIntro;
