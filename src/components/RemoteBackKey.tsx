import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Maps TV remote "Back" button variants to the same behavior as Escape.
// Tizen (Samsung): keyCode 10009 / key "XF86Back" / "tizenhwkey" event
// webOS (LG):      keyCode 461
// Android TV:      key "GoBack" / "BrowserBack" / keyCode 4
const BACK_KEYS = new Set(["XF86Back", "GoBack", "BrowserBack", "Back", "BrowserBack"]);
const BACK_KEYCODES = new Set([10009, 461, 4]);

// TV remotes often emit several events for a single physical press
// (key + keyCode variants, key repeats, keyup). Without this guard the app
// would take several steps back at once — e.g. jump from the player straight
// to the home screen instead of one step back.
const REPRESS_GUARD_MS = 350;

const isBackEvent = (e: KeyboardEvent) => BACK_KEYS.has(e.key) || BACK_KEYCODES.has(e.keyCode);

type TizenApp = {
  tizen?: { application?: { getCurrentApplication?: () => { exit?: () => void } } };
};

const RemoteBackKey = () => {
  const location = useLocation();

  useEffect(() => {
    let lastBackAt = 0;

    const fireEscape = () => {
      const now = Date.now();
      if (now - lastBackAt < REPRESS_GUARD_MS) return;
      lastBackAt = now;
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }),
      );
    };

    const swallow = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      if (!isBackEvent(e)) return;
      swallow(e);
      if (e.repeat) return;
      fireEscape();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isBackEvent(e)) return;
      swallow(e);
      // Pojedini TV preglednici izlože Back samo kao keyup. Dedupe guard
      // sprječava drugi Escape kada je isti pritisak već stigao kao keydown.
      fireEscape();
    };

    // Tizen fires a dedicated hardware-key event that does NOT come through
    // keydown; without handling it the TV browser navigates its own history.
    const onTizenHwKey = (e: Event) => {
      const name = (e as Event & { keyName?: string }).keyName;
      if (name && name !== "back") return;
      swallow(e);
      fireEscape();
    };

    // History guard: sentinel se sada postavlja za SVAKU React rutu (u efektu
    // ispod), tako da browser Back prvo ostaje na istoj ruti. Stari pristup je
    // postavljao sentinel samo pri pokretanju aplikacije pa je Back iz
    // /videoteka odmah vraćao stvarnu povijest na početnu stranicu.
    const pushSentinel = () => {
      try {
        const currentState = window.history.state ?? {};
        window.history.pushState({ ...currentState, tvBackGuard: true }, "", window.location.href);
      } catch {
        // ignore
      }
    };

    const onPopState = () => {
      pushSentinel();
      fireEscape();
    };

    const onFullscreenBack = () => fireEscape();

    for (const target of [window, document] as (Window | Document)[]) {
      target.addEventListener("keydown", onKeyDown as EventListener, true);
      target.addEventListener("keyup", onKeyUp as EventListener, true);
    }
    document.addEventListener("tizenhwkey", onTizenHwKey as EventListener, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("app:fullscreen-back", onFullscreenBack);

    return () => {
      for (const target of [window, document] as (Window | Document)[]) {
        target.removeEventListener("keydown", onKeyDown as EventListener, true);
        target.removeEventListener("keyup", onKeyUp as EventListener, true);
      }
      document.removeEventListener("tizenhwkey", onTizenHwKey as EventListener, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("app:fullscreen-back", onFullscreenBack);
    };
  }, []);

  useEffect(() => {
    // Svaka ruta dobiva vlastiti zaštitni zapis. Popstate tada ne može prije
    // aplikacijskog Back handlera promijeniti /videoteka u početnu stranicu.
    if (window.history.state?.tvBackGuard) return;
    try {
      const currentState = window.history.state ?? {};
      window.history.pushState({ ...currentState, tvBackGuard: true }, "", window.location.href);
    } catch {
      // ignore
    }
  }, [location.key, location.pathname, location.search, location.hash]);

  return null;
};

export const exitTvApp = () => {
  const w = window as unknown as TizenApp & { webOS?: { platformBack?: () => void } };
  try {
    w.tizen?.application?.getCurrentApplication?.()?.exit?.();
    return;
  } catch {
    // ignore
  }
  try {
    w.webOS?.platformBack?.();
  } catch {
    // ignore
  }
};

export default RemoteBackKey;
