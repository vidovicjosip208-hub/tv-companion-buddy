import { useEffect } from "react";

// Maps TV remote "Back" button variants to the same behavior as Escape.
// Tizen (Samsung): keyCode 10009 / key "XF86Back"
// webOS (LG):      keyCode 461
// Android TV:      key "GoBack" / "BrowserBack" / keyCode 4
const BACK_KEYS = new Set(["XF86Back", "GoBack", "BrowserBack"]);
const BACK_KEYCODES = new Set([10009, 461, 4]);

// TV remotes often emit several events for a single physical press
// (key + keyCode variants, key repeats, keyup). Without this guard the app
// would take several steps back at once — e.g. jump from the player straight
// to the home screen instead of one step back.
const REPRESS_GUARD_MS = 500;

const isBackEvent = (e: KeyboardEvent) => BACK_KEYS.has(e.key) || BACK_KEYCODES.has(e.keyCode);

const RemoteBackKey = () => {
  useEffect(() => {
    let lastBackAt = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      if (!isBackEvent(e)) return;

      // Always swallow the native event so the TV browser doesn't also
      // navigate its own history back.
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (e.repeat) return;

      const now = Date.now();
      if (now - lastBackAt < REPRESS_GUARD_MS) return;
      lastBackAt = now;

      // Re-dispatch as Escape so all existing handlers react uniformly.
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }),
      );
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isBackEvent(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);

  return null;
};

export default RemoteBackKey;
