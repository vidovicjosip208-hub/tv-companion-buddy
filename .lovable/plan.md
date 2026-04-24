## Cilj

Implementirati TV streaming UI iz priloženog `Index.tsx` koda na TanStack Router-u, **bez Lovable Cloud-a / Supabase**. Svi podaci (kanali, EPG, omiljeni) su hardkodovani u kodu ili u localStorage-u. Player koristi javni HLS demo stream tako da svi kanali stvarno reprodukuju video.

## Šta se gradi

### Glavna ruta `/` — TV ekran
Kompletan layout iz tvog koda:
- **TVSidebar** (levo): TV / Radio / Filmovi / Omiljeni / Kamere / Profil / Settings, sa highlight-om aktivne stavke i collapse podrškom
- **TVHeader** (vrh): logo, sat, datum, indikator zvuka
- **TVCategoryMenu**: pilule za kategorije (Sve / Sport / Film / Dečiji / Vesti / Muzika / Dokumentarni)
- **EPGGrid** (3 kolone — 21% / 44% / 31%, zlatni divider-i):
  - Lista kanala sa abbreviation chip-om
  - TV raspored (programi po vremenu, "LIVE" pulse, progress bar)
  - Detalji selektovanog programa + GLEDAJ dugme
- **TVContentRow**: horizontalni redovi sa ChannelCard pločicama (poster, naslov, "LIVE" badge)
- **VideoPlayer** modal/fullscreen overlay: HLS stream, play/pause, mute, exit (Esc)
- **ProfileSelection** overlay: 4 statička profila

### Dodatne rute (placeholder)
- `/videoteka` — naslov "Videoteka" + "Uskoro" + Nazad dugme
- `/settings` — naslov "Podešavanja" + "Uskoro" + Nazad dugme
- `/profili` — full-screen ProfileSelection

Sve sa head() metadata.

## Tehnička implementacija

### Konverzija routing-a
Originalni kod koristi `react-router-dom` (`useNavigate`). Konvertujem u **`@tanstack/react-router`**:
- `useNavigate({ to: "/videoteka" })` umesto `navigate("/videoteka")`
- `<Link to="...">` umesto `<a href="...">`
- Glavni Index ide u `src/routes/index.tsx` (zameni placeholder)

### Nove komponente (`src/components/`)
| Fajl | Sadržaj |
|---|---|
| `TVSidebar.tsx` | Vertikalni nav sa ikonicama (lucide), aktivni state preko `useLocation` |
| `TVHeader.tsx` | Top bar sa satom (useEffect tick svake sekunde) |
| `EPGGrid.tsx` | Iz tvoje poruke, sa rekonstruisanim JSX-om (3 kolone, ChannelItem, ProgramRow, detail panel sa AnimatePresence) |
| `TVCategoryMenu.tsx` | Pilule + export `tvCategories` array |
| `TVContentRow.tsx` | Horizontal scroll sa naslovom sekcije |
| `ChannelCard.tsx` | Pločica kanala (thumbnail, title, LIVE badge, focused ring) |
| `VideoPlayer.tsx` | Fullscreen modal, hls.js inicijalizacija, kontrole (play/pause/mute/close), Esc zatvara |
| `ProfileSelection.tsx` | Grid 4 profila (Tata/Mama/Deca/Gost) sa Avatar krugovima, klik upisuje u localStorage i poziva onSelect |

### Hookovi (`src/hooks/`) — bez Supabase
| Hook | Vraća |
|---|---|
| `useChannels()` | Hardkodovan niz `EPGChannel[]` (cca 12 kanala: RTS1, RTS2, Pink, B92, Sport Klub 1-3, Cinemania, Pikaboo, N1, Nova S, HBO) sa `streamUrl` postavljenim na javni Mux test HLS |
| `useEPGData()` | Hardkodovani programi po kanalu (3-5 emisija danas, jedna `isLive: true`) |
| `useFavorites()` | `{ favorites, toggleFavorite, isFavorite }` — perzistira u `localStorage` pod ključem `tv_favorites` |

### Demo stream
Svi kanali dele javni HLS test stream:
```
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
```
Bez API ključeva, radi u browser-u sa hls.js, fallback za Safari (native HLS).

### Dependencies (instaliram pre import-ovanja)
- `framer-motion` — animacije i AnimatePresence
- `hls.js` — HLS playback

`lucide-react`, `@tanstack/react-router`, sve Radix komponente već postoje.

### Bez Lovable Cloud-a
- Bez `@supabase/supabase-js`
- Bez `src/integrations/supabase/*`
- Bez auth, bez tabela, bez migracija, bez edge funkcija
- Bez `user_roles` ili RLS-a

## Struktura fajlova nakon izmena

```text
src/
├── routes/
│   ├── __root.tsx          (postojeći)
│   ├── index.tsx           (PREPISAN: TV glavni ekran)
│   ├── videoteka.tsx       (nov: placeholder)
│   ├── settings.tsx        (nov: placeholder)
│   └── profili.tsx         (nov: ProfileSelection)
├── components/
│   ├── TVSidebar.tsx
│   ├── TVHeader.tsx
│   ├── EPGGrid.tsx
│   ├── TVCategoryMenu.tsx
│   ├── TVContentRow.tsx
│   ├── ChannelCard.tsx
│   ├── VideoPlayer.tsx
│   └── ProfileSelection.tsx
└── hooks/
    ├── useChannels.ts
    ├── useEPGData.ts
    └── useFavorites.ts
```

## Šta NEĆE biti urađeno

- Nikakva integracija sa bazom / auth-om / Supabase-om
- Bez stvarnih IPTV stream URL-ova (samo demo HLS) — kasnije možeš ručno editovati `useChannels.ts`
- Bez admin panela za upravljanje kanalima
- Bez TV remote (D-pad) keyboard navigacije izvan strelica koje već postoje u tvom Index.tsx kodu — koristi tu logiku as-is

## Posle implementacije

Kad odobriš, prelazim u build mode i kreiram sve fajlove + instaliram `framer-motion` i `hls.js`. Otvori `/` da vidiš TV ekran; klik na bilo koji kanal otvara player sa demo video stream-om.
