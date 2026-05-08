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
  videotekaRows: Record<string, string>;
  videotekaDetail: Record<string, string>;
  videotekaSearch: Record<string, string>;
  videotekaEpisodes: Record<string, string>;
  header: Record<string, string>;
  epg: Record<string, string>;
  weekdays: Record<string, string>;
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
  videotekaRows: {
    loading: "Učitavanje", newIn: "Novo u", inLibrary: "Videoteci",
    allMovies: "Svi", moviesHl: "Filmovi", allShows: "Sve", showsHl: "Serije",
    myList: "Moja", myListHl: "lista", content: "Sadržaj", movies: "Filmovi", shows: "Serije", other: "Ostalo", allCat: "Sve",
  },
  videotekaDetail: {
    loadingContent: "Učitavanje sadržaja…", noContent: "Nema sadržaja u Videoteci.",
    play: "Reproduciraj", playEp: "Reproduciraj S1: Ep. 1",
    resume: "Nastavi gledati", resumeEp: "Nastavi S1: Ep. 1",
    playFromBeginning: "Reproduciraj od početka",
    trailersAndMore: "Traileri i više", episodesAndMore: "Epizode i više",
    audioSubtitles: "Zvuk i titlovi", addToMyList: "Dodaj na moju listu",
    season: "Sezona", oneSeason: "1 Sezona", episodes: "epizoda", videos: "videa",
    trailersUnavailable: "Traileri trenutno nisu dostupni.",
  },
  videotekaSearch: { placeholder: "Pretraži...", results: "rezultata", noResults: "Nema rezultata." },
  videotekaEpisodes: {},
  header: { subscriptionExpiring: "Vaša pretplata ističe za 30 dan/a", subscriptionShort: "30 dan/a", location: "Beograd" },
  epg: { live: "Uživo", schedule: "TV Raspored", channel: "Kanal", today: "Danas", watch: "GLEDAJ", listen: "SLUŠAJ", programDesc: "Pogledajte {{title}} na kanalu {{channel}}. Više informacija o programu uskoro." },
  weekdays: { sun: "Ned", mon: "Pon", tue: "Uto", wed: "Sri", thu: "Čet", fri: "Pet", sat: "Sub" },
};

const en: Bundle = {
  sidebar: { home: "Home", tv: "TV Channels", radio: "Radio Stations", favorites: "Favorites", videoteka: "Library", cameras: "Live Cameras", settings: "Settings", profile: "Profile" },
  settings: { title: "Settings", subtitle: "Press an option to manage your device settings.", languageTitle: "Language", languageSubtitle: "Choose your preferred interface language.", parental: "Parental Controls", internet: "Internet Settings", device: "Device Controls", language: "Language" },
  home: { camerasLive: "Live Cameras", favoriteChannels: "Favorite Channels", radioStations: "Radio Stations", liveLabel: "LIVE" },
  tvCategories: { documentary: "Documentary", kids: "Kids", film: "Movies", sports: "Sports", entertainment: "Entertainment", "4k": "4K/UHD", local: "Local Channels", international: "International FTA", adult: "Adult Channels", youtube: "YouTube" },
  tvFilters: { live: "Live", schedule: "TV Schedule" },
  videoteka: { home: "Home", shows: "Shows", movies: "Movies", myList: "My List", search: "Search..." },
  profile: { choose: "Choose an account", brand: "Library" },
  videotekaRows: { loading: "Loading", newIn: "New in", inLibrary: "Library", allMovies: "All", moviesHl: "Movies", allShows: "All", showsHl: "Shows", myList: "My", myListHl: "List", content: "Content", movies: "Movies", shows: "Shows", other: "Other", allCat: "All" },
  videotekaDetail: { loadingContent: "Loading content…", noContent: "No content in the library.", play: "Play", playEp: "Play S1: Ep. 1", resume: "Resume", resumeEp: "Resume S1: Ep. 1", playFromBeginning: "Play From Beginning", trailersAndMore: "Trailers & More", episodesAndMore: "Episodes & More", audioSubtitles: "Audio & Subtitles", addToMyList: "Add To My List", season: "Season", oneSeason: "1 Season", episodes: "episodes", videos: "videos", trailersUnavailable: "Trailers are currently unavailable." },
  videotekaSearch: { placeholder: "Search...", results: "results", noResults: "No results found" },
  videotekaEpisodes: {},
  header: { subscriptionExpiring: "Your subscription expires in 30 days", subscriptionShort: "30 days", location: "Belgrade" },
  epg: { live: "Live", schedule: "TV Schedule", channel: "Channel", today: "Today", watch: "WATCH", listen: "LISTEN", programDesc: "Watch {{title}} on {{channel}}. More information about the program coming soon." },
  weekdays: { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" },
};

const de: Bundle = {
  sidebar: { home: "Startseite", tv: "TV-Kanäle", radio: "Radiosender", favorites: "Favoriten", videoteka: "Videothek", cameras: "Live-Kameras", settings: "Einstellungen", profile: "Profil" },
  settings: { title: "Einstellungen", subtitle: "Wählen Sie eine Option, um Ihre Geräteeinstellungen zu verwalten.", languageTitle: "Sprache", languageSubtitle: "Wählen Sie Ihre bevorzugte Sprache.", parental: "Kindersicherung", internet: "Internet-Einstellungen", device: "Geräteeinstellungen", language: "Sprache" },
  home: { camerasLive: "Live-Kameras", favoriteChannels: "Lieblingskanäle", radioStations: "Radiosender", liveLabel: "LIVE" },
  tvCategories: { documentary: "Dokumentation", kids: "Kinder", film: "Filme", sports: "Sport", entertainment: "Unterhaltung", "4k": "4K/UHD", local: "Lokale Kanäle", international: "Internationale FTA", adult: "Erwachsene", youtube: "YouTube" },
  tvFilters: { live: "Live", schedule: "TV-Programm" },
  videoteka: { home: "Start", shows: "Serien", movies: "Filme", myList: "Meine Liste", search: "Suchen..." },
  profile: { choose: "Konto auswählen", brand: "Videothek" },
  videotekaRows: { loading: "Wird geladen", newIn: "Neu in der", inLibrary: "Videothek", allMovies: "Alle", moviesHl: "Filme", allShows: "Alle", showsHl: "Serien", myList: "Meine", myListHl: "Liste", content: "Inhalte", movies: "Filme", shows: "Serien", other: "Andere", allCat: "Alle" },
  videotekaDetail: { loadingContent: "Inhalte werden geladen…", noContent: "Keine Inhalte in der Videothek.", play: "Abspielen", playEp: "Abspielen S1: F. 1", resume: "Fortsetzen", resumeEp: "Fortsetzen S1: F. 1", playFromBeginning: "Von Anfang abspielen", trailersAndMore: "Trailer & mehr", episodesAndMore: "Folgen & mehr", audioSubtitles: "Audio & Untertitel", addToMyList: "Zu meiner Liste", season: "Staffel", oneSeason: "1 Staffel", episodes: "Folgen", videos: "Videos", trailersUnavailable: "Trailer sind derzeit nicht verfügbar." },
  videotekaSearch: { placeholder: "Suchen...", results: "Ergebnisse", noResults: "Keine Ergebnisse gefunden" },
  videotekaEpisodes: {},
  header: { subscriptionExpiring: "Ihr Abonnement läuft in 30 Tagen ab", subscriptionShort: "30 Tage", location: "Belgrad" },
  epg: { live: "Live", schedule: "TV-Programm", channel: "Kanal", today: "Heute", watch: "ANSEHEN", listen: "ANHÖREN", programDesc: "Sehen Sie {{title}} auf {{channel}}. Weitere Informationen zum Programm in Kürze." },
  weekdays: { sun: "So", mon: "Mo", tue: "Di", wed: "Mi", thu: "Do", fri: "Fr", sat: "Sa" },
};

const fr: Bundle = {
  sidebar: { home: "Accueil", tv: "Chaînes TV", radio: "Radios", favorites: "Favoris", videoteka: "Vidéothèque", cameras: "Caméras en direct", settings: "Paramètres", profile: "Profil" },
  settings: { title: "Paramètres", subtitle: "Appuyez sur une option pour gérer les paramètres de votre appareil.", languageTitle: "Langue", languageSubtitle: "Choisissez votre langue préférée.", parental: "Contrôle parental", internet: "Paramètres Internet", device: "Paramètres de l'appareil", language: "Langue" },
  home: { camerasLive: "Caméras en direct", favoriteChannels: "Chaînes favorites", radioStations: "Stations radio", liveLabel: "EN DIRECT" },
  tvCategories: { documentary: "Documentaire", kids: "Enfants", film: "Films", sports: "Sport", entertainment: "Divertissement", "4k": "4K/UHD", local: "Chaînes locales", international: "FTA Internationales", adult: "Adultes", youtube: "YouTube" },
  tvFilters: { live: "En direct", schedule: "Programme TV" },
  videoteka: { home: "Accueil", shows: "Séries", movies: "Films", myList: "Ma liste", search: "Rechercher..." },
  profile: { choose: "Choisir un compte", brand: "Vidéothèque" },
  videotekaRows: { loading: "Chargement", newIn: "Nouveau dans la", inLibrary: "Vidéothèque", allMovies: "Tous les", moviesHl: "Films", allShows: "Toutes les", showsHl: "Séries", myList: "Ma", myListHl: "liste", content: "Contenu", movies: "Films", shows: "Séries", other: "Autre", allCat: "Tous" },
  videotekaDetail: { loadingContent: "Chargement du contenu…", noContent: "Aucun contenu dans la vidéothèque.", play: "Lecture", playEp: "Lecture S1: Ép. 1", resume: "Reprendre", resumeEp: "Reprendre S1: Ép. 1", playFromBeginning: "Lire depuis le début", trailersAndMore: "Bandes-annonces et plus", episodesAndMore: "Épisodes et plus", audioSubtitles: "Audio et sous-titres", addToMyList: "Ajouter à ma liste", season: "Saison", oneSeason: "1 Saison", episodes: "épisodes", videos: "vidéos", trailersUnavailable: "Les bandes-annonces ne sont pas disponibles." },
  videotekaSearch: { placeholder: "Rechercher...", results: "résultats", noResults: "Aucun résultat" },
  videotekaEpisodes: {},
  header: { subscriptionExpiring: "Votre abonnement expire dans 30 jours", subscriptionShort: "30 jours", location: "Belgrade" },
  epg: { live: "En direct", schedule: "Programme TV", channel: "Chaîne", today: "Aujourd'hui", watch: "REGARDER", programDesc: "Regardez {{title}} sur {{channel}}. Plus d'informations sur le programme prochainement." },
  weekdays: { sun: "Dim", mon: "Lun", tue: "Mar", wed: "Mer", thu: "Jeu", fri: "Ven", sat: "Sam" },
};

const es: Bundle = {
  sidebar: { home: "Inicio", tv: "Canales TV", radio: "Radios", favorites: "Favoritos", videoteka: "Videoteca", cameras: "Cámaras en vivo", settings: "Ajustes", profile: "Perfil" },
  settings: { title: "Ajustes", subtitle: "Pulse una opción para gestionar los ajustes del dispositivo.", languageTitle: "Idioma", languageSubtitle: "Elija su idioma preferido.", parental: "Control parental", internet: "Ajustes de Internet", device: "Ajustes del dispositivo", language: "Idioma" },
  home: { camerasLive: "Cámaras en vivo", favoriteChannels: "Canales favoritos", radioStations: "Emisoras de radio", liveLabel: "EN VIVO" },
  tvCategories: { documentary: "Documental", kids: "Infantil", film: "Películas", sports: "Deportes", entertainment: "Entretenimiento", "4k": "4K/UHD", local: "Canales locales", international: "FTA Internacionales", adult: "Adultos", youtube: "YouTube" },
  tvFilters: { live: "En vivo", schedule: "Programación" },
  videoteka: { home: "Inicio", shows: "Series", movies: "Películas", myList: "Mi lista", search: "Buscar..." },
  profile: { choose: "Elegir una cuenta", brand: "Videoteca" },
  videotekaRows: { loading: "Cargando", newIn: "Nuevo en la", inLibrary: "Videoteca", allMovies: "Todas las", moviesHl: "Películas", allShows: "Todas las", showsHl: "Series", myList: "Mi", myListHl: "lista", content: "Contenido", movies: "Películas", shows: "Series", other: "Otro", allCat: "Todo" },
  videotekaDetail: { loadingContent: "Cargando contenido…", noContent: "No hay contenido en la videoteca.", play: "Reproducir", playEp: "Reproducir T1: Ep. 1", resume: "Continuar", resumeEp: "Continuar T1: Ep. 1", playFromBeginning: "Reproducir desde el inicio", trailersAndMore: "Tráilers y más", episodesAndMore: "Episodios y más", audioSubtitles: "Audio y subtítulos", addToMyList: "Añadir a mi lista", season: "Temporada", oneSeason: "1 Temporada", episodes: "episodios", videos: "vídeos", trailersUnavailable: "Los tráilers no están disponibles." },
  videotekaSearch: { placeholder: "Buscar...", results: "resultados", noResults: "Sin resultados" },
  videotekaEpisodes: {},
  header: { subscriptionExpiring: "Su suscripción caduca en 30 días", subscriptionShort: "30 días", location: "Belgrado" },
  epg: { live: "En vivo", schedule: "Programación", channel: "Canal", today: "Hoy", watch: "VER", programDesc: "Vea {{title}} en {{channel}}. Más información sobre el programa próximamente." },
  weekdays: { sun: "Dom", mon: "Lun", tue: "Mar", wed: "Mié", thu: "Jue", fri: "Vie", sat: "Sáb" },
};

const it: Bundle = {
  sidebar: { home: "Home", tv: "Canali TV", radio: "Radio", favorites: "Preferiti", videoteka: "Videoteca", cameras: "Telecamere live", settings: "Impostazioni", profile: "Profilo" },
  settings: { title: "Impostazioni", subtitle: "Premi un'opzione per gestire le impostazioni del dispositivo.", languageTitle: "Lingua", languageSubtitle: "Scegli la tua lingua preferita.", parental: "Controllo genitori", internet: "Impostazioni Internet", device: "Impostazioni dispositivo", language: "Lingua" },
  home: { camerasLive: "Telecamere live", favoriteChannels: "Canali preferiti", radioStations: "Stazioni radio", liveLabel: "LIVE" },
  tvCategories: { documentary: "Documentari", kids: "Bambini", film: "Film", sports: "Sport", entertainment: "Intrattenimento", "4k": "4K/UHD", local: "Canali locali", international: "FTA Internazionali", adult: "Adulti", youtube: "YouTube" },
  tvFilters: { live: "Live", schedule: "Palinsesto" },
  videoteka: { home: "Home", shows: "Serie", movies: "Film", myList: "La mia lista", search: "Cerca..." },
  profile: { choose: "Scegli un account", brand: "Videoteca" },
  videotekaRows: { loading: "Caricamento", newIn: "Novità in", inLibrary: "Videoteca", allMovies: "Tutti i", moviesHl: "Film", allShows: "Tutte le", showsHl: "Serie", myList: "La mia", myListHl: "lista", content: "Contenuti", movies: "Film", shows: "Serie", other: "Altro", allCat: "Tutto" },
  videotekaDetail: { loadingContent: "Caricamento contenuti…", noContent: "Nessun contenuto in videoteca.", play: "Riproduci", playEp: "Riproduci S1: Ep. 1", resume: "Riprendi", resumeEp: "Riprendi S1: Ep. 1", playFromBeginning: "Riproduci dall'inizio", trailersAndMore: "Trailer e altro", episodesAndMore: "Episodi e altro", audioSubtitles: "Audio e sottotitoli", addToMyList: "Aggiungi alla mia lista", season: "Stagione", oneSeason: "1 Stagione", episodes: "episodi", videos: "video", trailersUnavailable: "I trailer non sono attualmente disponibili." },
  videotekaSearch: { placeholder: "Cerca...", results: "risultati", noResults: "Nessun risultato" },
  videotekaEpisodes: {},
  header: { subscriptionExpiring: "Il tuo abbonamento scade tra 30 giorni", subscriptionShort: "30 giorni", location: "Belgrado" },
  epg: { live: "Live", schedule: "Palinsesto", channel: "Canale", today: "Oggi", watch: "GUARDA", programDesc: "Guarda {{title}} su {{channel}}. Maggiori informazioni sul programma a breve." },
  weekdays: { sun: "Dom", mon: "Lun", tue: "Mar", wed: "Mer", thu: "Gio", fri: "Ven", sat: "Sab" },
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
