import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const SplashIntro = lazy(() => import("./SplashIntro.tsx"));

/**
 * Mounts the intro/loading screen only while it is actually needed.
 *
 * Once it finishes (or as soon as a player route is entered) the whole
 * component tree — videos, canvases and intervals included — is removed from
 * the DOM instead of being hidden, so no CPU/GPU work competes with playback
 * on weak Smart TV hardware.
 */
const SplashGate = () => {
  const location = useLocation();
  const [done, setDone] = useState(false);
  const onPlayerRoute = location.pathname.startsWith("/player");

  useEffect(() => {
    if (onPlayerRoute) setDone(true);
  }, [onPlayerRoute]);

  if (done || onPlayerRoute) return null;

  return (
    <Suspense fallback={null}>
      <SplashIntro onFinished={() => setDone(true)} />
    </Suspense>
  );
};

export default SplashGate;
