import { useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import ProfileSelection from "@/components/ProfileSelection";
import StarryBackground from "@/components/StarryBackground";
import { supabase } from "@/integrations/supabase/client";
import { isSignedIn, markEntered, signOut } from "@/lib/entry";

/**
 * Odabir profila nakon prijave. Vidljiva je samo prijavljenom korisniku;
 * odabir profila otvara aplikaciju, logout vraća na login ekran.
 */
const Profiles = () => {
  const navigate = useNavigate();

  const handleSelect = useCallback(() => {
    markEntered();
    navigate("/", { replace: true });
  }, [navigate]);

  const handleLogout = useCallback(() => {
    // Očisti lokalnu sesiju i preusmjeri odmah — TV uređaji ne smiju čekati
    // na mrežni poziv supabase.auth.signOut() koji može visjeti.
    signOut();
    navigate("/auth", { replace: true });
    // Supabase odjava u pozadini (best-effort).
    void supabase.auth.signOut().catch(() => {
      // ignore — lokalni signOut je već očistio sve zastavice i tokene
    });
  }, [navigate]);

  if (!isSignedIn()) return <Navigate to="/auth" replace />;

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-background">
      <StarryBackground />
      <ProfileSelection onBack={handleSelect} onSelect={handleSelect} onLogout={handleLogout} />
    </div>
  );
};

export default Profiles;
