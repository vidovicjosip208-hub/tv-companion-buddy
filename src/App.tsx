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
import RequireLogin from "./components/RequireLogin.tsx";
import DebugOverlay from "./components/DebugOverlay.tsx";

const Index = lazy(() => import("./pages/Index.tsx"));
const Videoteka = lazy(() => import("./pages/Videoteka.tsx"));
const VideotekaShows = lazy(() => import("./pages/VideotekaShows.tsx"));
const VideotekaMovies = lazy(() => import("./pages/VideotekaMovies.tsx"));
const VideotekaMyList = lazy(() => import("./pages/VideotekaMyList.tsx"));
const VideotekaSearchPage = lazy(() => import("./pages/VideotekaSearchPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Player = lazy(() => import("./pages/Player.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Profiles = lazy(() => import("./pages/Profiles.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <div className="dark">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <FullscreenBootstrap />
        <BrowserRouter>
          <RemoteBackKey />
          <DebugOverlay />
          <ScaleToFit>
            {/*
              ExitAppDialog je premješten UNUTAR ScaleToFit (prije je bio izvan, kao brat
              elementa <BrowserRouter>/<ScaleToFit> na istoj razini). ScaleToFit je taj koji
              cijeloj aplikaciji daje dosljedno skaliranje između različitih ekrana (laptop,
              TV...) - dok je dialog bio izvan njega, renderirao se mimo tog skaliranja i
              oslanjao se na sirovu veličinu preglednika umjesto na isti scale-faktor kao
              ostatak app-a, pa je ispadao neusklađen (drugačiji % širine ekrana) na TV-u
              u odnosu na laptop.
            */}
            <ExitAppDialog />
            <SplashGate />
            <Suspense fallback={null}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <RequireLogin>
                      <Index />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/videoteka"
                  element={
                    <RequireLogin>
                      <Videoteka />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/videoteka/shows"
                  element={
                    <RequireLogin>
                      <VideotekaShows />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/videoteka/movies"
                  element={
                    <RequireLogin>
                      <VideotekaMovies />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/videoteka/my-list"
                  element={
                    <RequireLogin>
                      <VideotekaMyList />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/videoteka/search"
                  element={
                    <RequireLogin>
                      <VideotekaSearchPage />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/player"
                  element={
                    <RequireLogin>
                      <Player />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RequireLogin>
                      <Settings />
                    </RequireLogin>
                  }
                />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profiles" element={<Profiles />} />
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
