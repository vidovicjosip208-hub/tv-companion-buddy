import { Outlet } from "@tanstack/react-router";

const VideotekaLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-900 p-6 text-white">
      <h1 className="text-2xl font-bold">Videoteka</h1>
      <Outlet />
    </div>
  );
};

export default VideotekaLayout;
