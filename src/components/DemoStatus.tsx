"use client";

import { useEffect, useState } from "react";

export function DemoStatus() {
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void fetch("/api/status", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("Status aplikacije nije dostupan.");
          const body = await response.json() as { demo: boolean };
          if (active) setDemo(body.demo);
        })
        .catch((error: unknown) => console.error("Provjera demo režima nije uspjela:", error));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  if (!demo) return null;
  return (
    <aside
      className="offline-bar"
      style={{ position: "fixed", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 60, maxWidth: "92vw", whiteSpace: "nowrap" }}
      title="Podaci se čuvaju lokalno na ovom serveru i ne sinhronizuju se s drugim uređajima."
    >
      <span className="dot" />
      Probni način rada
    </aside>
  );
}
