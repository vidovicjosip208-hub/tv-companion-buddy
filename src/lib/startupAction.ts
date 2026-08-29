/**
 * Startup Action — postavke pokretanja aplikacije i zadnje gledani kanal.
 *
 * Trajno se čuva lokalno (localStorage) jer je vezano na uređaj, a ne na profil.
 * Kad se baza poveže, ovdje je jedino mjesto koje treba zamijeniti.
 */

export type StartupScreenOption = "favorites" | "home" | "channels";
export type BackgroundAudioOption = "on" | "muted";

export interface StartupActionSettings {
  enabled: boolean;
  screen: StartupScreenOption;
  backgroundAudio: BackgroundAudioOption;
}

export const DEFAULT_STARTUP_ACTION_SETTINGS: StartupActionSettings = {
  enabled: true,
  screen: "favorites",
  backgroundAudio: "on",
};

const SETTINGS_KEY = "tv-startup-action";
const LAST_WATCHED_KEY = "tv-last-watched-channel";

export const loadStartupActionSettings = (): StartupActionSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StartupActionSettings>;
      return { ...DEFAULT_STARTUP_ACTION_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_STARTUP_ACTION_SETTINGS;
};

export const saveStartupActionSettingsLocal = (settings: StartupActionSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
};

/** Naziv zadnje gledanog kanala — koristi se za pokretanje u pozadini pri startu. */
export const getLastWatchedChannel = (): string | null => {
  try {
    return localStorage.getItem(LAST_WATCHED_KEY);
  } catch {
    return null;
  }
};

export const setLastWatchedChannel = (channelName: string | undefined | null) => {
  if (!channelName) return;
  try {
    localStorage.setItem(LAST_WATCHED_KEY, channelName);
  } catch {}
};

/**
 * Startup Action se primjenjuje samo JEDNOM po pokretanju aplikacije — kasniji
 * ulasci na početnu stranicu (npr. izlaz iz Videoteke) ne smiju je ponovno okinuti.
 */
let startupConsumed = false;

export const consumeStartupAction = (): StartupActionSettings | null => {
  if (startupConsumed) return null;
  startupConsumed = true;
  const settings = loadStartupActionSettings();
  return settings.enabled ? settings : null;
};
