import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import FullscreenBootstrap from "./components/FullscreenBootstrap.tsx";
import RemoteBackKey from "./components/RemoteBackKey.tsx";
import ExitAppDialog from "./components/ExitAppDialog.tsx";
import ScaleToFit from "./components/ScaleToFit.tsx";
import SplashGate from "./components/SplashGate.tsx";

const Index = lazy(() => import("./pages/Index.tsx"));
const Videoteka = lazy(() => import("./pages/Videoteka.tsx"));
const VideotekaShows = lazy(() => import("./pages/VideotekaShows.tsx"));
const VideotekaMovies = lazy(() => import("./pages/VideotekaMovies.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Player = lazy(() => import("./pages/Player.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <div className="dark">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <FullscreenBootstrap />
        <RemoteBackKey />
        <BrowserRouter>
          <ExitAppDialog />
          <ScaleToFit>
            <SplashGate />
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/videoteka" element={<Videoteka />} />
                <Route path="/videoteka/shows" element={<VideotekaShows />} />
                <Route path="/videoteka/movies" element={<VideotekaMovies />} />
                <Route path="/player" element={<Player />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ScaleToFit>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </div>
);

export default App;
