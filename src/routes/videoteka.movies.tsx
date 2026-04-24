import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/videoteka/movies")({
  component: VideotekaMovies,
});

function VideotekaMovies() {
  return <div className="p-6 text-white">Filmovi</div>;
}
