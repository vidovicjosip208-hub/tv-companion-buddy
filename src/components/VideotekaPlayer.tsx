-- ============================================================
-- SQL za Big Buck Bunny (HD Test) s seek_preview_url poljem
-- ============================================================
-- Pretpostavka: tablica se zove `movies` (prilagodi naziv ako je drugačije).
-- Kolona `seek_preview_url` je opcionalna — koristi se za skriveni video
-- iz kojeg player uzima frame-ove pri seekanju.
-- Za BBB koristimo isti HLS stream i kao seek preview jer je javno dostupan
-- i podržava crossOrigin bez CORS problema.
-- ============================================================

-- 1. Dodaj kolonu ako još ne postoji
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS seek_preview_url TEXT;

-- 2. INSERT — novi unos za Big Buck Bunny
INSERT INTO movies (
  title,
  slug,
  description,
  duration_seconds,
  thumbnail_url,
  stream_url,
  seek_preview_url,
  year,
  genre,
  language,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Big Buck Bunny',
  'big-buck-bunny',
  'Kratki animirani film o divovskom zecu koji se osvećuje malim šumskim životinjama. Blender Foundation open-source klasik.',
  596,                                                           -- 9 min 56 s
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Big_Buck_Bunny_thumbnail_vlc.png/1200px-Big_Buck_Bunny_thumbnail_vlc.png',
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',         -- HLS adaptive (5 renditions)
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',         -- seek preview — isti stream
  2008,
  'Animacija',
  'en',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  stream_url       = EXCLUDED.stream_url,
  seek_preview_url = EXCLUDED.seek_preview_url,
  thumbnail_url    = EXCLUDED.thumbnail_url,
  updated_at       = NOW();

-- ============================================================
-- NAPOMENA: seek_preview_url alternativa
-- ============================================================
-- Ako želiš brže seekanje (manji file, manje buffering-a),
-- možeš pohraniti URL na MP4 niže kvalitete umjesto HLS-a:
--
--   seek_preview_url = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_30mb.mp4'
--
-- Player će ga koristiti samo za canvas frame capture —
-- zvuk i HLS kvaliteta ostaju nepromijenjeni.
-- ============================================================

-- 3. Provjera
SELECT
  id,
  title,
  duration_seconds,
  stream_url,
  seek_preview_url,
  is_active
FROM movies
WHERE slug = 'big-buck-bunny';