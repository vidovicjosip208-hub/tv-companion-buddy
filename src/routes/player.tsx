import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/player")({
  component: PlayerPage,
});

function PlayerPage() {
  return <div className="min-h-screen bg-black p-6 text-white">Player</div>;
}
