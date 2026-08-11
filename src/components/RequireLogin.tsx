import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { hasEntered, markEntered } from "@/lib/entry";

/**
 * Sprječava da se zaštićene stranice (npr. početna) prikažu prije završenog
 * logina. Dok se provjerava sesija ne renderira se ništa, tako da ekran
 * nikada kratko ne "bljesne" početnom stranicom.
 */
const RequireLogin = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<"checking" | "allowed" | "denied">(
    hasEntered() ? "allowed" : "checking",
  );

  useEffect(() => {
    if (state === "allowed") return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) {
        markEntered();
        setState("allowed");
      } else {
        setState("denied");
      }
    });
    return () => {
      alive = false;
    };
  }, [state]);

  if (state === "checking") return null;
  if (state === "denied") return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export default RequireLogin;
