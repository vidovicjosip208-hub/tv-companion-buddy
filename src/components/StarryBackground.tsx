"use client";

export function LivingBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }} aria-hidden="true">
      <div
        className="absolute inset-0 animate-living-bg"
        style={{
          backgroundImage:
            "url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_20260309_005921_Gallery-XbpMO8eYXcMYt2niUMBlGe3Ib6BsIl.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}
