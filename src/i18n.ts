import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  hr: {
    translation: {
      sidebar: {
        home: "Početna",
        tv: "TV Kanali",
        radio: "Radio stanice",
        favorites: "Omiljeni",
        videoteka: "Videoteka",
        cameras: "Kamere uživo",
        settings: "Podešavanja",
        profile: "Profil",
      },
      settings: {
        title: "Podešavanja",
        subtitle: "Pritisnite opciju za upravljanje postavkama vašeg uređaja.",
        languageTitle: "Jezik",
        languageSubtitle: "Odaberite željeni jezik sučelja.",
        parental: "Roditeljski nadzor",
        internet: "Internet postavke",
        device: "Postavke uređaja",
        language: "Jezik",
      },
      home: {
        camerasLive: "Kamere uživo",
        favoriteChannels: "Omiljeni kanali",
        radioStations: "Radio stanice",
      },
    },
  },
  en: {
    translation: {
      sidebar: {
        home: "Home",
        tv: "TV Channels",
        radio: "Radio Stations",
        favorites: "Favorites",
        videoteka: "Library",
        cameras: "Live Cameras",
        settings: "Settings",
        profile: "Profile",
      },
      settings: {
        title: "Settings",
        subtitle: "Press an option to manage your device settings.",
        languageTitle: "Language",
        languageSubtitle: "Choose your preferred interface language.",
        parental: "Parental Controls",
        internet: "Internet Settings",
        device: "Device Controls",
        language: "Language",
      },
      home: {
        camerasLive: "Live Cameras",
        favoriteChannels: "Favorite Channels",
        radioStations: "Radio Stations",
      },
    },
  },
  de: {
    translation: {
      sidebar: {
        home: "Startseite",
        tv: "TV-Kanäle",
        radio: "Radiosender",
        favorites: "Favoriten",
        videoteka: "Videothek",
        cameras: "Live-Kameras",
        settings: "Einstellungen",
        profile: "Profil",
      },
      settings: {
        title: "Einstellungen",
        subtitle: "Wählen Sie eine Option, um Ihre Geräteeinstellungen zu verwalten.",
        languageTitle: "Sprache",
        languageSubtitle: "Wählen Sie Ihre bevorzugte Sprache.",
        parental: "Kindersicherung",
        internet: "Internet-Einstellungen",
        device: "Geräteeinstellungen",
        language: "Sprache",
      },
      home: {
        camerasLive: "Live-Kameras",
        favoriteChannels: "Lieblingskanäle",
        radioStations: "Radiosender",
      },
    },
  },
  fr: {
    translation: {
      sidebar: {
        home: "Accueil",
        tv: "Chaînes TV",
        radio: "Radios",
        favorites: "Favoris",
        videoteka: "Vidéothèque",
        cameras: "Caméras en direct",
        settings: "Paramètres",
        profile: "Profil",
      },
      settings: {
        title: "Paramètres",
        subtitle: "Appuyez sur une option pour gérer les paramètres de votre appareil.",
        languageTitle: "Langue",
        languageSubtitle: "Choisissez votre langue préférée.",
        parental: "Contrôle parental",
        internet: "Paramètres Internet",
        device: "Paramètres de l'appareil",
        language: "Langue",
      },
      home: {
        camerasLive: "Caméras en direct",
        favoriteChannels: "Chaînes favorites",
        radioStations: "Stations radio",
      },
    },
  },
  es: {
    translation: {
      sidebar: {
        home: "Inicio",
        tv: "Canales TV",
        radio: "Radios",
        favorites: "Favoritos",
        videoteka: "Videoteca",
        cameras: "Cámaras en vivo",
        settings: "Ajustes",
        profile: "Perfil",
      },
      settings: {
        title: "Ajustes",
        subtitle: "Pulse una opción para gestionar los ajustes del dispositivo.",
        languageTitle: "Idioma",
        languageSubtitle: "Elija su idioma preferido.",
        parental: "Control parental",
        internet: "Ajustes de Internet",
        device: "Ajustes del dispositivo",
        language: "Idioma",
      },
      home: {
        camerasLive: "Cámaras en vivo",
        favoriteChannels: "Canales favoritos",
        radioStations: "Emisoras de radio",
      },
    },
  },
  it: {
    translation: {
      sidebar: {
        home: "Home",
        tv: "Canali TV",
        radio: "Radio",
        favorites: "Preferiti",
        videoteka: "Videoteca",
        cameras: "Telecamere live",
        settings: "Impostazioni",
        profile: "Profilo",
      },
      settings: {
        title: "Impostazioni",
        subtitle: "Premi un'opzione per gestire le impostazioni del dispositivo.",
        languageTitle: "Lingua",
        languageSubtitle: "Scegli la tua lingua preferita.",
        parental: "Controllo genitori",
        internet: "Impostazioni Internet",
        device: "Impostazioni dispositivo",
        language: "Lingua",
      },
      home: {
        camerasLive: "Telecamere live",
        favoriteChannels: "Canali preferiti",
        radioStations: "Stazioni radio",
      },
    },
  },
};

// Map UI language labels to i18next codes
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
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "app_lang",
    },
  });

export default i18n;
