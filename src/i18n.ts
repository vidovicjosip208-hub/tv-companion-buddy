import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

type Bundle = {
  sidebar: Record<string, string>;
  settings: Record<string, string>;
  home: Record<string, string>;
  tvCategories: Record<string, string>;
  tvFilters: Record<string, string>;
  videoteka: Record<string, string>;
  profile: Record<string, string>;
};

const hr: Bundle = {
  sidebar: {
    home: "Početna", tv: "TV Kanali", radio: "Radio stanice", favorites: "Omiljeni",
    videoteka: "Videoteka", cameras: "Kamere uživo", settings: "Podešavanja", profile: "Profil",
  },
  settings: {
    title: "Podešavanja", subtitle: "Pritisnite opciju za upravljanje postavkama vašeg uređaja.",
    languageTitle: "Jezik", languageSubtitle: "Odaberite željeni jezik sučelja.",
    parental: "Roditeljski nadzor", internet: "Internet postavke", device: "Postavke uređaja", language: "Jezik",
  },
  home: { camerasLive: "Kamere uživo", favoriteChannels: "Omiljeni kanali", radioStations: "Radio stanice", liveLabel: "UŽIVO" },
  tvCategories: {
    documentary: "Dokumentarni", kids: "Dječji", film: "Filmski", sports: "Sportski",
    entertainment: "Zabavni", "4k": "4K/UHD", local: "Lokalni kanali", international: "Međunarodni FTA",
    adult: "Kanali za odrasle", youtube: "YouTube",
  },
  tvFilters: { live: "Uživo", schedule: "TV Raspored" },
  videoteka: { home: "Početna", shows: "Serije", movies: "Filmovi", myList: "Moja lista", search: "Pretraži..." },
  profile: { choose: "Odaberite profil", brand: "Videoteka" },
};

const en: Bundle = {
  sidebar: { home: "Home", tv: "TV Channels", radio: "Radio Stations", favorites: "Favorites", videoteka: "Library", cameras: "Live Cameras", settings: "Settings", profile: "Profile" },
  settings: { title: "Settings", subtitle: "Press an option to manage your device settings.", languageTitle: "Language", languageSubtitle: "Choose your preferred interface language.", parental: "Parental Controls", internet: "Internet Settings", device: "Device Controls", language: "Language" },
  home: { camerasLive: "Live Cameras", favoriteChannels: "Favorite Channels", radioStations: "Radio Stations", liveLabel: "LIVE" },
  tvCategories: { documentary: "Documentary", kids: "Kids", film: "Movies", sports: "Sports", entertainment: "Entertainment", "4k": "4K/UHD", local: "Local Channels", international: "International FTA", adult: "Adult Channels", youtube: "YouTube" },
  tvFilters: { live: "Live", schedule: "TV Schedule" },
  videoteka: { home: "Home", shows: "Shows", movies: "Movies", myList: "My List", search: "Search..." },
  profile: { choose: "Choose an account", brand: "Library" },
};

const de: Bundle = {
  sidebar: { home: "Startseite", tv: "TV-Kanäle", radio: "Radiosender", favorites: "Favoriten", videoteka: "Videothek", cameras: "Live-Kameras", settings: "Einstellungen", profile: "Profil" },
  settings: { title: "Einstellungen", subtitle: "Wählen Sie eine Option, um Ihre Geräteeinstellungen zu verwalten.", languageTitle: "Sprache", languageSubtitle: "Wählen Sie Ihre bevorzugte Sprache.", parental: "Kindersicherung", internet: "Internet-Einstellungen", device: "Geräteeinstellungen", language: "Sprache" },
  home: { camerasLive: "Live-Kameras", favoriteChannels: "Lieblingskanäle", radioStations: "Radiosender", liveLabel: "LIVE" },
  tvCategories: { documentary: "Dokumentation", kids: "Kinder", film: "Filme", sports: "Sport", entertainment: "Unterhaltung", "4k": "4K/UHD", local: "Lokale Kanäle", international: "Internationale FTA", adult: "Erwachsene", youtube: "YouTube" },
  tvFilters: { live: "Live", schedule: "TV-Programm" },
  videoteka: { home: "Start", shows: "Serien", movies: "Filme", myList: "Meine Liste", search: "Suchen..." },
  profile: { choose: "Konto auswählen", brand: "Videothek" },
};

const fr: Bundle = {
  sidebar: { home: "Accueil", tv: "Chaînes TV", radio: "Radios", favorites: "Favoris", videoteka: "Vidéothèque", cameras: "Caméras en direct", settings: "Paramètres", profile: "Profil" },
  settings: { title: "Paramètres", subtitle: "Appuyez sur une option pour gérer les paramètres de votre appareil.", languageTitle: "Langue", languageSubtitle: "Choisissez votre langue préférée.", parental: "Contrôle parental", internet: "Paramètres Internet", device: "Paramètres de l'appareil", language: "Langue" },
  home: { camerasLive: "Caméras en direct", favoriteChannels: "Chaînes favorites", radioStations: "Stations radio", liveLabel: "EN DIRECT" },
  tvCategories: { documentary: "Documentaire", kids: "Enfants", film: "Films", sports: "Sport", entertainment: "Divertissement", "4k": "4K/UHD", local: "Chaînes locales", international: "FTA Internationales", adult: "Adultes", youtube: "YouTube" },
  tvFilters: { live: "En direct", schedule: "Programme TV" },
  videoteka: { home: "Accueil", shows: "Séries", movies: "Films", myList: "Ma liste", search: "Rechercher..." },
  profile: { choose: "Choisir un compte", brand: "Vidéothèque" },
};

const es: Bundle = {
  sidebar: { home: "Inicio", tv: "Canales TV", radio: "Radios", favorites: "Favoritos", videoteka: "Videoteca", cameras: "Cámaras en vivo", settings: "Ajustes", profile: "Perfil" },
  settings: { title: "Ajustes", subtitle: "Pulse una opción para gestionar los ajustes del dispositivo.", languageTitle: "Idioma", languageSubtitle: "Elija su idioma preferido.", parental: "Control parental", internet: "Ajustes de Internet", device: "Ajustes del dispositivo", language: "Idioma" },
  home: { camerasLive: "Cámaras en vivo", favoriteChannels: "Canales favoritos", radioStations: "Emisoras de radio", liveLabel: "EN VIVO" },
  tvCategories: { documentary: "Documental", kids: "Infantil", film: "Películas", sports: "Deportes", entertainment: "Entretenimiento", "4k": "4K/UHD", local: "Canales locales", international: "FTA Internacionales", adult: "Adultos", youtube: "YouTube" },
  tvFilters: { live: "En vivo", schedule: "Programación" },
  videoteka: { home: "Inicio", shows: "Series", movies: "Películas", myList: "Mi lista", search: "Buscar..." },
  profile: { choose: "Elegir una cuenta", brand: "Videoteca" },
};

const it: Bundle = {
  sidebar: { home: "Home", tv: "Canali TV", radio: "Radio", favorites: "Preferiti", videoteka: "Videoteca", cameras: "Telecamere live", settings: "Impostazioni", profile: "Profilo" },
  settings: { title: "Impostazioni", subtitle: "Premi un'opzione per gestire le impostazioni del dispositivo.", languageTitle: "Lingua", languageSubtitle: "Scegli la tua lingua preferita.", parental: "Controllo genitori", internet: "Impostazioni Internet", device: "Impostazioni dispositivo", language: "Lingua" },
  home: { camerasLive: "Telecamere live", favoriteChannels: "Canali preferiti", radioStations: "Stazioni radio", liveLabel: "LIVE" },
  tvCategories: { documentary: "Documentari", kids: "Bambini", film: "Film", sports: "Sport", entertainment: "Intrattenimento", "4k": "4K/UHD", local: "Canali locali", international: "FTA Internazionali", adult: "Adulti", youtube: "YouTube" },
  tvFilters: { live: "Live", schedule: "Palinsesto" },
  videoteka: { home: "Home", shows: "Serie", movies: "Film", myList: "La mia lista", search: "Cerca..." },
  profile: { choose: "Scegli un account", brand: "Videoteca" },
};

const resources = {
  hr: { translation: hr },
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  it: { translation: it },
};

export const LANGUAGE_OPTIONS: { label: string; code: string }[] = [
  { label: "Hrvatski", code: "hr" },
  { label: "English", code: "en" },
  { label: "Deutsch", code: "de" },
  { label: "Français", code: "fr" },
  { label: "Español", code: "es" },
  { label: "Italiano", code: "it" },
  { label: "Português", code: "pt" },
  { label: "Nederlands", code: "nl" },
  { label: "Polski", code: "pl" },
  { label: "Čeština", code: "cs" },
  { label: "Slovenščina", code: "sl" },
  { label: "Srpski", code: "sr" },
  { label: "Bosanski", code: "bs" },
  { label: "Magyar", code: "hu" },
  { label: "Русский", code: "ru" },
  { label: "Türkçe", code: "tr" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "hr",
    supportedLngs: LANGUAGE_OPTIONS.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "app_lang",
    },
  });

export default i18n;
