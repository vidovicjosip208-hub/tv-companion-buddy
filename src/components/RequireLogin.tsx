import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { hasEntered, isSignedIn } from "@/lib/entry";

/**
 * Zaštićene stranice se prikazuju isključivo nakon završenog logina u ovoj
 * sesiji. Provjera je sinkrona (bez čekanja na Supabase), tako da početna
 * stranica nikada ne "bljesne" prije login ekrana — ni na TV pretraživaču.
 */
const RequireLogin = ({ children }: { children: ReactNode }) => {
  if (!hasEntered()) return <Navigate to={isSignedIn() ? "/profiles" : "/auth"} replace />;
  return <>{children}</>;
};

export default RequireLogin;
