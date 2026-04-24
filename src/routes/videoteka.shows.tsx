import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/videoteka/shows")({
  component: VideotekaShows,
});

function VideotekaShows() {
  return <div className="p-6 text-white">Serije</div>;
}
