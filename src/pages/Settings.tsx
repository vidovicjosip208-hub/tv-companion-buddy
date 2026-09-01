import { useState, useEffect, useCallback, useRef } from "react";
import { useZoneKeys } from "@/lib/focusZone";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Wifi,
  Monitor,
  Languages,
  ListOrdered,
  ChevronRight,
  Check,
  Lock,
  Delete,
  X,
  Gauge,
  Activity,
  Globe,
  Server,
  Power,
  Timer,
  Brush,
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Radio,
  RefreshCw,
  Fingerprint,
  Home,
  Router,
  Cable,
  ToggleLeft,
  ToggleRight,
  Volume2,
  VolumeX,
  Star,
  LayoutGrid,
  LucideIcon,
  createLucideIcon,
  type IconNode,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import StarryBackground from "@/components/StarryBackground";
import { cn } from "@/lib/utils";
import settingsGearbox from "@/assets/settings-gearbox.png";
import { LANGUAGE_OPTIONS } from "@/i18n";
import {
  DEFAULT_STARTUP_ACTION_SETTINGS,
  loadStartupActionSettings,
  saveStartupActionSettingsLocal,
  type StartupActionSettings,
} from "@/lib/startupAction";

// Prilagođena ikona daljinskog upravljača (lucide nema ugrađenu "Remote" ikonu)
const remoteIconNode: IconNode = [
  ["rect", { x: "7", y: "2", width: "10", height: "20", rx: "3" }],
  ["path", { d: "M12 6.5h.01" }],
  ["path", { d: "M9.5 10h.01" }],
  ["path", { d: "M14.5 10h.01" }],
  ["path", { d: "M12 13h.01" }],
  ["path", { d: "M9.5 16h.01" }],
  ["path", { d: "M14.5 16h.01" }],
];
const Remote = createLucideIcon("remote", remoteIconNode);

const languages = LANGUAGE_OPTIONS;

const VISIBLE_COUNT = 4;
const PIN_LENGTH = 4;

// Raspored numeričke tipkovnice: prazno polje na mjestu gdje nema tipke
const PIN_KEYS: { label: string; type: "digit" | "back" | "empty" }[] = [
  { label: "1", type: "digit" },
  { label: "2", type: "digit" },
  { label: "3", type: "digit" },
  { label: "4", type: "digit" },
  { label: "5", type: "digit" },
  { label: "6", type: "digit" },
  { label: "7", type: "digit" },
  { label: "8", type: "digit" },
  { label: "9", type: "digit" },
  { label: "", type: "empty" },
  { label: "0", type: "digit" },
  { label: "back", type: "back" },
];
const PIN_GRID_COLS = 3;

// Stavke pod "Internet Settings" popisom
const internetItems = [
  { icon: Gauge, label: "Speed test", key: "speedTest" },
  { icon: Activity, label: "Network Status", key: "networkStatus" },
  { icon: Globe, label: "Proxy/VPN postavke", key: "proxyVpn" },
  { icon: Server, label: "DNS postavke", key: "dns" },
];

// Stavke pod "Device Controls" popisom
const deviceItems = [
  { icon: Power, label: "Startup Action", key: "startupAction" },
  { icon: Timer, label: "Auto Sleep Timer", key: "autoSleepTimer" },
  { icon: Remote, label: "Remote Controls", key: "remoteControls" },
  { icon: Brush, label: "Storage & Cache", key: "storageCache" },
];

// ─────────────────────────────────────────────────────────────
// Startup Action — opcije zaslona pri pokretanju i zvuka u pozadini.
// ─────────────────────────────────────────────────────────────

type StartupScreenOption = "favorites" | "home" | "channels";

const STARTUP_SCREEN_OPTIONS: {
  key: StartupScreenOption;
  icon: LucideIcon;
  label: string;
  description: string;
}[] = [
  {
    key: "favorites",
    icon: Star,
    label: "Zadnji gledani kanal u Omiljenima",
    description: "Zadano — otvara Omiljene i odmah fokusira zadnji gledani kanal.",
  },
  {
    key: "home",
    icon: Home,
    label: "Početna stranica",
    description: "Uređaj se pokreće na početnom (Home) zaslonu.",
  },
  {
    key: "channels",
    icon: LayoutGrid,
    label: "TV Kanali (puni ekran)",
    description: "Uređaj se pokreće izravno na popisu TV kanala u punom zaslonu.",
  },
];

type BackgroundAudioOption = "on" | "muted";

const BACKGROUND_AUDIO_OPTIONS: {
  key: BackgroundAudioOption;
  icon: LucideIcon;
  label: string;
  description: string;
}[] = [
  {
    key: "on",
    icon: Volume2,
    label: "Uključeno",
    description: "Zvuk kreće odmah pri pokretanju.",
  },
  {
    key: "muted",
    icon: VolumeX,
    label: "Utišano",
    description: "Bez zvuka dok se ne pritisne kanal ili zatvori izbornik.",
  },
];

// Ukupan broj fokusabilnih redaka na Startup Action ekranu:
// 1 (glavni prekidač) + opcije zaslona + opcije zvuka.
const STARTUP_ROW_COUNT = 1 + STARTUP_SCREEN_OPTIONS.length + BACKGROUND_AUDIO_OPTIONS.length;

// ─────────────────────────────────────────────────────────────
// TODO: Zamijeni ova tri placeholdera stvarnim pozivima prema Supabase
// kad povežeš bazu putem Lovable chata (tablica npr. profiles.parental_pin_hash).
// currentProfile bi trebao doći iz auth/profile konteksta aplikacije.
// ─────────────────────────────────────────────────────────────

async function hasPinSet(currentProfile: string | null): Promise<boolean> {
  // TODO: dohvati iz Supabase je li parental_pin_hash postavljen za currentProfile
  // npr: const { data } = await supabase.from('profiles').select('parental_pin_hash').eq('id', currentProfile).single();
  // return Boolean(data?.parental_pin_hash);
  return false;
}

async function checkAccess(enteredPin: string, currentProfile: string | null): Promise<boolean> {
  // Funkcija provjerava uneseni PIN s onim iz profila
  // TODO: pozovi Supabase (npr. supabase.rpc('check_parental_pin', { pin: enteredPin, profile_id: currentProfile }))
  return false;
}

async function savePin(newPin: string, currentProfile: string | null): Promise<void> {
  // TODO: spremi (hashirano) u Supabase
  // npr: await supabase.from('profiles').update({ parental_pin_hash: hash(newPin) }).eq('id', currentProfile);
}

// ─────────────────────────────────────────────────────────────
// Startup Action — postavke se čuvaju lokalno na uređaju (src/lib/startupAction.ts),
// pa ih početni zaslon (Index) može pročitati pri pokretanju aplikacije.
// ─────────────────────────────────────────────────────────────

async function fetchStartupActionSettings(currentProfile: string | null): Promise<StartupActionSettings> {
  return loadStartupActionSettings();
}

async function saveStartupActionSettings(
  settings: StartupActionSettings,
  currentProfile: string | null,
): Promise<void> {
  saveStartupActionSettingsLocal(settings);
}

// ─────────────────────────────────────────────────────────────
// Speed test — simulacija (zamijeni stvarnim mjerenjem kad bude dostupno,
// npr. pozivom prema vlastitom /speedtest endpointu ili nekom servisu).
// ─────────────────────────────────────────────────────────────

type SpeedTestPhase = "idle" | "ping" | "download" | "upload" | "done";

interface SpeedTestResult {
  ping: number;
  download: number;
  upload: number;
}

const SPEED_TEST_MAX_MBPS = 500;

const SPEED_PHASE_LABELS: Record<SpeedTestPhase, string> = {
  idle: "Spreman za testiranje brzine",
  ping: "Mjerenje odziva (ping)...",
  download: "Mjerenje brzine preuzimanja...",
  upload: "Mjerenje brzine slanja...",
  done: "Test završen",
};

// ─────────────────────────────────────────────────────────────
// Network status — dohvat mrežnih podataka o uređaju.
// Preglednik (web) nema pristup MAC adresi / gateway-u / lokalnoj IP adresi,
// pa se ovi podaci u pravoj implementaciji moraju dohvatiti sa strane
// uređaja/OS-a (npr. Electron/Tizen/WebOS native most ili backend servis
// koji čita mrežno sučelje). Do tada vraćamo simulirane podatke kako bi UI
// bio potpuno funkcionalan.
// ─────────────────────────────────────────────────────────────

type ConnectionType = "ethernet" | "wifi";

interface NetworkStatusInfo {
  mac: string;
  localIp: string;
  publicIp: string;
  gateway: string;
  connectionType: ConnectionType;
}

async function fetchNetworkStatus(): Promise<NetworkStatusInfo> {
  // TODO: zamijeni stvarnim sustavskim/native pozivom koji čita mrežno sučelje uređaja
  // (MAC, lokalna IP, gateway, tip veze). Javna IP adresa se realno može dohvatiti
  // i s klijenta (npr. poziv prema vanjskom "what is my ip" servisu).
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    mac: "A4:5E:60:3B:2C:19",
    localIp: "192.168.1.15",
    publicIp: "93.142.xxx.xxx",
    gateway: "192.168.1.1",
    connectionType: "ethernet",
  };
}

const Settings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // TODO: zamijeni pravim ID-em trenutnog profila iz auth/profile konteksta
  const currentProfile: string | null = null;

  const menuItems = [
    { icon: ShieldCheck, label: t("settings.parental"), key: "parental" },
    { icon: Wifi, label: t("settings.internet"), key: "internet" },
    { icon: Monitor, label: t("settings.device"), key: "device" },
    { icon: Languages, label: t("settings.language"), key: "language" },
    { icon: ListOrdered, label: t("settings.changeList"), key: "changeList" },
  ];

  const initialLangIdx = Math.max(
    0,
    languages.findIndex((l) => l.code === i18n.language),
  );
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [view, setView] = useState<
    "menu" | "language" | "internet" | "device" | "speedtest" | "networkstatus" | "startupaction"
  >("menu");
  const [langFocused, setLangFocused] = useState(initialLangIdx);
  const [selectedLang, setSelectedLang] = useState(initialLangIdx);
  const [scrollStart, setScrollStart] = useState(0);
  const [menuScrollStart, setMenuScrollStart] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Internet Settings podizbornik
  const [internetFocused, setInternetFocused] = useState(0);
  const [internetScrollStart, setInternetScrollStart] = useState(0);

  // Device Controls podizbornik
  const [deviceFocused, setDeviceFocused] = useState(0);
  const [deviceScrollStart, setDeviceScrollStart] = useState(0);

  // Startup Action podizbornik
  const [startupSettings, setStartupSettings] = useState<StartupActionSettings>(DEFAULT_STARTUP_ACTION_SETTINGS);
  const [startupFocused, setStartupFocused] = useState(0);
  const [startupLoading, setStartupLoading] = useState(false);
  const startupRunIdRef = useRef(0);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinFocusedKey, setPinFocusedKey] = useState(0);
  const [pinSuccess, setPinSuccess] = useState(false);
  // "loading" dok provjeravamo ima li profil već postavljen PIN,
  // "verify" traži postojeći PIN prije nego dopusti promjenu,
  // "set" je korak upisa novog PIN-a
  const [pinStage, setPinStage] = useState<"loading" | "verify" | "set">("loading");
  const [pinError, setPinError] = useState("");
  const [isPinBusy, setIsPinBusy] = useState(false);

  // Speed test state
  const [stPhase, setStPhase] = useState<SpeedTestPhase>("idle");
  const [stLive, setStLive] = useState(0);
  const [stResult, setStResult] = useState<SpeedTestResult>({ ping: 0, download: 0, upload: 0 });
  const stTimeoutsRef = useRef<number[]>([]);
  const stRunIdRef = useRef(0);

  // Network status state
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusInfo | null>(null);
  const [networkStatusLoading, setNetworkStatusLoading] = useState(false);
  const nsRunIdRef = useRef(0);

  const applyLang = (idx: number) => {
    setSelectedLang(idx);
    i18n.changeLanguage(languages[idx].code);
  };

  const clearSpeedTestTimers = useCallback(() => {
    stTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    stTimeoutsRef.current = [];
  }, []);

  const animateSpeedValue = useCallback((target: number, durationMs: number, runId: number, onDone: () => void) => {
    const startTime = performance.now();
    const step = (now: number) => {
      if (stRunIdRef.current !== runId) return; // test je otkazan/napušten, prekini animaciju
      const t = Math.min((now - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const jitter = t < 1 ? (Math.random() - 0.5) * target * 0.05 : 0;
      setStLive(Math.max(0, eased * target + jitter));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        setStLive(target);
        onDone();
      }
    };
    requestAnimationFrame(step);
  }, []);

  const startSpeedTest = useCallback(() => {
    clearSpeedTestTimers();
    const runId = ++stRunIdRef.current;
    setStResult({ ping: 0, download: 0, upload: 0 });
    setStLive(0);
    setStPhase("ping");

    const pingValue = Math.round(8 + Math.random() * 24); // 8–32 ms
    const downloadValue = Math.round(60 + Math.random() * 340); // 60–400 Mb/s
    const uploadValue = Math.round(15 + Math.random() * 120); // 15–135 Mb/s

    const pingTimeout = window.setTimeout(() => {
      if (stRunIdRef.current !== runId) return;
      setStResult((r) => ({ ...r, ping: pingValue }));
      setStPhase("download");
      setStLive(0);
      animateSpeedValue(downloadValue, 2600, runId, () => {
        if (stRunIdRef.current !== runId) return;
        setStResult((r) => ({ ...r, download: downloadValue }));
        setStPhase("upload");
        setStLive(0);
        animateSpeedValue(uploadValue, 2200, runId, () => {
          if (stRunIdRef.current !== runId) return;
          setStResult((r) => ({ ...r, upload: uploadValue }));
          setStPhase("done");
        });
      });
    }, 900);
    stTimeoutsRef.current.push(pingTimeout);
  }, [animateSpeedValue, clearSpeedTestTimers]);

  const resetSpeedTest = useCallback(() => {
    clearSpeedTestTimers();
    stRunIdRef.current += 1; // poništi sve rAF petlje u tijeku
    setStPhase("idle");
    setStLive(0);
  }, [clearSpeedTestTimers]);

  const openSpeedTest = useCallback(() => {
    resetSpeedTest();
    setStResult({ ping: 0, download: 0, upload: 0 });
    setView("speedtest");
  }, [resetSpeedTest]);

  const openNetworkStatus = useCallback(() => {
    const runId = ++nsRunIdRef.current;
    setView("networkstatus");
    setNetworkStatus(null);
    setNetworkStatusLoading(true);
    fetchNetworkStatus().then((data) => {
      if (nsRunIdRef.current !== runId) return; // prikaz je napušten u međuvremenu
      setNetworkStatus(data);
      setNetworkStatusLoading(false);
    });
  }, []);

  const openStartupAction = useCallback(() => {
    const runId = ++startupRunIdRef.current;
    setView("startupaction");
    setStartupFocused(0);
    setStartupLoading(true);
    fetchStartupActionSettings(currentProfile).then((data) => {
      if (startupRunIdRef.current !== runId) return; // prikaz je napušten u međuvremenu
      setStartupSettings(data);
      setStartupLoading(false);
    });
  }, [currentProfile]);

  // Zajednički helper koji odmah ažurira lokalno stanje i sprema promjenu.
  const updateStartupSettings = useCallback(
    (updater: (prev: StartupActionSettings) => StartupActionSettings) => {
      setStartupSettings((prev) => {
        const next = updater(prev);
        saveStartupActionSettings(next, currentProfile);
        return next;
      });
    },
    [currentProfile],
  );

  const toggleStartupEnabled = useCallback(() => {
    updateStartupSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, [updateStartupSettings]);

  const selectStartupScreen = useCallback(
    (screen: StartupScreenOption) => {
      updateStartupSettings((prev) => ({ ...prev, screen }));
    },
    [updateStartupSettings],
  );

  const selectBackgroundAudio = useCallback(
    (backgroundAudio: BackgroundAudioOption) => {
      updateStartupSettings((prev) => ({ ...prev, backgroundAudio }));
    },
    [updateStartupSettings],
  );

  // index 0 = glavni prekidač, 1-3 = ekran pri pokretanju, 4-5 = zvuk u pozadini
  const handleStartupRowActivate = useCallback(
    (index: number) => {
      if (index === 0) {
        toggleStartupEnabled();
        return;
      }
      if (!startupSettings.enabled) return; // opcije su zaključane dok je Startup Action isključen
      if (index >= 1 && index <= STARTUP_SCREEN_OPTIONS.length) {
        selectStartupScreen(STARTUP_SCREEN_OPTIONS[index - 1].key);
      } else {
        const audioIndex = index - (1 + STARTUP_SCREEN_OPTIONS.length);
        if (audioIndex >= 0 && audioIndex < BACKGROUND_AUDIO_OPTIONS.length) {
          selectBackgroundAudio(BACKGROUND_AUDIO_OPTIONS[audioIndex].key);
        }
      }
    },
    [startupSettings.enabled, toggleStartupEnabled, selectStartupScreen, selectBackgroundAudio],
  );

  useEffect(() => {
    return () => {
      clearSpeedTestTimers();
      stRunIdRef.current += 1;
      nsRunIdRef.current += 1;
      startupRunIdRef.current += 1;
    };
  }, [clearSpeedTestTimers]);

  const handleInternetItemSelect = useCallback(
    (key: string) => {
      if (key === "speedTest") {
        openSpeedTest();
        return;
      }
      if (key === "networkStatus") {
        openNetworkStatus();
        return;
      }
      // TODO: poveži ostale stavke sa stvarnom akcijom/rutom
      // npr. navigate(`/settings/internet/${key}`) ili otvori odgovarajući modal
    },
    [openSpeedTest, openNetworkStatus],
  );

  const handleDeviceItemSelect = useCallback(
    (key: string) => {
      if (key === "startupAction") {
        openStartupAction();
        return;
      }
      // TODO: poveži ostale stavke sa stvarnom akcijom/rutom
      // npr. navigate(`/settings/device/${key}`) ili otvori odgovarajući modal
    },
    [openStartupAction],
  );

  const openInternetSettings = useCallback(() => {
    setView("internet");
    setInternetFocused(0);
    setInternetScrollStart(0);
  }, []);

  const openDeviceControls = useCallback(() => {
    setView("device");
    setDeviceFocused(0);
    setDeviceScrollStart(0);
  }, []);

  const closePinModal = useCallback(() => {
    setShowPinModal(false);
    setPinValue("");
    setPinFocusedKey(0);
    setPinSuccess(false);
    setPinStage("loading");
    setPinError("");
    setIsPinBusy(false);
  }, []);

  const openParentalControls = useCallback(async () => {
    setShowPinModal(true);
    setPinValue("");
    setPinFocusedKey(0);
    setPinSuccess(false);
    setPinError("");
    setPinStage("loading");
    const alreadySet = await hasPinSet(currentProfile);
    setPinStage(alreadySet ? "verify" : "set");
  }, [currentProfile]);

  const appendPinDigit = useCallback((digit: string) => {
    setPinValue((prev) => (prev.length >= PIN_LENGTH ? prev : prev + digit));
  }, []);

  const removePinDigit = useCallback(() => {
    setPinValue((prev) => prev.slice(0, -1));
  }, []);

  const handlePinKeyPress = useCallback(
    (key: { label: string; type: "digit" | "back" | "empty" }) => {
      if (pinSuccess || isPinBusy || pinStage === "loading") return;
      if (key.type === "digit") {
        appendPinDigit(key.label);
      } else if (key.type === "back") {
        removePinDigit();
      }
    },
    [pinSuccess, isPinBusy, pinStage, appendPinDigit, removePinDigit],
  );

  // Kad se skupi puni PIN, provjeri (stage "verify") ili spremi novi (stage "set")
  useEffect(() => {
    if (pinValue.length !== PIN_LENGTH || pinStage === "loading" || pinSuccess) return;

    let cancelled = false;

    const process = async () => {
      setIsPinBusy(true);
      setPinError("");

      if (pinStage === "verify") {
        // Bez unosa ispravnog starog PIN-a se ne može ići dalje na postavljanje novog
        const isPinCorrect = await checkAccess(pinValue, currentProfile);
        if (cancelled) return;
        if (isPinCorrect) {
          setPinStage("set");
          setPinValue("");
        } else {
          setPinError("Pogrešan PIN, pokušajte ponovno.");
          setPinValue("");
        }
      } else if (pinStage === "set") {
        await savePin(pinValue, currentProfile);
        if (cancelled) return;
        setPinSuccess(true);
        window.setTimeout(() => {
          if (!cancelled) closePinModal();
        }, 900);
      }

      if (!cancelled) setIsPinBusy(false);
    };

    process();

    return () => {
      cancelled = true;
    };
  }, [pinValue, pinStage, pinSuccess, currentProfile, closePinModal]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // PIN popup ima prioritet nad ostalom navigacijom
      if (showPinModal) {
        if (pinSuccess || isPinBusy || pinStage === "loading") return;

        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          appendPinDigit(e.key);
          return;
        }

        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            setPinFocusedKey((prev) => Math.min(prev + 1, PIN_KEYS.length - 1));
            break;
          case "ArrowLeft":
            e.preventDefault();
            setPinFocusedKey((prev) => Math.max(prev - 1, 0));
            break;
          case "ArrowDown":
            e.preventDefault();
            setPinFocusedKey((prev) => Math.min(prev + PIN_GRID_COLS, PIN_KEYS.length - 1));
            break;
          case "ArrowUp":
            e.preventDefault();
            setPinFocusedKey((prev) => Math.max(prev - PIN_GRID_COLS, 0));
            break;
          case "Enter":
            e.preventDefault();
            handlePinKeyPress(PIN_KEYS[pinFocusedKey]);
            break;
          case "Backspace":
            e.preventDefault();
            removePinDigit();
            break;
          case "Escape":
            e.preventDefault();
            closePinModal();
            break;
        }
        return;
      }

      if (view === "speedtest") {
        switch (e.key) {
          case "Enter":
            e.preventDefault();
            if (stPhase === "idle" || stPhase === "done") startSpeedTest();
            break;
          case "Backspace":
          case "Escape":
            e.preventDefault();
            resetSpeedTest();
            setView("internet");
            break;
        }
        return;
      }

      if (view === "networkstatus") {
        switch (e.key) {
          case "Backspace":
          case "Escape":
            e.preventDefault();
            nsRunIdRef.current += 1;
            setView("internet");
            break;
        }
        return;
      }

      if (view === "startupaction") {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setStartupFocused((prev) => Math.min(prev + 1, STARTUP_ROW_COUNT - 1));
            break;
          case "ArrowUp":
            e.preventDefault();
            setStartupFocused((prev) => Math.max(prev - 1, 0));
            break;
          case "Backspace":
          case "Escape":
            e.preventDefault();
            startupRunIdRef.current += 1;
            setView("device");
            break;
          case "Enter":
            e.preventDefault();
            if (!startupLoading) handleStartupRowActivate(startupFocused);
            break;
        }
        return;
      }

      if (view === "internet") {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setInternetFocused((prev) => {
              const next = Math.min(prev + 1, internetItems.length - 1);
              setInternetScrollStart((s) => (next >= s + VISIBLE_COUNT ? next - VISIBLE_COUNT + 1 : s));
              return next;
            });
            break;
          case "ArrowUp":
            e.preventDefault();
            setInternetFocused((prev) => {
              const next = Math.max(prev - 1, 0);
              setInternetScrollStart((s) => (next < s ? next : s));
              return next;
            });
            break;
          case "Backspace":
          case "Escape":
            e.preventDefault();
            setView("menu");
            break;
          case "Enter":
            e.preventDefault();
            handleInternetItemSelect(internetItems[internetFocused].key);
            break;
        }
        return;
      }

      if (view === "device") {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setDeviceFocused((prev) => {
              const next = Math.min(prev + 1, deviceItems.length - 1);
              setDeviceScrollStart((s) => (next >= s + VISIBLE_COUNT ? next - VISIBLE_COUNT + 1 : s));
              return next;
            });
            break;
          case "ArrowUp":
            e.preventDefault();
            setDeviceFocused((prev) => {
              const next = Math.max(prev - 1, 0);
              setDeviceScrollStart((s) => (next < s ? next : s));
              return next;
            });
            break;
          case "Backspace":
          case "Escape":
            e.preventDefault();
            setView("menu");
            break;
          case "Enter":
            e.preventDefault();
            handleDeviceItemSelect(deviceItems[deviceFocused].key);
            break;
        }
        return;
      }

      if (view === "language") {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setLangFocused((prev) => {
              const next = Math.min(prev + 1, languages.length - 1);
              setScrollStart((s) => {
                if (next >= s + VISIBLE_COUNT) return next - VISIBLE_COUNT + 1;
                return s;
              });
              return next;
            });
            break;
          case "ArrowUp":
            e.preventDefault();
            setLangFocused((prev) => {
              const next = Math.max(prev - 1, 0);
              setScrollStart((s) => (next < s ? next : s));
              return next;
            });
            break;
          case "Backspace":
          case "Escape":
            e.preventDefault();
            setView("menu");
            break;
          case "Enter":
            e.preventDefault();
            applyLang(langFocused);
            break;
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.min(prev + 1, menuItems.length - 1);
            setMenuScrollStart((s) => (next >= s + VISIBLE_COUNT ? next - VISIBLE_COUNT + 1 : s));
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            setMenuScrollStart((s) => (next < s ? next : s));
            return next;
          });
          break;
        case "Backspace":
        case "Escape":
          e.preventDefault();
          navigate("/");
          break;
        case "Enter":
          e.preventDefault();
          if (menuItems[focusedIndex].key === "language") {
            setView("language");
            setLangFocused(selectedLang);
            setScrollStart(Math.max(0, Math.min(selectedLang, languages.length - VISIBLE_COUNT)));
          } else if (menuItems[focusedIndex].key === "parental") {
            openParentalControls();
          } else if (menuItems[focusedIndex].key === "internet") {
            openInternetSettings();
          } else if (menuItems[focusedIndex].key === "device") {
            openDeviceControls();
          }
          break;
      }
    },
    [
      focusedIndex,
      navigate,
      view,
      langFocused,
      selectedLang,
      internetFocused,
      handleInternetItemSelect,
      openInternetSettings,
      deviceFocused,
      handleDeviceItemSelect,
      openDeviceControls,
      showPinModal,
      pinSuccess,
      isPinBusy,
      pinStage,
      pinFocusedKey,
      appendPinDigit,
      removePinDigit,
      closePinModal,
      handlePinKeyPress,
      openParentalControls,
      stPhase,
      startSpeedTest,
      resetSpeedTest,
      startupFocused,
      startupLoading,
      handleStartupRowActivate,
    ],
  );

  useZoneKeys("settings", handleKeyDown, true, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen flex flex-row relative overflow-hidden"
    >
      <StarryBackground />

      {view === "speedtest" ? (
        <SpeedTestView
          phase={stPhase}
          liveValue={stLive}
          result={stResult}
          onBack={() => {
            resetSpeedTest();
            setView("internet");
          }}
          onStart={startSpeedTest}
        />
      ) : view === "networkstatus" ? (
        <NetworkStatusView
          loading={networkStatusLoading}
          data={networkStatus}
          onBack={() => {
            nsRunIdRef.current += 1;
            setView("internet");
          }}
        />
      ) : view === "startupaction" ? (
        <StartupActionView
          loading={startupLoading}
          settings={startupSettings}
          focusedIndex={startupFocused}
          onFocusChange={setStartupFocused}
          onActivateRow={handleStartupRowActivate}
          onBack={() => {
            startupRunIdRef.current += 1;
            setView("device");
          }}
        />
      ) : (
        <>
          {/* Left side - Welcome */}
          <div className="relative z-10 flex-1 pt-16 px-16">
            <h1 className="text-4xl font-light text-foreground mb-3">
              {view === "language"
                ? t("settings.languageTitle")
                : view === "internet"
                  ? "Internet postavke"
                  : view === "device"
                    ? "Postavke uređaja"
                    : t("settings.title")}
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
              {view === "language"
                ? t("settings.languageSubtitle")
                : view === "internet"
                  ? "Provjerite brzinu i status mreže te upravljajte naprednim postavkama."
                  : view === "device"
                    ? "Upravljajte pokretanjem, uštedom energije, daljinskim upravljačem i memorijom."
                    : t("settings.subtitle")}
            </p>
            <img
              src={settingsGearbox}
              alt="Settings gearbox"
              width={320}
              height={320}
              className="absolute left-16 top-[-30px] w-[600px] h-auto object-fill"
            />
          </div>

          {/* Right side */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pr-16 pl-8">
            {view === "menu" ? (
              <div className="overflow-hidden" style={{ maxHeight: `${VISIBLE_COUNT * 56}px` }}>
                <div
                  className="flex flex-col gap-1 transition-transform duration-200"
                  style={{ transform: `translateY(-${menuScrollStart * 56}px)` }}
                >
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    const isFocused = focusedIndex === index;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setFocusedIndex(index);
                          setMenuScrollStart(Math.max(0, Math.min(index, menuItems.length - VISIBLE_COUNT)));
                          if (item.key === "language") {
                            setView("language");
                            setLangFocused(selectedLang);
                            setScrollStart(Math.max(0, Math.min(selectedLang, languages.length - VISIBLE_COUNT)));
                          } else if (item.key === "parental") {
                            openParentalControls();
                          } else if (item.key === "internet") {
                            openInternetSettings();
                          } else if (item.key === "device") {
                            openDeviceControls();
                          }
                        }}
                        className={cn(
                          "flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all text-left group h-[52px]",
                          isFocused
                            ? "bg-white/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                        )}
                      >
                        <Icon className={cn("w-5 h-5 shrink-0", isFocused ? "text-accent" : "text-muted-foreground")} />
                        <span className={cn("flex-1 text-[18px]", isFocused && "font-medium")}>{item.label}</span>
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 shrink-0 transition-opacity",
                            isFocused ? "opacity-100" : "opacity-40",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : view === "internet" ? (
              <div className="overflow-hidden" style={{ maxHeight: `${VISIBLE_COUNT * 56}px` }}>
                <div
                  className="flex flex-col gap-1 transition-transform duration-200"
                  style={{ transform: `translateY(-${internetScrollStart * 56}px)` }}
                >
                  {internetItems.map((item, index) => {
                    const Icon = item.icon;
                    const isFocused = internetFocused === index;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setInternetFocused(index);
                          handleInternetItemSelect(item.key);
                        }}
                        className={cn(
                          "flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all text-left h-[52px]",
                          isFocused
                            ? "bg-white/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                        )}
                      >
                        <Icon className={cn("w-5 h-5 shrink-0", isFocused ? "text-accent" : "text-muted-foreground")} />
                        <span className={cn("flex-1 text-[18px]", isFocused && "font-medium")}>{item.label}</span>
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 shrink-0 transition-opacity",
                            isFocused ? "opacity-100" : "opacity-40",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : view === "device" ? (
              <div className="overflow-hidden" style={{ maxHeight: `${VISIBLE_COUNT * 56}px` }}>
                <div
                  className="flex flex-col gap-1 transition-transform duration-200"
                  style={{ transform: `translateY(-${deviceScrollStart * 56}px)` }}
                >
                  {deviceItems.map((item, index) => {
                    const Icon = item.icon;
                    const isFocused = deviceFocused === index;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setDeviceFocused(index);
                          handleDeviceItemSelect(item.key);
                        }}
                        className={cn(
                          "flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all text-left h-[52px]",
                          isFocused
                            ? "bg-white/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                        )}
                      >
                        <Icon className={cn("w-5 h-5 shrink-0", isFocused ? "text-accent" : "text-muted-foreground")} />
                        <span className={cn("flex-1 text-[18px]", isFocused && "font-medium")}>{item.label}</span>
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 shrink-0 transition-opacity",
                            isFocused ? "opacity-100" : "opacity-40",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="overflow-hidden" style={{ maxHeight: `${VISIBLE_COUNT * 56}px` }}>
                <div
                  className="flex flex-col gap-1 transition-transform duration-200"
                  style={{ transform: `translateY(-${scrollStart * 56}px)` }}
                >
                  {languages.map((lang, index) => {
                    const isFocused = langFocused === index;
                    const isSelected = selectedLang === index;
                    return (
                      <button
                        key={lang.code}
                        ref={(el) => {
                          itemRefs.current[index] = el;
                        }}
                        onClick={() => {
                          setLangFocused(index);
                          applyLang(index);
                        }}
                        className={cn(
                          "flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all text-left h-[52px]",
                          isFocused
                            ? "bg-white/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                        )}
                      >
                        <Check
                          className={cn("w-5 h-5 shrink-0", isSelected ? "text-accent opacity-100" : "opacity-0")}
                        />
                        <span className={cn("flex-1 text-[18px]", isFocused && "font-medium")}>{lang.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-sm mx-4 rounded-3xl border border-border/40 bg-[#0d0d0f] shadow-2xl shadow-black/60 px-8 py-10 flex flex-col items-center"
            >
              {/* Close button */}
              <button
                onClick={closePinModal}
                aria-label="Zatvori"
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Lock icon */}
              <div className="w-20 h-20 rounded-full bg-accent/15 border-2 border-accent flex items-center justify-center shadow-lg shadow-accent/20 mb-5">
                <Lock className="w-9 h-9 text-accent" />
              </div>

              <h2 className="text-xl font-bold text-foreground mb-1.5">Roditeljska kontrola</h2>
              <p className="text-sm text-muted-foreground text-center mb-2">
                {pinSuccess
                  ? "PIN uspješno postavljen"
                  : pinStage === "loading"
                    ? "Provjera..."
                    : pinStage === "verify"
                      ? "Unesite trenutni PIN kod"
                      : "Postavite novi četveroznamenkasti PIN kod"}
              </p>

              {pinError && !pinSuccess && <p className="text-sm text-red-400 text-center mb-2">{pinError}</p>}

              {/* PIN dots */}
              <div className="flex items-center gap-4 mb-8 mt-2">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                  const filled = i < pinValue.length;
                  return (
                    <motion.div
                      key={i}
                      animate={{ scale: filled ? 1 : 0.85 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "w-4 h-4 rounded-full border-2 transition-colors duration-150",
                        pinSuccess || filled ? "bg-accent border-accent" : "bg-transparent border-border/60",
                      )}
                    />
                  );
                })}
              </div>

              {pinSuccess ? (
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/15 border-2 border-accent">
                  <Check className="w-8 h-8 text-accent" />
                </div>
              ) : (
                <div
                  className={cn(
                    "grid grid-cols-3 gap-3",
                    (isPinBusy || pinStage === "loading") && "opacity-50 pointer-events-none",
                  )}
                >
                  {PIN_KEYS.map((key, index) => {
                    if (key.type === "empty") {
                      return <div key={index} className="w-16 h-16" />;
                    }
                    const isFocused = pinFocusedKey === index;
                    return (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setPinFocusedKey(index);
                          handlePinKeyPress(key);
                        }}
                        className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center text-lg font-medium transition-all duration-150 border",
                          isFocused
                            ? "bg-accent text-black border-accent ring-2 ring-accent/40"
                            : "bg-muted/30 text-foreground border-border/40 hover:border-border hover:bg-muted/50",
                        )}
                      >
                        {key.type === "back" ? <Delete className="w-5 h-5" /> : key.label}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// Speed test — prezentacijske komponente
// ─────────────────────────────────────────────────────────────

interface SpeedTestViewProps {
  phase: SpeedTestPhase;
  liveValue: number;
  result: SpeedTestResult;
  onBack: () => void;
  onStart: () => void;
}

const SpeedGauge = ({ value, max, unit }: { value: number; max: number; unit: string }) => {
  const clamped = Math.min(Math.max(value, 0), max);
  const cx = 160;
  const cy = 165;
  const radius = 118;
  // Kao na referenci: luk počinje dolje-lijevo i završava dolje-desno (praznina na dnu).
  const startAngle = 145;
  const sweep = 250;

  const angleFor = (v: number) => startAngle + (Math.min(Math.max(v, 0), max) / max) * sweep;
  const polar = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const fullCircumference = 2 * Math.PI * radius;
  const arcLength = (sweep / 360) * fullCircumference;
  const progressLength = (clamped / max) * arcLength;

  // 8 podjela s brojevima, isti raspored kao na referentnom brzinomjeru.
  const divisions = 8;
  const step = max / divisions;
  const labels: number[] = [];
  for (let i = 0; i <= divisions; i++) labels.push(Math.round(i * step));

  const needleAngle = angleFor(clamped);
  const tip = polar(needleAngle, radius - 34);
  const baseL = polar(needleAngle + 90, 9);
  const baseR = polar(needleAngle - 90, 9);

  return (
    <svg viewBox="0 0 320 320" className="w-[280px] h-[280px] md:w-[320px] md:h-[320px]">
      {/* Neaktivni dio ljestvice */}
      <g transform={`translate(${cx},${cy}) rotate(${startAngle})`}>
        <circle
          r={radius}
          fill="none"
          strokeWidth={22}
          strokeLinecap="round"
          className="stroke-white/10"
          strokeDasharray={`${arcLength} ${fullCircumference}`}
        />
        {/* Aktivni (obojeni) dio ljestvice */}
        <circle
          r={radius}
          fill="none"
          strokeWidth={22}
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={`${progressLength} ${fullCircumference}`}
          style={{ transition: "stroke-dasharray 0.2s linear" }}
        />
      </g>

      {/* Brojevi unutar luka */}
      {labels.map((v) => {
        const lp = polar(angleFor(v), radius - 38);
        const passed = clamped >= v;
        return (
          <text
            key={`lb-${v}`}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className={passed ? "fill-foreground" : "fill-muted-foreground"}
            style={{ fontSize: 15, fontWeight: 700 }}
          >
            {v}
          </text>
        );
      })}

      {/* Kazaljka */}
      <g style={{ transition: "all 0.2s linear" }}>
        <polygon points={`${tip.x},${tip.y} ${baseL.x},${baseL.y} ${baseR.x},${baseR.y}`} className="fill-foreground" />
      </g>
      {/* Središnji nosač */}
      <circle cx={cx} cy={cy} r={16} className="fill-muted" />
      <circle cx={cx} cy={cy} r={11} className="fill-foreground" />

      {/* Digitalni ispis */}
      <text x={cx} y={cy + 62} textAnchor="middle" className="fill-accent" style={{ fontSize: 34, fontWeight: 700 }}>
        {clamped < 10 ? clamped.toFixed(1) : Math.round(clamped)}
      </text>
      <text x={cx} y={cy + 86} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 14 }}>
        {unit}
      </text>
    </svg>
  );
};

const StatPill = ({
  icon: Icon,
  label,
  value,
  active,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  active: boolean;
}) => (
  <div
    className={cn(
      "flex flex-col items-center gap-1.5 py-4 rounded-xl border transition-colors",
      active ? "border-accent/60 bg-accent/10" : "border-border/30 bg-white/5",
    )}
  >
    <Icon className={cn("w-4 h-4", active ? "text-accent" : "text-muted-foreground")} />
    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className={cn("text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>{value}</span>
  </div>
);

const SpeedTestView = ({ phase, liveValue, result, onBack, onStart }: SpeedTestViewProps) => {
  const isRunning = phase === "ping" || phase === "download" || phase === "upload";
  const gaugeValue = phase === "download" || phase === "upload" ? liveValue : phase === "done" ? result.download : 0;

  return (
    <div className="relative z-10 flex-1 h-full flex flex-col items-center justify-center px-16">
      <button
        onClick={onBack}
        className="absolute top-10 left-16 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Natrag na internet postavke
      </button>

      <span className="text-xs tracking-[3px] text-muted-foreground uppercase mb-2">Test brzine interneta</span>
      <h1 className="text-2xl font-light text-foreground mb-8">{SPEED_PHASE_LABELS[phase]}</h1>

      <SpeedGauge value={gaugeValue} max={SPEED_TEST_MAX_MBPS} unit="Mb/s" />

      <div className="grid grid-cols-3 gap-4 mt-10 w-full max-w-md">
        <StatPill icon={Radio} label="Ping" value={result.ping ? `${result.ping} ms` : "—"} active={phase === "ping"} />
        <StatPill
          icon={ArrowDownToLine}
          label="Preuzimanje"
          value={result.download ? `${result.download} Mb/s` : "—"}
          active={phase === "download"}
        />
        <StatPill
          icon={ArrowUpFromLine}
          label="Slanje"
          value={result.upload ? `${result.upload} Mb/s` : "—"}
          active={phase === "upload"}
        />
      </div>

      <button
        onClick={onStart}
        disabled={isRunning}
        className={cn(
          "mt-10 flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-medium transition-all border",
          isRunning
            ? "opacity-40 pointer-events-none border-border/40 text-muted-foreground"
            : "bg-accent text-black border-accent hover:brightness-110 shadow-lg shadow-accent/20",
        )}
      >
        {phase === "done" ? (
          <>
            <RefreshCw className="w-4 h-4" />
            Ponovi test
          </>
        ) : isRunning ? (
          "Testiranje u tijeku..."
        ) : (
          <>
            <Gauge className="w-4 h-4" />
            Pokreni test
          </>
        )}
      </button>

      <p className="text-xs text-muted-foreground mt-4">Enter pokreće test · Escape/Natrag se vraća</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Network status — prezentacijske komponente
// ─────────────────────────────────────────────────────────────

interface NetworkStatusViewProps {
  loading: boolean;
  data: NetworkStatusInfo | null;
  onBack: () => void;
}

const NetworkInfoRow = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => (
  <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border/30 bg-white/5">
    <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/40 flex items-center justify-center shrink-0">
      <Icon className="w-4.5 h-4.5 text-accent" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-base font-medium text-foreground truncate">{value}</span>
    </div>
  </div>
);

const NetworkStatusView = ({ loading, data, onBack }: NetworkStatusViewProps) => {
  const isWifi = data?.connectionType === "wifi";
  const ConnectionIcon = isWifi ? Wifi : Cable;
  const connectionLabel = isWifi ? "Bežično (Wi-Fi)" : "Žično (Ethernet)";
  const placeholder = "—";

  return (
    <div className="relative z-10 flex-1 h-full flex flex-col items-center justify-center px-16">
      <button
        onClick={onBack}
        aria-label="Natrag na internet postavke"
        className="absolute top-10 left-16 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-8">Status mreže</h1>

      <div className="grid grid-cols-1 gap-3 w-full max-w-md">
        <NetworkInfoRow icon={Fingerprint} label="MAC adresa" value={loading || !data ? placeholder : data.mac} />
        <NetworkInfoRow icon={Home} label="Lokalna IP adresa" value={loading || !data ? placeholder : data.localIp} />
        <NetworkInfoRow icon={Globe} label="Javna IP adresa" value={loading || !data ? placeholder : data.publicIp} />
        <NetworkInfoRow
          icon={Router}
          label="Gateway (Router IP)"
          value={loading || !data ? placeholder : data.gateway}
        />
        <NetworkInfoRow
          icon={ConnectionIcon}
          label="Status veze"
          value={loading || !data ? placeholder : connectionLabel}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Startup Action — prezentacijske komponente
// ─────────────────────────────────────────────────────────────

interface StartupActionViewProps {
  loading: boolean;
  settings: StartupActionSettings;
  focusedIndex: number;
  onFocusChange: (index: number) => void;
  onActivateRow: (index: number) => void;
  onBack: () => void;
}

const StartupActionView = ({
  loading,
  settings,
  focusedIndex,
  onFocusChange,
  onActivateRow,
  onBack,
}: StartupActionViewProps) => {
  const optionsLocked = !settings.enabled;

  return (
    <div className="relative z-10 flex-1 h-full flex flex-col items-center justify-center px-16">
      <span className="text-xs tracking-[3px] text-muted-foreground uppercase mb-2">Postavke pokretanja</span>
      <h1 className="text-2xl font-light text-foreground mb-8">Startup Action</h1>

      <div className={cn("w-full max-w-md flex flex-col gap-6", loading && "opacity-50 pointer-events-none")}>
        {/* Glavni prekidač */}
        <button
          onClick={() => {
            onFocusChange(0);
            onActivateRow(0);
          }}
          className={cn(
            "w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left",
            focusedIndex === 0 ? "bg-white/10 border-accent/60" : "border-border/30 bg-white/5 hover:bg-white/8",
          )}
        >
          {settings.enabled ? (
            <ToggleRight className="w-6 h-6 text-accent shrink-0" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-muted-foreground shrink-0" />
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[15px] font-medium text-foreground">Omogući Startup Action</span>
            <span className="text-xs text-muted-foreground">{settings.enabled ? "Uključeno" : "Isključeno"}</span>
          </div>
        </button>

        {/* Ekran pri pokretanju */}
        <div className={cn("flex flex-col gap-1.5", optionsLocked && "opacity-40 pointer-events-none")}>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground px-1 mb-1">
            Ekran pri pokretanju
          </span>
          {STARTUP_SCREEN_OPTIONS.map((option, i) => {
            const index = i + 1;
            const Icon = option.icon;
            const isFocused = focusedIndex === index;
            const isSelected = settings.screen === option.key;
            return (
              <button
                key={option.key}
                onClick={() => {
                  onFocusChange(index);
                  onActivateRow(index);
                }}
                className={cn(
                  "flex items-center gap-4 px-5 py-3 rounded-lg border transition-all text-left",
                  isFocused ? "bg-white/10 border-accent/60" : "border-border/20 bg-white/5 hover:bg-white/8",
                )}
              >
                <Icon className={cn("w-4.5 h-4.5 shrink-0", isSelected ? "text-accent" : "text-muted-foreground")} />
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className={cn("text-[14px]", isSelected ? "font-medium text-foreground" : "text-muted-foreground")}
                  >
                    {option.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground/80">{option.description}</span>
                </div>
                <Check className={cn("w-4 h-4 shrink-0", isSelected ? "text-accent opacity-100" : "opacity-0")} />
              </button>
            );
          })}
        </div>

        {/* Zvuk u pozadini */}
        <div className={cn("flex flex-col gap-1.5", optionsLocked && "opacity-40 pointer-events-none")}>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground px-1 mb-1">Zvuk u pozadini</span>
          {BACKGROUND_AUDIO_OPTIONS.map((option, i) => {
            const index = i + 1 + STARTUP_SCREEN_OPTIONS.length;
            const Icon = option.icon;
            const isFocused = focusedIndex === index;
            const isSelected = settings.backgroundAudio === option.key;
            return (
              <button
                key={option.key}
                onClick={() => {
                  onFocusChange(index);
                  onActivateRow(index);
                }}
                className={cn(
                  "flex items-center gap-4 px-5 py-3 rounded-lg border transition-all text-left",
                  isFocused ? "bg-white/10 border-accent/60" : "border-border/20 bg-white/5 hover:bg-white/8",
                )}
              >
                <Icon className={cn("w-4.5 h-4.5 shrink-0", isSelected ? "text-accent" : "text-muted-foreground")} />
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className={cn("text-[14px]", isSelected ? "font-medium text-foreground" : "text-muted-foreground")}
                  >
                    {option.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground/80">{option.description}</span>
                </div>
                <Check className={cn("w-4 h-4 shrink-0", isSelected ? "text-accent opacity-100" : "opacity-0")} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Settings;
