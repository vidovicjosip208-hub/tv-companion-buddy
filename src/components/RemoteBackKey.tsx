import { useEffect } from "react";

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
const REPRESS_GUARD_MS = 500;

const isBackEvent = (e: KeyboardEvent) => BACK_KEYS.has(e.key) || BACK_KEYCODES.has(e.keyCode);

type TizenApp = {
  tizen?: { application?: { getCurrentApplication?: () => { exit?: () => void } } };
};

const RemoteBackKey = () => {
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
    };

    // Tizen fires a dedicated hardware-key event that does NOT come through
    // keydown; without handling it the TV browser navigates its own history.
    const onTizenHwKey = (e: Event) => {
      const name = (e as Event & { keyName?: string }).keyName;
      if (name && name !== "back") return;
      swallow(e);
      fireEscape();
    };

    // History guard: the TV browser may still pop its own history entry for a
    // back press. We keep one sentinel entry so any pop stays inside the app
    // and is translated into exactly ONE Escape step.
    const pushSentinel = () => {
      try {
        window.history.pushState({ tvBackGuard: true }, "");
      } catch {
        // ignore
      }
    };
    pushSentinel();

    const onPopState = () => {
      pushSentinel();
      fireEscape();
    };

    for (const target of [window, document] as (Window | Document)[]) {
      target.addEventListener("keydown", onKeyDown as EventListener, true);
      target.addEventListener("keyup", onKeyUp as EventListener, true);
    }
    document.addEventListener("tizenhwkey", onTizenHwKey as EventListener, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      for (const target of [window, document] as (Window | Document)[]) {
        target.removeEventListener("keydown", onKeyDown as EventListener, true);
        target.removeEventListener("keyup", onKeyUp as EventListener, true);
      }
      document.removeEventListener("tizenhwkey", onTizenHwKey as EventListener, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

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
