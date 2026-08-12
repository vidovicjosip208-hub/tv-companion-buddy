import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useZoneKeys } from "@/lib/focusZone";
import { requestAppExit } from "@/components/ExitAppDialog";
import { getAuthStrings } from "@/lib/authStrings";
import { markEntered } from "@/lib/entry";
import { cn } from "@/lib/utils";
import logo from "@/assets/max-ovizija-logo.png";
import posterWall from "@/assets/1786481622043.png";

const Auth = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const s = getAuthStrings(i18n.language);

  const [focused, setFocused] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number } | null>(null);

  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const count = 3;

  // Spriječi sužavanje stranice kada se na TVu otvori virtualna tipkovnica.
  // Umjesto 100vh/100vw koristimo fiksnu početnu veličinu viewporta, pa
  // tipkovnica prelazi preko stranice umjesto da je smanjuje.
  useEffect(() => {
    const measure = () => {
      const w = window.visualViewport?.width ?? window.innerWidth;
      const h = window.visualViewport?.height ?? window.innerHeight;
      setViewportSize({ w, h });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    itemRefs.current[focused]?.focus();
  }, [focused]);

  const enter = useCallback(() => {
    markEntered();
    navigate("/", { replace: true });
  }, [navigate]);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Privremeno: prijava bez registracije. Ako korisnik postoji u Supabaseu
      // radi se prava prijava, inače se ulazi lokalno (bez sesije).
      if (email && password) {
        await supabase.auth.signInWithPassword({ email, password }).catch(() => null);
      }
      enter();
    } catch {
      enter();
    } finally {
      setBusy(false);
    }
  }, [busy, email, password, enter]);


  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          setFocused((f) => Math.min(f + 1, count - 1));
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          setFocused((f) => Math.max(f - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (focused === count - 1) submit();
          else setFocused((f) => Math.min(f + 1, count - 1));
          break;
        case "Escape":
        case "XF86Back":
          e.preventDefault();
          e.stopPropagation();
          requestAppExit();
          break;
      }
    },
    [count, focused, submit],
  );

  useZoneKeys("auth", handleKeyDown, true, 60);

  const field = (isFocused: boolean) =>
    cn(
      "w-[560px] h-[60px] rounded-2xl px-5 text-[19px] text-white bg-black/70 outline-none border-2",
      isFocused ? "border-accent" : "border-white/15",
    );

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-background">
      {/* Static poster wall background */}
      <img
        src={posterWall}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        style={{ filter: "contrast(1.15) saturate(1.2)" }}
      />
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-12 -translate-y-10">
        {/* Neprozirni popup kontejner */}
        <div className="flex flex-col items-center bg-black rounded-3xl px-12 pt-0 pb-16 shadow-2xl border border-white/10">
          <img src={logo} alt="Max Ovizija" className="h-[180px] w-auto rounded-3xl" loading="eager" />

          <h1 className="mt-2 text-[27px] font-extrabold text-white">{s.signIn}</h1>
          <div className="mt-4 flex flex-col items-center gap-3">
            <input
              ref={(el) => (itemRefs.current[0] = el)}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused(0)}
              placeholder={s.email}
              className={field(focused === 0)}
            />
            <input
              ref={(el) => (itemRefs.current[1] = el)}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused(1)}
              placeholder={s.password}
              className={field(focused === 1)}
            />
            <button
              ref={(el) => (itemRefs.current[2] = el)}
              onClick={submit}
              onFocus={() => setFocused(2)}
              disabled={busy}
              className={cn(
                "w-[560px] h-[64px] rounded-full text-[21px] font-bold outline-none border-2 flex items-center justify-center",
                focused === 2
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-accent/85 text-accent-foreground border-transparent",
              )}
            >
              {busy ? s.loading : s.login}
            </button>
          </div>
          {error && <p className="mt-3 text-[17px] max-w-[560px] text-center text-destructive">{error}</p>}
        </div>

        <p className="absolute bottom-4 text-[15px] text-white/40">{s.hintKeys}</p>
      </div>
    </div>
  );
};

export default Auth;
