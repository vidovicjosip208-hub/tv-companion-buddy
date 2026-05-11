import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Videoteka from "./pages/Videoteka.tsx";
import VideotekaShows from "./pages/VideotekaShows.tsx";
import VideotekaMovies from "./pages/VideotekaMovies.tsx";
import NotFound from "./pages/NotFound.tsx";
import Settings from "./pages/Settings.tsx";
import Player from "./pages/Player.tsx";
import ScaleToFit from "./components/ScaleToFit";

const queryClient = new QueryClient();

const App = () => (
  <div className="dark">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScaleToFit>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/videoteka" element={<Videoteka />} />
            <Route path="/videoteka/shows" element={<VideotekaShows />} />
            <Route path="/videoteka/movies" element={<VideotekaMovies />} />
            <Route path="/player" element={<Player />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ScaleToFit>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </div>
);

export default App;
