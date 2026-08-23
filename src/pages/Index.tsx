import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useZoneKeys } from "@/lib/focusZone";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import TVSidebar from "@/components/TVSidebar";
import TVHeader from "@/components/TVHeader";
import EPGGrid, { EPGChannel } from "@/components/EPGGrid";
import TVCategoryMenu, { tvCategories } from "@/components/TVCategoryMenu";
import TVContentRow from "@/components/TVContentRow";
import TVChannelCard from "@/components/TVChannelCard";
import StarryBackground from "@/components/StarryBackground";
import ProfileSelection from "@/components/ProfileSelection";
import VideoPlayer, { PlayerData, FavoriteChannel } from "@/components/VideoPlayer";
import { useFavorites } from "@/hooks/useFavorites";
import { useChannels, useEPGData } from "@/hooks/useChannels";
import liveCamsLogo from "@/assets/livecams-logo.png.asset.json";

interface ChannelCard {
  title: string;
  thumbnail: string;
  channelName: string;
  timeSlot: string;
  channelNumber: string;
  streamUrl?: string;
  logoUrl?: string | null;
}

const defaultChannelCards: ChannelCard[] = [
  {
    title: "Vesti B92",
    thumbnail: "https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=400&q=80",
    channelName: "B92",
    timeSlot: "16:00 - 16:30",
    channelNumber: "6",
  },
  {
    title: "Selo gori, a baba se češlja",
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80",
    channelName: "PTC1",
    timeSlot: "16:02 - 17:00",
    channelNumber: "15",
  },
  {
    title: "Elita Uživo",
    thumbnail: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80",
    channelName: "Pink",
    timeSlot: "15:35 - 17:45",
    channelNumber: "208",
  },
];

const epgChannels: EPGChannel[] = [
  {
    id: "c1",
    number: 4,
    name: "Adria Info",
    abbreviation: "AI",
    programs: [
      { title: "Nikola Rokvić — Live Session", startTime: "16:25", endTime: "16:29", date: "18.03.", isLive: true },
      { title: "Vijesti iz regije", startTime: "16:30", endTime: "17:00", date: "18.03." },
      { title: "Balkan Express", startTime: "17:00", endTime: "17:45", date: "18.03." },
      { title: "Kulturni magazin", startTime: "17:45", endTime: "18:30", date: "18.03." },
    ],
  },
  {
    id: "c2",
    number: 5,
    name: "EX-YU Rock",
    abbreviation: "EX",
    programs: [
      { title: "Idoli — Maljčiki", startTime: "16:25", endTime: "16:28", date: "18.03.", isLive: true },
      { title: "Bijelo Dugme — Koncert", startTime: "16:28", endTime: "17:15", date: "18.03." },
      { title: "Rock Hronika", startTime: "17:15", endTime: "18:00", date: "18.03." },
    ],
  },
  {
    id: "c3",
    number: 6,
    name: "B92",
    abbreviation: "B92",
    programs: [
      { title: "Vesti B92", startTime: "16:00", endTime: "16:30", date: "18.03.", isLive: true },
      { title: "Sportski pregled", startTime: "16:30", endTime: "17:00", date: "18.03." },
      { title: "Utisak nedelje", startTime: "17:00", endTime: "18:00", date: "18.03." },
      { title: "Film — Akcija", startTime: "18:00", endTime: "20:00", date: "18.03." },
    ],
  },
  {
    id: "c4",
    number: 15,
    name: "PTC1",
    abbreviation: "PTC1",
    programs: [
      { title: "Selo gori, a baba se češlja", startTime: "16:02", endTime: "17:00", date: "18.03.", isLive: true },
      { title: "Dnevnik", startTime: "17:00", endTime: "17:30", date: "18.03." },
      { title: "Kulturni dnevnik", startTime: "17:30", endTime: "18:00", date: "18.03." },
    ],
  },
  {
    id: "c5",
    number: 45,
    name: "Adria Hits",
    abbreviation: "AH",
    programs: [
      { title: "Željko Samardžić — Koncert", startTime: "16:24", endTime: "16:28", date: "18.03.", isLive: true },
      { title: "Top Lista Hitova", startTime: "16:28", endTime: "17:00", date: "18.03." },
      { title: "Acoustic Sessions", startTime: "17:00", endTime: "18:00", date: "18.03." },
    ],
  },
  {
    id: "c6",
    number: 91,
    name: "HRT",
    abbreviation: "HRT",
    programs: [
      { title: "Praktična žena", startTime: "16:01", endTime: "17:02", date: "18.03.", isLive: true },
      { title: "Dnevnik HRT", startTime: "17:02", endTime: "17:30", date: "18.03." },
      { title: "Documentarni film", startTime: "17:30", endTime: "18:30", date: "18.03." },
    ],
  },
  {
    id: "c7",
    number: 208,
    name: "Pink",
    abbreviation: "Pink",
    programs: [
      { title: "Elita Uživo", startTime: "15:35", endTime: "17:45", date: "18.03.", isLive: true },
      { title: "Nacionalni dnevnik", startTime: "17:45", endTime: "18:15", date: "18.03." },
      { title: "Zvezde Granda", startTime: "18:15", endTime: "20:00", date: "18.03." },
    ],
  },
  {
    id: "c8",
    number: 706,
    name: "PTC2",
    abbreviation: "PTC2",
    programs: [
      { title: "Porodični kuvar", startTime: "15:55", endTime: "16:29", date: "18.03.", isLive: true },
      { title: "Bela lađa", startTime: "16:29", endTime: "17:15", date: "18.03." },
      { title: "Trezor", startTime: "17:15", endTime: "18:00", date: "18.03." },
    ],
  },
  {
    id: "c9",
    number: 15,
    name: "NOVA S",
    abbreviation: "NOVA",
    programs: [
      { title: "Priče iz lobija", startTime: "16:40", endTime: "17:30", date: "18.03.", isLive: true },
      { title: "Pregled dana", startTime: "17:30", endTime: "18:00", date: "18.03." },
    ],
  },
  {
    id: "c10",
    number: 208,
    name: "TLC",
    abbreviation: "TLC",
    programs: [
      { title: "Tigovv Balkan", startTime: "15:38", endTime: "16:30", date: "18.03.", isLive: true },
      { title: "Say Yes to the Dress", startTime: "16:30", endTime: "17:15", date: "18.03." },
      { title: "90 Day Fiancé", startTime: "17:15", endTime: "18:30", date: "18.03." },
    ],
  },
  {
    id: "c11",
    number: 12,
    name: "Nova TV",
    abbreviation: "NTV",
    programs: [
      { title: "Dobro jutro, Hrvatska", startTime: "06:30", endTime: "09:00", date: "18.03.", isLive: true },
      { title: "Vijesti", startTime: "12:00", endTime: "12:30", date: "18.03." },
    ],
  },
  {
    id: "c12",
    number: 14,
    name: "RTL",
    abbreviation: "RTL",
    programs: [
      { title: "Vijesti RTL danas", startTime: "13:00", endTime: "13:30", date: "18.03.", isLive: true },
      { title: "Exkluziv", startTime: "17:30", endTime: "18:00", date: "18.03." },
    ],
  },
  {
    id: "c13",
    number: 22,
    name: "N1",
    abbreviation: "N1",
    programs: [
      { title: "N1 Studio uživo", startTime: "11:00", endTime: "13:00", date: "18.03.", isLive: true },
      { title: "Pressing", startTime: "20:00", endTime: "21:00", date: "18.03." },
    ],
  },
  {
    id: "c14",
    number: 30,
    name: "Sport Klub",
    abbreviation: "SK",
    programs: [
      { title: "Liga prvaka uživo", startTime: "20:45", endTime: "23:00", date: "18.03.", isLive: true },
      { title: "Sportski pregled", startTime: "23:00", endTime: "23:30", date: "18.03." },
    ],
  },
  {
    id: "c15",
    number: 50,
    name: "HBO",
    abbreviation: "HBO",
    programs: [
      { title: "HBO originalna serija", startTime: "21:00", endTime: "22:00", date: "18.03.", isLive: true },
      { title: "Film večeri", startTime: "22:00", endTime: "00:00", date: "18.03." },
    ],
  },
  {
    id: "c16",
    number: 55,
    name: "National Geo",
    abbreviation: "NGO",
    programs: [
      { title: "Divlja priroda", startTime: "17:00", endTime: "18:00", date: "18.03.", isLive: true },
      { title: "Cosmos", startTime: "18:00", endTime: "19:00", date: "18.03." },
    ],
  },
  {
    id: "c17",
    number: 56,
    name: "Discovery",
    abbreviation: "DIS",
    programs: [
      { title: "Kako to rade?", startTime: "14:30", endTime: "15:30", date: "18.03.", isLive: true },
      { title: "Mitbusters", startTime: "15:30", endTime: "16:30", date: "18.03." },
    ],
  },
  {
    id: "c18",
    number: 60,
    name: "Cartoon Net",
    abbreviation: "CN",
    programs: [
      { title: "Animirani maraton", startTime: "09:00", endTime: "12:00", date: "18.03.", isLive: true },
      { title: "Teen Titans", startTime: "12:00", endTime: "13:00", date: "18.03." },
    ],
  },
  {
    id: "c19",
    number: 35,
    name: "Eurosport",
    abbreviation: "EUR",
    programs: [
      { title: "Formula 1 trka", startTime: "14:00", endTime: "17:00", date: "18.03.", isLive: true },
      { title: "Tenis highlights", startTime: "17:00", endTime: "18:00", date: "18.03." },
    ],
  },
  {
    id: "c20",
    number: 70,
    name: "FTV",
    abbreviation: "FTV",
    programs: [
      { title: "FTV dnevnik", startTime: "19:30", endTime: "20:00", date: "18.03.", isLive: true },
      { title: "Dokumentarni film", startTime: "20:00", endTime: "21:00", date: "18.03." },
    ],
  },
  {
    id: "c21",
    number: 72,
    name: "Hayat TV",
    abbreviation: "HAY",
    programs: [
      { title: "Hayat music show", startTime: "20:00", endTime: "22:00", date: "18.03.", isLive: true },
      { title: "Vijesti Hayat", startTime: "19:00", endTime: "19:30", date: "18.03." },
    ],
  },
];

const channelThumbnails: Record<string, string> = {
  "Adria Info": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80",
  "EX-YU Rock": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&q=80",
  B92: "https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=1920&q=80",
  PTC1: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=80",
  "Adria Hits": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=80",
  HRT: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1920&q=80",
  Pink: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80",
  PTC2: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1920&q=80",
  "NOVA S": "https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=1920&q=80",
  TLC: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&q=80",
  "Nova TV": "https://images.unsplash.com/photo-1468276311594-df7cb65d8df6?w=1920&q=80",
  RTL: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1920&q=80",
  N1: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1920&q=80",
  "Sport Klub": "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1920&q=80",
  HBO: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1920&q=80",
  "National Geo": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=80",
  Discovery: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80",
  "Cartoon Net": "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=1920&q=80",
  Eurosport: "https://images.unsplash.com/photo-1504707748692-419802cf939d?w=1920&q=80",
  FTV: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=1920&q=80",
  "Hayat TV": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&q=80",
};

const TV_KANALI_INDEX = 1;
const RADIO_INDEX = 2;
const FAVORITES_INDEX = 3;
const FILMOVI_INDEX = 4;
const CAMERAS_INDEX = 5;
const SETTINGS_INDEX = 6;
const PROFILE_INDEX = 7;

const CARDS_ROWS = 2;

type FocusZone = "sidebar" | "categories" | "filters" | "epg" | "epgPrograms" | "cards" | "cameras" | "radio";

interface CameraItem {
  id: string;
  name: string;
  location: string;
  country: string; // ISO-ish code: HR, RS, BA, SI, ME, MK
  thumbnail: string;
  streamUrl?: string;
}

const liveCameras: CameraItem[] = [
  {
    id: "cam1",
    name: "Zagreb - Trg",
    location: "Zagreb",
    country: "HR",
    thumbnail: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&q=80",
  },
  {
    id: "cam2",
    name: "Split - Riva",
    location: "Split",
    country: "HR",
    thumbnail: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&q=80",
  },
  {
    id: "cam3",
    name: "Dubrovnik - Stradun",
    location: "Dubrovnik",
    country: "HR",
    thumbnail: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&q=80",
  },
  {
    id: "cam4",
    name: "Beograd - Kalemegdan",
    location: "Beograd",
    country: "RS",
    thumbnail: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&q=80",
  },
  {
    id: "cam5",
    name: "Sarajevo - Baščaršija",
    location: "Sarajevo",
    country: "BA",
    thumbnail: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&q=80",
  },
  {
    id: "cam6",
    name: "Ljubljana - Prešernov trg",
    location: "Ljubljana",
    country: "SI",
    thumbnail: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&q=80",
  },
  {
    id: "cam7",
    name: "Podgorica - Centar",
    location: "Podgorica",
    country: "ME",
    thumbnail: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&q=80",
  },
  {
    id: "cam8",
    name: "Skopje - Ploštad",
    location: "Skopje",
    country: "MK",
    thumbnail: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&q=80",
  },
];

const COUNTRY_INFO: Record<string, { name: string }> = {
  HR: { name: "Hrvatska" },
  RS: { name: "Srbija" },
  BA: { name: "Bosna i Hercegovina" },
  SI: { name: "Slovenija" },
  ME: { name: "Crna Gora" },
  MK: { name: "Sjeverna Makedonija" },
};

// Regionalni indikator kodovi ('A'..'Z' -> U+1F1E6..U+1F1FF), koriste se samo
// da bismo dobili standardni Unicode codepoint niz za pojedinu zastavicu.
const countryFlagEmoji = (code: string) =>
  code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

// Pretvara emoji string u niz Unicode codepointova (hex, malim slovima, spojeno s "-"),
// format koji emoji CDN-ovi koriste za nazive datoteka slika.
const toCodePoints = (str: string) =>
  Array.from(str)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join("-");

// EmojiOne CDN — klasični "lepršavi" glossy stil zastavica s naborom i sjenom,
// isti izgled na svim uređajima (laptop, TV, mobitel) jer se ne oslanja na
// sistemski emoji font (Windows Segoe UI Emoji namjerno ne prikazuje flag emoji).
// Licenca: EmojiOne 2.2.7, CC BY 4.0 — potrebna atribucija negdje u aplikaciji.
const flagImageUrl = (code: string) =>
  `https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.7/assets/svg/${toCodePoints(countryFlagEmoji(code))}.svg`;

const CAMERA_COUNTRY_ORDER = ["HR", "RS", "BA", "SI", "ME", "MK"];

const radioStations: EPGChannel[] = [
  {
    id: "r1",
    number: 1,
    name: "Radio S",
    abbreviation: "RS",
    programs: [
      { title: "Jutarnji program", startTime: "06:00", endTime: "10:00", date: "18.03.", isLive: true },
      { title: "Hitovi dana", startTime: "10:00", endTime: "14:00", date: "18.03." },
    ],
  },
  {
    id: "r2",
    number: 2,
    name: "Radio 202",
    abbreviation: "202",
    programs: [
      { title: "Beograd noću", startTime: "22:00", endTime: "02:00", date: "18.03.", isLive: true },
      { title: "Muzički mozaik", startTime: "14:00", endTime: "18:00", date: "18.03." },
    ],
  },
  {
    id: "r3",
    number: 3,
    name: "Narodni FM",
    abbreviation: "NFM",
    programs: [
      { title: "Narodna muzika uživo", startTime: "08:00", endTime: "12:00", date: "18.03.", isLive: true },
      { title: "Večernji hitovi", startTime: "18:00", endTime: "22:00", date: "18.03." },
    ],
  },
  {
    id: "r4",
    number: 4,
    name: "Rock Radio",
    abbreviation: "RR",
    programs: [
      { title: "Rock blok", startTime: "10:00", endTime: "14:00", date: "18.03.", isLive: true },
      { title: "Metal zona", startTime: "22:00", endTime: "02:00", date: "18.03." },
    ],
  },
  {
    id: "r5",
    number: 5,
    name: "Radio Laguna",
    abbreviation: "RL",
    programs: [
      { title: "Opušteno jutro", startTime: "07:00", endTime: "11:00", date: "18.03.", isLive: true },
      { title: "Pop hitovi", startTime: "11:00", endTime: "15:00", date: "18.03." },
    ],
  },
  {
    id: "r6",
    number: 6,
    name: "Antena Zagreb",
    abbreviation: "AZ",
    programs: [
      { title: "Antena jutro", startTime: "06:00", endTime: "10:00", date: "18.03.", isLive: true },
      { title: "Top 20", startTime: "14:00", endTime: "16:00", date: "18.03." },
    ],
  },
  {
    id: "r7",
    number: 7,
    name: "Radio Sarajevo",
    abbreviation: "RSA",
    programs: [
      { title: "Sevdalinke", startTime: "16:00", endTime: "20:00", date: "18.03.", isLive: true },
      { title: "Vijesti", startTime: "12:00", endTime: "12:30", date: "18.03." },
    ],
  },
  {
    id: "r8",
    number: 8,
    name: "Gold FM",
    abbreviation: "GFM",
    programs: [
      { title: "Zlatni hitovi 80-ih", startTime: "09:00", endTime: "13:00", date: "18.03.", isLive: true },
      { title: "Retro večer", startTime: "20:00", endTime: "00:00", date: "18.03." },
    ],
  },
];

const CAMERAS_COLS = 4;

const CATEGORY_TO_DB_MAP: Record<string, string[]> = {
  documentary: ["Documentary"],
  kids: ["Kids"],
  film: ["Movies"],
  sports: ["Sports"],
  entertainment: ["Entertainment"],
  "4k": [],
  local: [],
  international: [],
  adult: [],
  youtube: [],
};

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { favorites, toggleFavorite, isFavorite, favoriteNumber, setFavoriteNumber } = useFavorites();
  // Dodjela vlastitog broja omiljenom kanalu (unos brojevima daljinskog)
  const [numberEditor, setNumberEditor] = useState<{ name: string; value: string; error?: string } | null>(null);

  /**
   * Prepoznaje OK/Enter tipku bez obzira na to šalje li je fizička tipkovnica
   * (e.key === "Enter") ili daljinski upravljač, koji često koristi drugačiji
   * identifikator (npr. "OK", "Select", "Accept", ili samo keyCode 13 bez e.key).
   */
  const isOkKey = useCallback(
    (e: KeyboardEvent) =>
      e.key === "Enter" ||
      e.key === "OK" ||
      e.key === "Accept" ||
      e.key === "Select" ||
      e.code === "Enter" ||
      e.code === "NumpadEnter" ||
      e.keyCode === 13,
    [],
  );

  /**
   * Dugi pritisak OK/Enter na omiljenom kanalu otvara uređivanje broja; kratki pokreće program.
   *
   * NAPOMENA O DALJINSKOM UPRAVLJAČU:
   * Ovaj daljinski ne emitira "auto-repeat" evente (svaki keydown stiže s repeat=false čak
   * i kad je tipka fizički držana), pa se dugi/kratki pritisak odlučuje na keyup-u, mjerenjem
   * stvarno proteklog vremena (Date.now() na keydown, razlika na keyup) — umjesto oslanjanja
   * na e.repeat ili na setTimeout koji bi se utrkivao s keyup-om.
   */
  const ENTER_HOLD_MS = 650;
  const enterPressActiveRef = useRef(false);
  const enterPressStartRef = useRef<number | null>(null);
  const enterShortPressActionRef = useRef<(() => void) | null>(null);
  const enterLongPressActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onUp = (e: KeyboardEvent) => {
      if (!isOkKey(e)) return;
      if (!enterPressActiveRef.current) return;
      const start = enterPressStartRef.current;
      enterPressActiveRef.current = false;
      enterPressStartRef.current = null;
      const elapsed = start !== null ? Date.now() - start : 0;
      if (elapsed >= ENTER_HOLD_MS) {
        enterLongPressActionRef.current?.();
      } else {
        enterShortPressActionRef.current?.();
      }
      enterShortPressActionRef.current = null;
      enterLongPressActionRef.current = null;
    };
    // capture: true — ovaj listener mora primiti keyup PRIJE nego što ga eventualno
    // "pojede" stopPropagation() u focus-zone routing sloju (useZoneKeys), koji inače
    // može spriječiti da globalni bubble-fazni listener uopće dobije event.
    window.addEventListener("keyup", onUp, { capture: true });
    return () => {
      window.removeEventListener("keyup", onUp, { capture: true } as EventListenerOptions);
    };
  }, [isOkKey]);

  const [sidebarIndex, setSidebarIndex] = useState(0);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [focusZone, setFocusZone] = useState<FocusZone>("cards");
  const [epgIndex, setEpgIndex] = useState(0);
  const [programIndex, setProgramIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [filterIndex, setFilterIndex] = useState(0);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [showCategories, setShowCategories] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showCameras, setShowCameras] = useState(false);
  const [showRadio, setShowRadio] = useState(false);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [showProfile, setShowProfile] = useState(false);

  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerData | undefined>();

  const { data: dbChannels } = useChannels();
  const channelIds = useMemo(() => dbChannels?.map((c) => c.id) ?? [], [dbChannels]);
  const { data: dbEpg } = useEPGData(channelIds.length > 0 ? channelIds : undefined);

  const liveChannelCards = useMemo(() => {
    if (!dbChannels || dbChannels.length === 0) return [];
    const epgByChannel = new Map<string, typeof dbEpg>();
    if (dbEpg) {
      for (const ep of dbEpg) {
        if (!epgByChannel.has(ep.channel_id)) epgByChannel.set(ep.channel_id, []);
        epgByChannel.get(ep.channel_id)!.push(ep);
      }
    }
    return dbChannels.map((ch) => {
      const programs = epgByChannel.get(ch.id) ?? [];
      const liveProgram = programs.find((p) => p.is_live) ?? programs[0];
      const formatTime = (iso: string) => {
        const d = new Date(iso);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      };
      return {
        id: ch.id,
        title: liveProgram?.title ?? ch.name,
        thumbnail:
          ch.thumbnail_url ?? `https://via.placeholder.com/400x225/1a1a2e/d4af37?text=${encodeURIComponent(ch.name)}`,
        channelName: ch.name,
        timeSlot: liveProgram
          ? `${formatTime(liveProgram.start_time)} - ${formatTime(liveProgram.end_time)}`
          : "00:00 - 00:00",
        channelNumber: String(ch.channel_number),
        streamUrl: ch.stream_url ?? undefined,
        logoUrl: ch.logo_url ?? null,
      };
    });
  }, [dbChannels, dbEpg]);

  const liveEpgChannels: EPGChannel[] = useMemo(() => {
    if (!dbChannels || dbChannels.length === 0 || !dbEpg) return [];
    const epgByChannel = new Map<string, typeof dbEpg>();
    for (const ep of dbEpg) {
      if (!epgByChannel.has(ep.channel_id)) epgByChannel.set(ep.channel_id, []);
      epgByChannel.get(ep.channel_id)!.push(ep);
    }
    const formatTime = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
    };
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.`;

    return dbChannels.map((ch) => {
      const programs = epgByChannel.get(ch.id) ?? [];
      const mappedPrograms = programs.length
        ? programs.map((p) => ({
            title: p.title,
            startTime: formatTime(p.start_time),
            endTime: formatTime(p.end_time),
            date: formatDate(p.start_time),
            isLive: p.is_live ?? false,
          }))
        : [
            {
              title: ch.name,
              startTime: "00:00",
              endTime: "00:00",
              date: todayStr,
              isLive: true,
            },
          ];
      return {
        id: ch.id,
        number: ch.channel_number,
        name: ch.name,
        abbreviation: ch.abbreviation ?? ch.name.slice(0, 3).toUpperCase(),
        logoUrl: ch.logo_url ?? null,
        category: ch.category,
        streamUrl: ch.stream_url ?? undefined,
        programs: mappedPrograms,
      };
    });
  }, [dbChannels, dbEpg]);

  const LIVE_CARDS_COUNT = liveChannelCards.length;
  const LIVE_CARDS_COLS = Math.ceil(LIVE_CARDS_COUNT / CARDS_ROWS);

  const moveCardIndexLive = useCallback(
    (current: number, direction: "left" | "right" | "up" | "down"): number => {
      const col = Math.floor(current / CARDS_ROWS);
      const row = current % CARDS_ROWS;
      switch (direction) {
        case "right": {
          const nextCol = col + 1;
          if (nextCol >= LIVE_CARDS_COLS) return current;
          return Math.min(LIVE_CARDS_COUNT - 1, nextCol * CARDS_ROWS + row);
        }
        case "left": {
          const nextCol = col - 1;
          if (nextCol < 0) return current;
          return nextCol * CARDS_ROWS + row;
        }
        case "down": {
          if (row + 1 >= CARDS_ROWS) return current;
          return Math.min(LIVE_CARDS_COUNT - 1, col * CARDS_ROWS + row + 1);
        }
        case "up": {
          if (row - 1 < 0) return current;
          return col * CARDS_ROWS + row - 1;
        }
      }
    },
    [LIVE_CARDS_COUNT, LIVE_CARDS_COLS],
  );

  const openPlayerFromCard = useCallback((card: (typeof liveChannelCards)[0]) => {
    setPlayerData({
      channelId: card.id,
      channelNumber: card.channelNumber,
      showTitle: card.title,
      timeRange: card.timeSlot,
      thumbnail: card.thumbnail.replace("w=400", "w=1920"),
      channelName: card.channelName,
      streamUrl: card.streamUrl,
      logoUrl: card.logoUrl,
    });
    setPlayerVisible(true);
  }, []);

  const favoriteEpgChannels = useMemo(() => {
    return favorites
      .map((name, idx): EPGChannel | null => {
        const card = liveChannelCards.find((c) => c.channelName === name);
        if (!card) return null;
        const epgChannel = liveEpgChannels.find((ch) => ch.name === card.channelName);
        const [startTime = "00:00", endTime = "00:00"] = card.timeSlot.split(" - ").map((s) => s.trim());
        return {
          id: `favorite-${card.channelName}-${idx}`,
          number: favoriteNumber(card.channelName) || idx + 1,
          name: card.channelName,
          abbreviation: card.channelName.slice(0, 3).toUpperCase(),
          logoUrl: card.logoUrl ?? epgChannel?.logoUrl ?? null,
          category: epgChannel?.category,
          streamUrl: card.streamUrl,
          programs: [{ title: card.title, startTime, endTime, date: "", isLive: true }],
        };
      })
      .filter((channel): channel is EPGChannel => Boolean(channel))
      .sort((a, b) => a.number - b.number);
  }, [favorites, liveEpgChannels, liveChannelCards, favoriteNumber]);

  const playerFavoriteChannels: FavoriteChannel[] = useMemo(() => {
    return favoriteEpgChannels.map((ch) => {
      const card = liveChannelCards.find((c) => c.channelName === ch.name);
      const liveProgram = ch.programs.find((p) => p.isLive) ?? ch.programs[0];
      return {
        number: ch.number,
        channelName: ch.name,
        showTitle: liveProgram?.title ?? ch.name,
        timeRange: liveProgram ? `${liveProgram.startTime} - ${liveProgram.endTime}` : "",
        thumbnail:
          card?.thumbnail?.replace("w=400", "w=1920") ??
          channelThumbnails[ch.name] ??
          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80",
        streamUrl: card?.streamUrl ?? ch.streamUrl,
        logoUrl: card?.logoUrl ?? ch.logoUrl ?? null,
      };
    });
  }, [favoriteEpgChannels, liveChannelCards]);

  const allPlayerChannels: FavoriteChannel[] = useMemo(() => {
    return liveChannelCards.map((card) => ({
      number: parseInt(card.channelNumber, 10),
      channelName: card.channelName,
      showTitle: card.title,
      timeRange: card.timeSlot,
      thumbnail: card.thumbnail.replace("w=400", "w=1920"),
      streamUrl: card.streamUrl,
      logoUrl: card.logoUrl ?? null,
    }));
  }, [liveChannelCards]);

  const handleSwitchChannel = useCallback(
    (next: PlayerData) => {
      const matchedCard = liveChannelCards.find((c) => c.channelName === next.channelName);
      const resolvedStreamUrl =
        next.streamUrl ?? allPlayerChannels.find((c) => c.channelName === next.channelName)?.streamUrl;

      if (!resolvedStreamUrl) {
        console.warn("[Index] handleSwitchChannel: stream_url nije pronađen za", next.channelName);
        return;
      }

      setPlayerData({
        ...next,
        channelId: next.channelId ?? matchedCard?.id,
        streamUrl: resolvedStreamUrl,
      });
    },
    [allPlayerChannels, liveChannelCards],
  );

  const selectedCategoryId = showCategories ? tvCategories[categoryIndex]?.id : null;

  const filteredEpgChannels = useMemo(() => {
    if (!selectedCategoryId) return liveEpgChannels;
    const dbCategories = CATEGORY_TO_DB_MAP[selectedCategoryId];
    if (!dbCategories?.length) return liveEpgChannels;
    return liveEpgChannels.filter((ch) => ch.category && dbCategories.includes(ch.category));
  }, [liveEpgChannels, selectedCategoryId]);

  const activeEpgChannels = showRadio ? radioStations : showFavorites ? favoriteEpgChannels : filteredEpgChannels;

  const openPlayerFromEPG = useCallback(
    (channelIdx: number) => {
      const ch = activeEpgChannels[channelIdx];
      if (!ch) return;
      const liveProgram = ch.programs.find((p) => p.isLive) ?? ch.programs[0];
      setPlayerData({
        channelId: ch.id,
        channelNumber: String(ch.number),
        showTitle: liveProgram?.title ?? ch.name,
        timeRange: liveProgram ? `${liveProgram.startTime} - ${liveProgram.endTime}` : "",
        thumbnail:
          channelThumbnails[ch.name] ?? "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80",
        channelName: ch.name,
        streamUrl: ch.streamUrl,
        logoUrl: ch.logoUrl,
      });
      setPlayerVisible(true);
    },
    [activeEpgChannels],
  );

  const showEPG =
    (showCategories &&
      (focusZone === "categories" || focusZone === "epg" || focusZone === "epgPrograms" || focusZone === "filters")) ||
    (showFavorites &&
      (focusZone === "sidebar" || focusZone === "epg" || focusZone === "epgPrograms" || focusZone === "filters")) ||
    (showRadio &&
      (focusZone === "sidebar" ||
        focusZone === "radio" ||
        focusZone === "epg" ||
        focusZone === "epgPrograms" ||
        focusZone === "filters"));

  const isTvKanaliActive = sidebarIndex === TV_KANALI_INDEX;
  const isRadioActive = sidebarIndex === RADIO_INDEX;
  const isFavoritesActive = sidebarIndex === FAVORITES_INDEX;
  const isCamerasActive = sidebarIndex === CAMERAS_INDEX;
  const isSidebarMini = (showCategories || showFavorites || showCameras || showRadio) && focusZone !== "sidebar";

  const handleSidebarAction = useCallback(
    (index: number) => {
      if (index === FILMOVI_INDEX) {
        navigate("/videoteka");
      } else if (index === SETTINGS_INDEX) {
        navigate("/settings");
      } else if (index === PROFILE_INDEX) {
        setShowProfile(true);
      } else if (index === TV_KANALI_INDEX) {
        setShowCategories(true);
        setShowFavorites(false);
        setShowCameras(false);
        setShowRadio(false);
        setFocusZone("categories");
        setSidebarExpanded(false);
      } else if (index === RADIO_INDEX) {
        setShowRadio(true);
        setShowCategories(false);
        setShowFavorites(false);
        setShowCameras(false);
        setEpgIndex(0);
        setProgramIndex(0);
        setFocusZone("epg");
        setSidebarExpanded(false);
      } else if (index === FAVORITES_INDEX) {
        setShowFavorites(true);
        setShowCategories(false);
        setShowCameras(false);
        setShowRadio(false);
        setEpgIndex(0);
        setProgramIndex(0);
        setFocusZone("epg");
        setSidebarExpanded(false);
      } else if (index === CAMERAS_INDEX) {
        setShowCameras(true);
        setShowCategories(false);
        setShowFavorites(false);
        setShowRadio(false);
        setCameraIndex(0);
        setFocusZone("cameras");
        setSidebarExpanded(false);
      }
    },
    [navigate],
  );

  const selectedChannelPrograms = activeEpgChannels[epgIndex]?.programs ?? [];

  // Kamere grupirane po državi — headeri su statični (nisu klikabilni, ne sklapaju se),
  // kamere su uvijek vidljive.
  const camerasByCountry = useMemo(() => {
    const map = new Map<string, CameraItem[]>();
    for (const cam of liveCameras) {
      if (!map.has(cam.country)) map.set(cam.country, []);
      map.get(cam.country)!.push(cam);
    }
    return CAMERA_COUNTRY_ORDER.filter((c) => map.has(c)).map((country) => ({
      country,
      items: map.get(country)!,
    }));
  }, []);

  // Redovi kamera za navigaciju strelicama: svaka država počinje NOVI red (čak i ako
  // prethodni red nije pun), jer se vizualno tako i prikazuje (zaseban grid po državi).
  // Ovo sprječava da ArrowDown/ArrowUp "preskoči" u pogrešnu državu kad grupe imaju
  // različit broj kamera po redu.
  const cameraRows = useMemo(() => {
    const rows: number[][] = [];
    camerasByCountry.forEach(({ items }) => {
      for (let i = 0; i < items.length; i += CAMERAS_COLS) {
        const rowIndices = items.slice(i, i + CAMERAS_COLS).map((cam) => liveCameras.indexOf(cam));
        rows.push(rowIndices);
      }
    });
    return rows;
  }, [camerasByCountry]);

  const findCameraPosition = useCallback(
    (idx: number): { row: number; col: number } => {
      for (let r = 0; r < cameraRows.length; r++) {
        const c = cameraRows[r].indexOf(idx);
        if (c !== -1) return { row: r, col: c };
      }
      return { row: 0, col: 0 };
    },
    [cameraRows],
  );

  // Ref na svaki "blok" države (header + red kamera) i na SAM scrollable kontejner.
  // Koristi se za automatsko skrolanje kad se fokus pomiče strelicama — jer overflow-y-auto
  // sam po sebi ne prati fokus, treba eksplicitno postaviti scrollTop.
  const cameraGroupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cameraScrollContainerRef = useRef<HTMLDivElement | null>(null);
  // Scrollable kontejner za "Uživo" kartice.
  const cardsScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Ovo je TV aplikacija — scroll mišem/kotačićem ne treba postojati, samo navigacija
  // strelicama. React od v17 dodaje wheel/touch listenere kao PASSIVE po defaultu, pa
  // preventDefault() unutar običnog onWheel propa NEMA efekta (browser ga ignorira).
  // Zato ovdje ručno vežemo native "wheel" listener s { passive: false } na oba
  // scrollable kontejnera — to je jedini pouzdan način da se stvarno blokira scroll
  // kotačićem, dok programski scroll (container.scrollTo() iz navigacije strelicama)
  // ostaje potpuno neovisan i dalje radi normalno.
  useEffect(() => {
    const blockWheel = (e: WheelEvent) => e.preventDefault();
    const targets = [cameraScrollContainerRef.current, cardsScrollContainerRef.current].filter(
      (el): el is HTMLDivElement => el !== null,
    );
    targets.forEach((el) => el.addEventListener("wheel", blockWheel, { passive: false }));
    return () => {
      targets.forEach((el) => el.removeEventListener("wheel", blockWheel));
    };
  }, [showCameras, showCategories, showFavorites, showRadio]);

  // Kad ideš dolje: blok nove fokusirane države poravna se na DNO vidljivog područja
  // (prethodna država ostaje vidljiva iznad, dokle god ima mjesta).
  // Kad ideš gore: blok se poravna na VRH (obrnuti princip).
  //
  // NAPOMENA: namjerno NE koristimo el.scrollIntoView() — taj poziv po defaultu skrola
  // SVE scrollable pretke potrebne da element bude vidljiv, pa je u praksi skrolao
  // cijelu stranicu (nestajao je "Kamere uživo" header i vrh sidebara). Umjesto toga
  // ručno računamo poziciju elementa RELATIVNO na sam scrollable kontejner i mijenjamo
  // isključivo njegov scrollTop — ništa izvan njega se ne pomiče.
  const scrollCameraGroupIntoView = useCallback((camIdx: number, direction: "up" | "down") => {
    const cam = liveCameras[camIdx];
    if (!cam) return;
    const el = cameraGroupRefs.current[cam.country];
    const container = cameraScrollContainerRef.current;
    if (!el || !container) return;

    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const relativeTop = elRect.top - containerRect.top + container.scrollTop;
    const relativeBottom = relativeTop + el.offsetHeight;

    // Ne skrolaj ako je blok već u potpunosti vidljiv unutar containera — inače i
    // najmanji nepotreban pomak (npr. par piksela na prvi pritisak strelice) gura
    // sadržaj gore-dolje bez razloga i uzrokuje da se npr. zastavica/naslov iznad
    // (koji vizualno "curi" izvan svoje kutije zbog uvećanog loga) preklopi s tekstom.
    const isFullyVisible =
      relativeTop >= container.scrollTop && relativeBottom <= container.scrollTop + container.clientHeight;
    if (isFullyVisible) return;

    const targetScrollTop = direction === "down" ? relativeBottom - container.clientHeight : relativeTop;

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: "smooth",
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (playerVisible) return;

      // Editor za dodjelu broja omiljenom kanalu ima prioritet
      if (numberEditor) {
        e.preventDefault();
        e.stopPropagation();
        if (/^\d$/.test(e.key)) {
          setNumberEditor((prev) =>
            prev ? { ...prev, error: "", value: (prev.value + e.key).replace(/^0+/, "").slice(0, 3) } : prev,
          );
          return;
        }
        // Popravka: "OK potvrda" iz popupa je prije provjeravala isključivo e.key === "Enter",
        // pa je OK tipka daljinskog (koja često šalje drugačiji key) tu propuštala potvrdu.
        if (isOkKey(e)) {
          if (e.repeat) return;
          const num = parseInt(numberEditor.value, 10);
          if (isNaN(num) || num <= 0) {
            setNumberEditor(null);
            return;
          }
          const taken = favorites.find((n) => n !== numberEditor.name && favoriteNumber(n) === num);
          if (taken) {
            setNumberEditor((prev) =>
              prev ? { ...prev, value: "", error: t("home.numberTaken", { channel: taken }) } : prev,
            );
            return;
          }
          setFavoriteNumber(numberEditor.name, num);
          setNumberEditor(null);
          return;
        }
        if (e.key === "Backspace") {
          setNumberEditor((prev) => (prev && prev.value ? { ...prev, value: prev.value.slice(0, -1) } : null));
          return;
        }
        if (e.key === "Escape" || e.key === "XF86Back") {
          setNumberEditor(null);
          return;
        }
        return;
      }

      // U listi omiljenih: pritisak na cifru otvara dodjelu broja fokusiranom kanalu.
      // Ovo je pouzdan način koji NE ovisi o detekciji dugog pritiska, pa radi identično
      // na tipkovnici i na daljinskom (dokle god daljinski ima brojčane tipke).
      if (focusZone === "epg" && showFavorites && /^\d$/.test(e.key)) {
        const ch = activeEpgChannels[epgIndex];
        if (ch) {
          e.preventDefault();
          setNumberEditor({ name: ch.name, value: e.key === "0" ? "" : e.key });
          return;
        }
      }

      // Popravka: normaliziramo OK tipku daljinskog na "Enter" prije switcha, jer je
      // switch prije radio isključivo na doslovnom e.key === "Enter".
      const normalizedKey = isOkKey(e) ? "Enter" : e.key;

      switch (normalizedKey) {
        case "ArrowRight":
          e.preventDefault();
          if (focusZone === "sidebar") {
            setSidebarExpanded(false);
            if (isTvKanaliActive && showCategories) {
              setFocusZone("categories");
            } else if (isFavoritesActive && showFavorites) {
              if (activeEpgChannels.length > 0) {
                setFocusZone("epg");
              }
            } else if (isRadioActive && showRadio) {
              setFocusZone("epg");
            } else if (isCamerasActive && showCameras) {
              setFocusZone("cameras");
            } else {
              setFocusZone("cards");
            }
          } else if (focusZone === "categories") {
            setFocusZone("epg");
          } else if (focusZone === "epg") {
            setProgramIndex(0);
            setFocusZone("epgPrograms");
          } else if (focusZone === "filters") {
            setFilterIndex((p) => Math.min(p + 1, 1));
          } else if (focusZone === "cards") {
            setCardIndex((p) => moveCardIndexLive(p, "right"));
          } else if (focusZone === "cameras") {
            const { row, col } = findCameraPosition(cameraIndex);
            const currentRow = cameraRows[row];
            if (currentRow && col + 1 < currentRow.length) {
              setCameraIndex(currentRow[col + 1]);
            }
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (focusZone === "categories") {
            setSidebarExpanded(true);
            setFocusZone("sidebar");
          } else if (focusZone === "epgPrograms") {
            setFocusZone("epg");
          } else if (focusZone === "filters") {
            if (filterIndex === 0) {
              if (showCategories) {
                setFocusZone("categories");
              } else {
                setSidebarExpanded(true);
                setFocusZone("sidebar");
              }
            } else {
              setFilterIndex((p) => Math.max(p - 1, 0));
            }
          } else if (focusZone === "epg") {
            if (showCategories) {
              setFocusZone("categories");
            } else {
              setSidebarExpanded(true);
              setFocusZone("sidebar");
            }
          } else if (focusZone === "cards") {
            const col = Math.floor(cardIndex / CARDS_ROWS);
            if (col === 0) {
              setSidebarExpanded(true);
              setFocusZone("sidebar");
            } else {
              setCardIndex((p) => moveCardIndexLive(p, "left"));
            }
          } else if (focusZone === "cameras") {
            const { row, col } = findCameraPosition(cameraIndex);
            if (col === 0) {
              setSidebarExpanded(true);
              setFocusZone("sidebar");
            } else {
              const currentRow = cameraRows[row];
              setCameraIndex(currentRow[col - 1]);
            }
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (focusZone === "sidebar") {
            setSidebarIndex((p) => Math.min(p + 1, 7));
          } else if (focusZone === "categories") {
            setCategoryIndex((p) => Math.min(p + 1, tvCategories.length - 1));
          } else if (focusZone === "filters") {
            setFocusZone("epg");
          } else if (focusZone === "epg") {
            setEpgIndex((p) => Math.min(p + 1, activeEpgChannels.length - 1));
          } else if (focusZone === "epgPrograms") {
            setProgramIndex((p) => Math.min(p + 1, selectedChannelPrograms.length - 1));
          } else if (focusZone === "cards") {
            setCardIndex((p) => moveCardIndexLive(p, "down"));
          } else if (focusZone === "cameras") {
            const { row, col } = findCameraPosition(cameraIndex);
            const nextRow = cameraRows[row + 1];
            if (nextRow) {
              const targetCol = Math.min(col, nextRow.length - 1);
              const nextIdx = nextRow[targetCol];
              setCameraIndex(nextIdx);
              scrollCameraGroupIntoView(nextIdx, "down");
            }
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (focusZone === "sidebar") {
            setSidebarIndex((p) => Math.max(p - 1, 0));
          } else if (focusZone === "categories") {
            setCategoryIndex((p) => Math.max(p - 1, 0));
          } else if (focusZone === "epg") {
            if (epgIndex === 0) {
              setFocusZone("filters");
            } else {
              setEpgIndex((p) => Math.max(p - 1, 0));
            }
          } else if (focusZone === "epgPrograms") {
            if (programIndex === 0) {
              setFocusZone("filters");
            } else {
              setProgramIndex((p) => Math.max(p - 1, 0));
            }
          } else if (focusZone === "cards") {
            setCardIndex((p) => moveCardIndexLive(p, "up"));
          } else if (focusZone === "cameras") {
            const { row, col } = findCameraPosition(cameraIndex);
            if (row === 0) {
              setSidebarExpanded(true);
              setFocusZone("sidebar");
            } else {
              const prevRow = cameraRows[row - 1];
              const targetCol = Math.min(col, prevRow.length - 1);
              const prevIdx = prevRow[targetCol];
              setCameraIndex(prevIdx);
              scrollCameraGroupIntoView(prevIdx, "up");
            }
          }
          break;

        case "Enter":
          e.preventDefault();
          if (focusZone === "epg" && showFavorites) {
            const favCh = activeEpgChannels[epgIndex];
            if (favCh) {
              // Odluku kratak/dug pritisak donosimo na keyup-u (vidi useEffect gore).
              // Ovdje, na prvi keydown ovog pritiska, zabilježimo trenutak početka i
              // pripremimo obje moguće akcije; enterPressActiveRef sprječava ponovni
              // start dok se tipka ne otpusti.
              if (!enterPressActiveRef.current) {
                enterPressActiveRef.current = true;
                enterPressStartRef.current = Date.now();
                enterShortPressActionRef.current = () => openPlayerFromEPG(epgIndex);
                enterLongPressActionRef.current = () => setNumberEditor({ name: favCh.name, value: "" });
              }
              break;
            }
          }
          if (focusZone === "sidebar") {
            handleSidebarAction(sidebarIndex);
          } else if (focusZone === "categories") {
            console.log("Selected category:", tvCategories[categoryIndex]?.label);
          } else if (focusZone === "epg") {
            openPlayerFromEPG(epgIndex);
          } else if (focusZone === "epgPrograms") {
            openPlayerFromEPG(epgIndex);
          } else if (focusZone === "cards") {
            openPlayerFromCard(liveChannelCards[cardIndex]);
          }
          break;

        case "Escape":
        case "Backspace":
          e.preventDefault();
          if (focusZone === "epgPrograms") {
            setFocusZone("epg");
          } else if (focusZone === "epg" && showFavorites) {
            setShowFavorites(false);
            setSidebarExpanded(true);
            setFocusZone("sidebar");
          } else if (focusZone === "epg" && showRadio) {
            setShowRadio(false);
            setSidebarExpanded(true);
            setFocusZone("sidebar");
          } else if (focusZone === "categories") {
            setShowCategories(false);
            setSidebarExpanded(true);
            setFocusZone("sidebar");
          } else if (focusZone === "cameras") {
            setShowCameras(false);
            setSidebarExpanded(true);
            setFocusZone("sidebar");
          } else {
            window.dispatchEvent(new CustomEvent("app:request-exit"));
          }
          break;
      }
    },
    [
      isOkKey,
      focusZone,
      sidebarIndex,
      epgIndex,
      filterIndex,
      categoryIndex,
      cardIndex,
      cameraIndex,
      cameraRows,
      findCameraPosition,
      scrollCameraGroupIntoView,
      programIndex,
      selectedChannelPrograms,
      handleSidebarAction,
      isTvKanaliActive,
      isRadioActive,
      isFavoritesActive,
      isCamerasActive,
      showCategories,
      showFavorites,
      showRadio,
      showCameras,
      activeEpgChannels,
      playerVisible,
      openPlayerFromCard,
      openPlayerFromEPG,
      moveCardIndexLive,
      liveChannelCards,
      numberEditor,
      setFavoriteNumber,
      favorites,
      favoriteNumber,
      t,
    ],
  );

  useZoneKeys("home", handleKeyDown, !playerVisible && !showProfile, 0);

  useEffect(() => {
    setEpgIndex(0);
    setProgramIndex(0);
  }, [categoryIndex]);

  useEffect(() => {
    if (focusZone === "sidebar") {
      if (sidebarIndex === TV_KANALI_INDEX) {
        setShowCategories(true);
        setShowFavorites(false);
        setShowCameras(false);
        setShowRadio(false);
      } else if (sidebarIndex === RADIO_INDEX) {
        setShowRadio(true);
        setShowCategories(false);
        setShowFavorites(false);
        setShowCameras(false);
      } else if (sidebarIndex === FAVORITES_INDEX) {
        setShowFavorites(true);
        setShowCategories(false);
        setShowCameras(false);
        setShowRadio(false);
      } else if (sidebarIndex === CAMERAS_INDEX) {
        setShowCameras(true);
        setShowCategories(false);
        setShowFavorites(false);
        setShowRadio(false);
      } else {
        setShowCategories(false);
        setShowFavorites(false);
        setShowCameras(false);
        setShowRadio(false);
      }
    }
  }, [sidebarIndex, focusZone]);

  useEffect(() => {
    if (!isTvKanaliActive) setShowCategories(false);
    if (!isRadioActive) setShowRadio(false);
    if (!isFavoritesActive) setShowFavorites(false);
    if (!isCamerasActive) setShowCameras(false);
  }, [isTvKanaliActive, isRadioActive, isFavoritesActive, isCamerasActive]);

  if (showProfile) {
    return (
      <div className="h-screen w-screen relative overflow-hidden">
        <StarryBackground />
        <ProfileSelection onBack={() => setShowProfile(false)} />
      </div>
    );
  }

  if (playerVisible) {
    return (
      <div className="h-screen w-screen relative overflow-hidden bg-background">
        <VideoPlayer
          isVisible={true}
          onClose={() => setPlayerVisible(false)}
          data={playerData}
          isFavorite={isFavorite(playerData?.channelName ?? "")}
          onToggleFavorite={() => toggleFavorite(playerData?.channelName ?? "")}
          favoriteChannels={playerFavoriteChannels}
          allChannels={allPlayerChannels}
          onSwitchChannel={handleSwitchChannel}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="h-screen flex flex-col overflow-hidden relative"
    >
      <StarryBackground />

      <TVHeader />

      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <TVSidebar
          focusedIndex={focusZone === "sidebar" ? sidebarIndex : -1}
          isExpanded={sidebarExpanded}
          isMini={isSidebarMini}
          onItemClick={(i) => {
            setSidebarIndex(i);
            setFocusZone("sidebar");
            setSidebarExpanded(true);
            if (i === FILMOVI_INDEX) {
              navigate("/videoteka");
            } else if (i === SETTINGS_INDEX) {
              navigate("/settings");
            } else if (i === PROFILE_INDEX) {
              setShowProfile(true);
            } else if (i === TV_KANALI_INDEX) {
              setShowCategories(true);
              setShowFavorites(false);
              setShowCameras(false);
              setShowRadio(false);
              setFocusZone("categories");
              setSidebarExpanded(false);
            } else if (i === RADIO_INDEX) {
              setShowRadio(true);
              setShowCategories(false);
              setShowFavorites(false);
              setShowCameras(false);
              setEpgIndex(0);
              setProgramIndex(0);
              setFocusZone("epg");
              setSidebarExpanded(false);
            } else if (i === FAVORITES_INDEX) {
              setShowFavorites(true);
              setShowCategories(false);
              setShowCameras(false);
              setShowRadio(false);
              setEpgIndex(0);
              setProgramIndex(0);
              setFocusZone("epg");
              setSidebarExpanded(false);
            } else if (i === CAMERAS_INDEX) {
              setShowCameras(true);
              setShowCategories(false);
              setShowFavorites(false);
              setShowRadio(false);
              setCameraIndex(0);
              setFocusZone("cameras");
              setSidebarExpanded(false);
            }
          }}
          onItemHover={(i) => {
            setSidebarIndex(i);
            setFocusZone("sidebar");
            setSidebarExpanded(true);
            if (i === TV_KANALI_INDEX) {
              setShowCategories(true);
              setShowFavorites(false);
              setShowCameras(false);
              setShowRadio(false);
            } else if (i === RADIO_INDEX) {
              setShowRadio(true);
              setShowCategories(false);
              setShowFavorites(false);
              setShowCameras(false);
              setEpgIndex(0);
              setProgramIndex(0);
            } else if (i === FAVORITES_INDEX) {
              setShowFavorites(true);
              setShowCategories(false);
              setShowCameras(false);
              setShowRadio(false);
              setEpgIndex(0);
              setProgramIndex(0);
            } else if (i === CAMERAS_INDEX) {
              setShowCameras(true);
              setShowCategories(false);
              setShowFavorites(false);
              setShowRadio(false);
              setCameraIndex(0);
            } else {
              setShowCategories(false);
              setShowFavorites(false);
              setShowCameras(false);
              setShowRadio(false);
            }
          }}
        />

        <TVCategoryMenu
          isVisible={showCategories}
          focusedIndex={focusZone === "categories" ? categoryIndex : -1}
          onItemClick={(i) => {
            setCategoryIndex(i);
            setFocusZone("categories");
          }}
        />

        <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
          <div className={`flex-1 flex flex-col px-4 overflow-hidden relative min-w-0 ${showCameras ? "" : "pb-4"}`}>
            <AnimatePresence mode="wait">
              {showCameras ? (
                <motion.div
                  key="cameras"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="relative z-0 flex items-center mb-4 px-1 h-20 pt-8">
                    <h2 className="text-lg font-semibold text-foreground">{t("home.camerasLive")}</h2>
                    <img
                      src={liveCamsLogo.url}
                      alt="LiveCams"
                      className="absolute left-1/2 -translate-x-1/2 h-12 w-auto scale-[4.5] pointer-events-none"
                    />
                  </div>
                  <div
                    ref={cameraScrollContainerRef}
                    className="relative z-10 flex-1 overflow-y-auto scrollbar-hide pr-1 flex flex-col gap-4"
                  >
                    {camerasByCountry.map(({ country, items }) => {
                      const info = COUNTRY_INFO[country] ?? { name: country };
                      return (
                        <div
                          key={country}
                          ref={(el) => {
                            cameraGroupRefs.current[country] = el;
                          }}
                          className="flex flex-col gap-2 items-center"
                        >
                          {/* Statični header — nije klikabilan, kamere ispod su uvijek vidljive */}
                          <div className="flex items-center gap-2 rounded-md bg-muted/20 ring-1 ring-border/30">
                            <img
                              src={flagImageUrl(country)}
                              alt={info.name}
                              className="w-10 h-10 object-contain"
                              loading="lazy"
                            />
                            <span className="text-2xl font-bold text-foreground">{info.name}</span>
                            <span className="text-lg text-muted-foreground">({items.length})</span>
                          </div>
                          <div className="grid grid-cols-4 gap-3 px-1 w-full">
                            {items.map((cam) => {
                              const i = liveCameras.indexOf(cam);
                              const isFocused = focusZone === "cameras" && cameraIndex === i;
                              return (
                                <motion.div
                                  key={cam.id}
                                  whileHover={{ scale: 1.03 }}
                                  className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                                    isFocused ? "ring-2 ring-accent scale-[1.01] z-10" : "ring-1 ring-border/30"
                                  }`}
                                  onClick={() => {
                                    setFocusZone("cameras");
                                    setCameraIndex(i);
                                  }}
                                >
                                  <div className="aspect-video relative">
                                    <img src={cam.thumbnail} alt={cam.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                      <span className="text-xs font-medium text-foreground">{t("home.liveLabel")}</span>
                                    </div>
                                    <div className="absolute bottom-2 left-2 right-2">
                                      <p className="text-sm font-semibold text-foreground truncate">{cam.name}</p>
                                      <p className="text-xs text-muted-foreground">{cam.location}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : showEPG ? (
                <motion.div
                  key={showFavorites ? "fav-epg" : showRadio ? "radio-epg" : "epg"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {showFavorites && (
                    <h2 className="text-lg font-semibold text-foreground mb-2 px-1">{t("home.favoriteChannels")}</h2>
                  )}
                  {showRadio && (
                    <h2 className="text-lg font-semibold text-foreground mb-2 px-1">{t("home.radioStations")}</h2>
                  )}
                  {activeEpgChannels.length > 0 ? (
                    <EPGGrid
                      channels={activeEpgChannels}
                      focusedIndex={epgIndex}
                      isFocusActive={focusZone === "epg"}
                      focusedProgramIndex={programIndex}
                      isProgramFocused={focusZone === "epgPrograms"}
                      hideSchedule={showRadio}
                      isRadio={showRadio}
                      showNumbers={showFavorites}
                      onChannelClick={(i) => {
                        setFocusZone("epg");
                        setEpgIndex(i);
                        setProgramIndex(0);
                      }}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center px-4 text-center">
                      <p className="text-muted-foreground text-sm">
                        Nemate omiljenih kanala. Dodajte kanale u omiljene putem Video playera.
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="cards"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide min-w-0 w-full px-2 py-2"
                  ref={cardsScrollContainerRef}
                >
                  <TVContentRow
                    title="Uživo"
                    delay={0.1}
                    navigationDisabled={focusZone !== "cards"}
                    focusedIndex={focusZone === "cards" ? cardIndex : undefined}
                  >
                    {liveChannelCards.map((card, i) => (
                      <TVChannelCard
                        key={i}
                        title={card.title}
                        thumbnail={card.thumbnail}
                        channelName={card.channelName}
                        timeSlot={card.timeSlot}
                        logoUrl={card.logoUrl}
                        index={i}
                        isFocused={focusZone === "cards" && cardIndex === i}
                        onClick={() => {
                          setFocusZone("cards");
                          setCardIndex(i);
                          openPlayerFromCard(card);
                        }}
                      />
                    ))}
                  </TVContentRow>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Popup za dodjelu broja omiljenom kanalu */}
      {numberEditor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/60">
          <div className="w-[360px] rounded-2xl border-2 border-accent bg-card/95 px-6 py-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">{t("home.assignNumber")}</p>
            <p className="text-base font-semibold text-foreground mb-4 truncate">{numberEditor.name}</p>
            <div className="text-4xl font-bold tabular-nums text-accent tracking-widest mb-4">
              {numberEditor.value || "—"}
            </div>
            {numberEditor.error ? (
              <p className="text-xs text-destructive">{numberEditor.error}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("home.assignNumberHint")}</p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Index;
