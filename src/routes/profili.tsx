import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ProfileSelection from "@/components/ProfileSelection";

export const Route = createFileRoute("/profili")({
  head: () => ({
    meta: [
      { title: "Profili — LovableTV" },
      { name: "description", content: "Izaberi svoj profil." },
    ],
  }),
  component: ProfilesPage,
});

function ProfilesPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-900">
      <ProfileSelection onSelect={() => navigate({ to: "/" })} />
    </div>
  );
}
