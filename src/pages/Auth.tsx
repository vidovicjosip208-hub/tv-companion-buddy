import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useVideotekaContent } from "@/hooks/useVideotekaContent";
import { useZoneKeys } from "@/lib/focusZone";
import { getAuthStrings } from "@/lib/authStrings";
import { cn } from "@/lib/utils";
import logo from "@/assets/max-ovizija-logo.png";

type Mode = "landing" | "signup" | "signin";

const COLLAGE_COLS = 8;
const COLLAGE_ROWS = 4;
const COLLAGE_SLOTS = COLLAGE_COLS * COLLAGE_ROWS;

const Auth = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const s = getAuthStrings(i18n.language);

  const { data } = useVideotekaContent();
  const posters = useMemo(() => {
    const list = (data?.allItems ?? []).map((i) => i.thumbnail).filter(Boolean);
    if (list.length === 0) return [];
    return Array.from({ length: COLLAGE_SLOTS }, (_, i) => list[i % list.length]);
  }, [data]);

  const [mode, setMode] = useState<Mode>("landing");
  const [focused, setFocused] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const count = mode === "landing" ? 3 : 5;

  // Session listener first, then current user check.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/", { replace: true });
    });
    supabase.auth.getUser().then(({ data: u }) => {
      if (u?.user) navigate("/", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    setFocused(0);
    setError(null);
    setMessage(null);
  }, [mode]);

  useEffect(() => {
    itemRefs.current[focused]?.focus();
  }, [focused, mode]);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        setMessage(s.checkEmail);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : s.errorGeneric);
    } finally {
      setBusy(false);
    }
  }, [busy, email, mode, password, s]);

  const google = useCallback(async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocused((f) => Math.min(f + 1, count - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocused((f) => Math.max(f - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          (itemRefs.current[focused] as HTMLElement | null)?.click();
          break;
        case "Escape":
        case "Backspace":
        case "XF86Back":
          e.preventDefault();
          if (mode === "landing") navigate("/");
          else setMode("landing");
          break;
      }
    },
    [count, focused, mode, navigate],
  );

  useZoneKeys("auth", handleKeyDown, true, 60);

  const pill = (isFocused: boolean, tone: "solid" | "muted") =>
    cn(
      "w-[560px] h-[64px] rounded-full text-[21px] font-bold outline-none border-2 flex items-center justify-center",
      tone === "solid"
        ? isFocused
          ? "bg-accent text-accent-foreground border-accent"
          : "bg-accent/85 text-accent-foreground border-transparent"
        : isFocused
          ? "bg-white text-black border-white"
          : "bg-black/70 text-white border-white/15",
    );

  const field = (isFocused: boolean) =>
    cn(
      "w-[560px] h-[60px] rounded-2xl px-5 text-[19px] text-white bg-black/70 outline-none border-2",
      isFocused ? "border-accent" : "border-white/15",
    );

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Poster collage background */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${COLLAGE_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${COLLAGE_ROWS}, 1fr)`,
        }}
        aria-hidden="true"
      >
        {posters.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover opacity-70"
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-12">
        <img
          src={logo}
          alt="Max Ovizija"
          className="h-[132px] w-auto rounded-3xl"
          loading="eager"
        />

        {mode === "landing" ? (
          <>
            <h1 className="mt-4 text-[33px] font-extrabold text-white text-center whitespace-pre-line leading-tight">
              {s.tagline}
            </h1>
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                ref={(el) => (itemRefs.current[0] = el)}
                onClick={() => setMode("signup")}
                onFocus={() => setFocused(0)}
                className={pill(focused === 0, "muted")}
              >
                {s.signUp}
              </button>
              <button
                ref={(el) => (itemRefs.current[1] = el)}
                onClick={() => setMode("signin")}
                onFocus={() => setFocused(1)}
                className={pill(focused === 1, "solid")}
              >
                {s.signIn}
              </button>
              <button
                ref={(el) => (itemRefs.current[2] = el)}
                onClick={() => navigate("/")}
                onFocus={() => setFocused(2)}
                className={cn(
                  "h-[48px] px-6 rounded-full text-[17px] font-semibold outline-none border-2",
                  focused === 2
                    ? "border-white text-white bg-white/10"
                    : "border-transparent text-white/60",
                )}
              >
                {s.continueGuest}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-[27px] font-extrabold text-white">
              {mode === "signup" ? s.signUp : s.signIn}
            </h1>
            <div className="mt-5 flex flex-col items-center gap-3">
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
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
                className={pill(focused === 2, "solid")}
              >
                {busy ? s.loading : mode === "signup" ? s.createAccount : s.login}
              </button>
              <button
                ref={(el) => (itemRefs.current[3] = el)}
                onClick={google}
                onFocus={() => setFocused(3)}
                className={pill(focused === 3, "muted")}
              >
                {s.google}
              </button>
              <button
                ref={(el) => (itemRefs.current[4] = el)}
                onClick={() => setMode("landing")}
                onFocus={() => setFocused(4)}
                className={cn(
                  "h-[44px] px-6 rounded-full text-[17px] font-semibold outline-none border-2",
                  focused === 4
                    ? "border-white text-white bg-white/10"
                    : "border-transparent text-white/60",
                )}
              >
                {s.back}
              </button>
            </div>
            {(error || message) && (
              <p
                className={cn(
                  "mt-3 text-[17px] max-w-[560px] text-center",
                  error ? "text-destructive" : "text-white/80",
                )}
              >
                {error ?? message}
              </p>
            )}
          </>
        )}

        <p className="absolute bottom-4 text-[15px] text-white/40">{s.hintKeys}</p>
      </div>
    </div>
  );
};

export default Auth;
