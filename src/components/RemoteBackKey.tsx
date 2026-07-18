import { useEffect } from "react";

// Maps TV remote "Back" button variants to the same behavior as Escape.
// Tizen (Samsung): keyCode 10009 / key "XF86Back"
// webOS (LG):      keyCode 461
// Android TV:      key "GoBack" / "BrowserBack" / keyCode 4
const BACK_KEYS = new Set(["XF86Back", "GoBack", "BrowserBack"]);
const BACK_KEYCODES = new Set([10009, 461, 4]);

const RemoteBackKey = () => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      const isBack = BACK_KEYS.has(e.key) || BACK_KEYCODES.has(e.keyCode);
      if (!isBack) return;
      e.preventDefault();
      e.stopPropagation();
      // Re-dispatch as Escape so all existing handlers react uniformly.
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }),
      );
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return null;
};

export default RemoteBackKey;
