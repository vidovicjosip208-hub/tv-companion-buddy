import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import TVSidebar from "@/components/TVSidebar";
import TVHeader from "@/components/TVHeader";
import EPGGrid, { type EPGChannel } from "@/components/EPGGrid";
import TVCategoryMenu from "@/components/TVCategoryMenu";
import TVContentRow from "@/components/TVContentRow";
import ChannelCard from "@/components/ChannelCard";
import VideoPlayer from "@/components/VideoPlayer";
import { useChannels } from "@/hooks/useChannels";
import { useFavorites } from "@/hooks/useFavorites";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LovableTV — Gledaj uživo" },
      { name: "description", content: "TV uživo, raspored programa, omiljeni kanali i filmovi." },
      { property: "og:title", content: "LovableTV" },
      { property: "og:description", content: "Streaming TV platforma." },
    ],
  }),
  component: TVHome,
});

function TVHome() {
  const navigate = useNavigate();
  const { channels } = useChannels();
  const { isFavorite } = useFavorites();
  const [category, setCategory] = useState<string>("sve");
  const [focusedChannel, setFocusedChannel] = useState(0);
  const [playerChannel, setPlayerChannel] = useState<EPGChannel | null>(null);

  const filtered = useMemo(() => {
    if (category === "sve") return channels;
    return channels.filter((c) => c.category === category);
  }, [channels, category]);

  // Reset focus when filter changes and current index out of range
  useEffect(() => {
    if (focusedChannel >= filtered.length) setFocusedChannel(0);
  }, [filtered.length, focusedChannel]);

  const favoriteChannels = useMemo(
    () => channels.filter((c) => isFavorite(c.id)),
    [channels, isFavorite],
  );

  const liveChannels = useMemo(
    () => channels.filter((c) => c.programs.some((p) => p.isLive)),
    [channels],
  );

  const handleChannelClick = (index: number) => {
    setFocusedChannel(index);
    const ch = filtered[index];
    if (ch) setPlayerChannel(ch);
  };

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-950 via-black to-slate-900 text-white">
      <TVSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TVHeader />
        <main className="flex-1 space-y-6 overflow-y-auto p-6">
          <TVCategoryMenu selected={category} onSelect={setCategory} />

          <EPGGrid
            channels={filtered}
            focusedIndex={focusedChannel}
            isFocusActive
            onChannelClick={handleChannelClick}
          />

          <TVContentRow title="Uživo sada">
            {liveChannels.map((ch) => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                onClick={() => setPlayerChannel(ch)}
              />
            ))}
          </TVContentRow>

          {favoriteChannels.length > 0 && (
            <TVContentRow title="Omiljeni">
              {favoriteChannels.map((ch) => (
                <ChannelCard
                  key={ch.id}
                  channel={ch}
                  onClick={() => setPlayerChannel(ch)}
                />
              ))}
            </TVContentRow>
          )}

          <TVContentRow title="Filmovi">
            {channels
              .filter((c) => c.category === "film")
              .map((ch) => (
                <ChannelCard
                  key={ch.id}
                  channel={ch}
                  onClick={() => navigate({ to: "/videoteka" })}
                />
              ))}
          </TVContentRow>
        </main>
      </div>

      <VideoPlayer channel={playerChannel} onClose={() => setPlayerChannel(null)} />
    </div>
  );
}
